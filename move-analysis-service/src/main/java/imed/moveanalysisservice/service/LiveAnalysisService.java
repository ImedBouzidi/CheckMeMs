package imed.moveanalysisservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.config.LiveAnalysisConfig;
import imed.moveanalysisservice.dto.request.FinalizeLiveAnalysisRequest;
import imed.moveanalysisservice.dto.request.LiveMoveAnalysisRequest;
import imed.moveanalysisservice.config.LiveAnalysisProperties;
import imed.moveanalysisservice.exception.AnalysisNotFoundException;
import imed.moveanalysisservice.exception.ForbiddenException;
import imed.moveanalysisservice.model.AnalysisJobType;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.model.MoveAnalysisStatus;
import imed.moveanalysisservice.repository.GameAnalysisRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class LiveAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(LiveAnalysisService.class);
    private static final String PROFILE = "STANDARD";
    private static final int FINALIZE_PRIORITY = 5;

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final GameAnalysisRepository gameAnalysisRepository;
    private final MoveAnalysisRepository moveAnalysisRepository;
    private final AnalysisQueue analysisQueue;
    private final EvalCache evalCache;
    private final AnalysisRunner analysisRunner;
    private final LiveAnalysisProperties properties;
    private final TransactionTemplate tx;

    public LiveAnalysisService(KafkaTemplate<String, String> kafkaTemplate,
                               ObjectMapper objectMapper,
                               GameAnalysisRepository gameAnalysisRepository,
                               MoveAnalysisRepository moveAnalysisRepository,
                               AnalysisQueue analysisQueue,
                               EvalCache evalCache,
                               AnalysisRunner analysisRunner,
                               LiveAnalysisProperties properties,
                               PlatformTransactionManager transactionManager) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.gameAnalysisRepository = gameAnalysisRepository;
        this.moveAnalysisRepository = moveAnalysisRepository;
        this.analysisQueue = analysisQueue;
        this.evalCache = evalCache;
        this.analysisRunner = analysisRunner;
        this.properties = properties;
        this.tx = new TransactionTemplate(transactionManager);
    }

    @Transactional
    public void publish(LiveMoveAnalysisRequest request) {
        ensureAnalysis(request);
        try {
            kafkaTemplate.send(
                    LiveAnalysisConfig.TOPIC,
                    request.gameId().toString(),
                    objectMapper.writeValueAsString(request))
                    .whenComplete((result, error) -> {
                        if (error != null) {
                            log.warn("Could not publish live analysis for game {}: {}",
                                    request.gameId(), error.getMessage());
                        }
                    });
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Could not publish live analysis request", exception);
        } catch (KafkaException exception) {
            log.warn("Kafka is unavailable; live analysis request was not queued: {}",
                    exception.getMessage());
        }
    }

    @Transactional
    public GameAnalysis loadOrCreate(LiveMoveAnalysisRequest request) {
        return gameAnalysisRepository
                .findByGameIdAndProfile(request.gameId(), PROFILE)
                .orElseGet(() -> createAnalysis(request));
    }

    /**
     * Close a live review. Fencing the stream holds a database transaction only briefly; the tail
     * of the topic then gets a bounded window to settle, and afterwards the stored rows — never a
     * depth-18 re-run — are summarised. Rows are only searched once, so a finalize that arrives
     * before the tail leaves the aggregate PROCESSING and the consumer completes it later.
     */
    public GameAnalysis finaliseGame(UUID gameId, FinalizeLiveAnalysisRequest request, String requester) {
        GameAnalysis finalized = Objects.requireNonNull(
                tx.execute(status -> close(gameId, request, requester)),
                "finalize close step returned no analysis");

        int stored = awaitSettlement(finalized.getId(), nvl(finalized.getExpectedPlies()));
        if (stored == 0 && finalized.getPgn() != null && !finalized.getPgn().isBlank()) {
            // Nothing was stored at all (Kafka and its consumer were down the whole game), so the
            // batch replay is the only way to a review. There are no streamed rows to delete or
            // re-run, and the engine keeps the review from staying open forever.
            return Objects.requireNonNull(tx.execute(status -> replayPgnBatch(finalized.getId(), finalized.getPgn())),
                    "finalize replay step returned no analysis");
        }
        GameAnalysis settled = tx.execute(status -> summarise(finalized.getId()));
        return Objects.requireNonNull(settled, "finalize settle step returned no analysis");
    }

    /** Stamp the finalization before the wait so streamed plies settle against a fenced stream. */
    private GameAnalysis close(UUID gameId, FinalizeLiveAnalysisRequest request, String requester) {
        GameAnalysis analysis = gameAnalysisRepository
                .findByGameIdAndProfile(gameId, PROFILE)
                .orElseThrow(() -> new AnalysisNotFoundException("No live analysis for game: " + gameId));
        if (requester == null || requester.isBlank()) {
            throw new ForbiddenException("An authenticated caller is required");
        }
        if (!requester.equals(analysis.getRequestedBy())) {
            throw new ForbiddenException("Not authorized to finalize this analysis");
        }

        String pgn = request.pgn() == null ? "" : request.pgn().trim();
        if (!pgn.isEmpty()) {
            analysis.setPgn(pgn);
        }
        analysis.setExpectedPlies(Math.max(Math.max(nvl(analysis.getExpectedPlies()),
                nvl(request.expectedPlies())), streamed(analysis.getId())));
        analysis.setFinalizedAt(OffsetDateTime.now());
        return gameAnalysisRepository.save(analysis);
    }

    /** Poll the stored-row count outside any transaction, so the tail keeps committing meanwhile. */
    private int awaitSettlement(UUID analysisId, int expectedPlies) {
        int stored = streamed(analysisId);
        long deadline = System.currentTimeMillis() + Math.max(0, properties.getFinalizeWaitMs());
        long pollMs = Math.max(1, properties.getFinalizePollMs());
        while (stored < expectedPlies && System.currentTimeMillis() < deadline) {
            try {
                Thread.sleep(pollMs);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                break;
            }
            stored = streamed(analysisId);
        }
        return stored;
    }

    /** Complete the closed review from the rows that are already stored — delete and re-run nothing. */
    private GameAnalysis summarise(UUID analysisId) {
        GameAnalysis analysis = gameAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> new AnalysisNotFoundException("No live analysis for game: " + analysisId));
        analysis.setCompletedPlies(Math.max(nvl(analysis.getCompletedPlies()), streamed(analysisId)));
        completeIfSettled(analysis);
        return gameAnalysisRepository.save(analysis);
    }

    /** Last-resort escape hatch for a game whose stream produced nothing; no rows get deleted. */
    private GameAnalysis replayPgnBatch(UUID analysisId, String pgn) {
        GameAnalysis analysis = gameAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> new AnalysisNotFoundException("No live analysis for game: " + analysisId));
        analysis.setPgn(pgn);
        analysis.setStatus(AnalysisStatus.PENDING);
        analysis.setCompletedPlies(0);
        analysis.setExpectedPlies(0);
        analysis = gameAnalysisRepository.save(analysis);
        analysisQueue.enqueue(analysisId, AnalysisJobType.GAME, FINALIZE_PRIORITY, "{}");
        return analysis;
    }

    private int streamed(UUID analysisId) {
        return (int) moveAnalysisRepository.countByGameAnalysisId(analysisId);
    }

    /** Complete the aggregate when the game is finalized and the streamed plies are all in. */
    private void completeIfSettled(GameAnalysis analysis) {
        if (analysis.getFinalizedAt() == null || analysis.getStatus().isTerminal()) {
            return;
        }
        if (nvl(analysis.getCompletedPlies()) >= nvl(analysis.getExpectedPlies())) {
            analysisRunner.completeFromStoredMoves(analysis);
        }
    }

    @Transactional
    public void persistCompletedPly(GameAnalysis analysis, LiveMoveAnalysisRequest request, MoveAnalysis row) {
        MoveAnalysis stored = upsert(analysis, request, row);
        stored.setStatus(MoveAnalysisStatus.COMPLETED);
        stored.setError(null);
        moveAnalysisRepository.save(stored);
        if (analysis.getStatus() != AnalysisStatus.COMPLETED) {
            analysis.setStatus(AnalysisStatus.PROCESSING);
        }
        analysis.setExpectedPlies(Math.max(nvl(analysis.getExpectedPlies()), request.ply()));
        analysis.setCompletedPlies(Math.max(nvl(analysis.getCompletedPlies()), request.ply()));
        analysis.setRequestedBy(request.requester());
        analysis.setEngineVersion(stored.getEngineVersion());
        gameAnalysisRepository.save(analysis);
        evalCache.recordLiveProgress(request.gameId(), request.ply());
        completeIfSettled(analysis);
    }

    @Transactional
    public void persistFailedPly(GameAnalysis analysis, LiveMoveAnalysisRequest request, Exception exception) {
        MoveAnalysis row = moveAnalysisRepository
                .findByGameAnalysisIdAndPly(analysis.getId(), request.ply())
                .orElseGet(MoveAnalysis::new);
        row.setGameAnalysisId(analysis.getId());
        row.setGameId(request.gameId());
        row.setPly(request.ply());
        row.setMoveNumber(request.moveNumber());
        row.setColor(request.color());
        row.setSan(request.san());
        row.setUci(request.uci());
        row.setFenBefore(request.fenBefore());
        row.setFenAfter(request.fenAfter());
        row.setIsPreliminary(Boolean.TRUE);
        row.setStatus(MoveAnalysisStatus.FAILED);
        row.setError(truncate(exception.getMessage()));
        row.setConfigVersion(analysis.getConfigVersion());
        moveAnalysisRepository.save(row);
        if (analysis.getStatus() != AnalysisStatus.COMPLETED) {
            analysis.setStatus(AnalysisStatus.PROCESSING);
        }
        // A failed ply is still a settled ply; leaving it out of the counter would keep the
        // review open forever after a single engine error.
        analysis.setExpectedPlies(Math.max(nvl(analysis.getExpectedPlies()), request.ply()));
        analysis.setCompletedPlies(Math.max(nvl(analysis.getCompletedPlies()), request.ply()));
        analysis.setRequestedBy(request.requester());
        analysis.setLastError(truncate(exception.getMessage()));
        gameAnalysisRepository.save(analysis);
        evalCache.recordLiveProgress(request.gameId(), request.ply());
        completeIfSettled(analysis);
    }

    private void ensureAnalysis(LiveMoveAnalysisRequest request) {
        if (gameAnalysisRepository.findByGameIdAndProfile(request.gameId(), PROFILE).isPresent()) {
            return;
        }

        GameAnalysis analysis = new GameAnalysis();
        analysis.setGameId(request.gameId());
        analysis.setProfile(PROFILE);
        analysis.setStatus(AnalysisStatus.PROCESSING);
        analysis.setPgn("");
        analysis.setFen(null);
        analysis.setExpectedPlies(request.ply());
        analysis.setCompletedPlies(0);
        analysis.setRequestedBy(request.requester());
        analysis.setConfigVersion("live");
        gameAnalysisRepository.save(analysis);
    }

    private GameAnalysis createAnalysis(LiveMoveAnalysisRequest request) {
        GameAnalysis analysis = new GameAnalysis();
        analysis.setId(UUID.randomUUID());
        analysis.setGameId(request.gameId());
        analysis.setProfile(PROFILE);
        analysis.setStatus(AnalysisStatus.PROCESSING);
        analysis.setPgn("");
        analysis.setExpectedPlies(request.ply());
        analysis.setCompletedPlies(0);
        analysis.setRequestedBy(request.requester());
        analysis.setConfigVersion("live");
        return gameAnalysisRepository.save(analysis);
    }

    private MoveAnalysis upsert(GameAnalysis analysis, LiveMoveAnalysisRequest request, MoveAnalysis computed) {
        MoveAnalysis existing = moveAnalysisRepository
                .findByGameAnalysisIdAndPly(analysis.getId(), request.ply())
                .orElse(null);
        if (existing == null) {
            return computed;
        }
        existing.setMoveNumber(computed.getMoveNumber());
        existing.setColor(computed.getColor());
        existing.setSan(computed.getSan());
        existing.setUci(computed.getUci());
        existing.setFenBefore(computed.getFenBefore());
        existing.setFenAfter(computed.getFenAfter());
        existing.setEvalBeforeCp(computed.getEvalBeforeCp());
        existing.setEvalAfterCp(computed.getEvalAfterCp());
        existing.setEvalBeforeMate(computed.getEvalBeforeMate());
        existing.setEvalAfterMate(computed.getEvalAfterMate());
        existing.setBestMoveUci(computed.getBestMoveUci());
        existing.setBestMoveSan(computed.getBestMoveSan());
        existing.setBestMoveEvalCp(computed.getBestMoveEvalCp());
        existing.setBestMoveEvalMate(computed.getBestMoveEvalMate());
        existing.setDifferenceCp(computed.getDifferenceCp());
        existing.setCpLoss(computed.getCpLoss());
        existing.setClassification(computed.getClassification());
        existing.setPv(computed.getPv());
        existing.setDepth(computed.getDepth());
        existing.setSeldepth(computed.getSeldepth());
        existing.setMultipv(computed.getMultipv());
        existing.setNodes(computed.getNodes());
        existing.setElapsedMs(computed.getElapsedMs());
        existing.setEngineVersion(computed.getEngineVersion());
        existing.setConfigVersion(computed.getConfigVersion());
        existing.setIsPreliminary(Boolean.TRUE);
        return existing;
    }

    private static int nvl(Integer value) {
        return value == null ? 0 : value;
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= 2_000 ? value : value.substring(0, 2_000);
    }
}
