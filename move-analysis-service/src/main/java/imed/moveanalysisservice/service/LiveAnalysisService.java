package imed.moveanalysisservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.config.LiveAnalysisConfig;
import imed.moveanalysisservice.dto.request.FinalizeLiveAnalysisRequest;
import imed.moveanalysisservice.dto.request.LiveMoveAnalysisRequest;
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
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public LiveAnalysisService(KafkaTemplate<String, String> kafkaTemplate,
                               ObjectMapper objectMapper,
                               GameAnalysisRepository gameAnalysisRepository,
                               MoveAnalysisRepository moveAnalysisRepository,
                               AnalysisQueue analysisQueue,
                               EvalCache evalCache,
                               AnalysisRunner analysisRunner) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.gameAnalysisRepository = gameAnalysisRepository;
        this.moveAnalysisRepository = moveAnalysisRepository;
        this.analysisQueue = analysisQueue;
        this.evalCache = evalCache;
        this.analysisRunner = analysisRunner;
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
     * Close a live review. The job only settles once every streamed ply has been searched, so a
     * finalize that arrives before the tail of the topic leaves the aggregate PROCESSING and the
     * consumer completes it later.
     */
    @Transactional
    public GameAnalysis finaliseGame(UUID gameId, FinalizeLiveAnalysisRequest request, String requester) {
        GameAnalysis analysis = gameAnalysisRepository.findByGameIdAndProfile(gameId, PROFILE)
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
        int streamed = moveAnalysisRepository.findByGameAnalysisIdOrderByPlyAsc(analysis.getId()).size();
        analysis.setExpectedPlies(Math.max(Math.max(nvl(analysis.getExpectedPlies()),
                nvl(request.expectedPlies())), streamed));
        analysis.setFinalizedAt(OffsetDateTime.now());

        if (streamed == 0 && !pgn.isEmpty()) {
            // Nothing reached the engine (Kafka or its consumer was down), so fall back to the
            // batch replay of the PGN instead of leaving an empty review open forever.
            analysis.setStatus(AnalysisStatus.PENDING);
            analysis.setCompletedPlies(0);
            analysis.setExpectedPlies(0);
            analysis = gameAnalysisRepository.save(analysis);
            analysisQueue.enqueue(analysis.getId(), AnalysisJobType.GAME, FINALIZE_PRIORITY, "{}");
            return analysis;
        }

        analysis = gameAnalysisRepository.save(analysis);
        completeIfSettled(analysis);
        return analysis;
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
