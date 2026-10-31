package imed.moveanalysisservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.chess.ChessBoard;
import imed.moveanalysisservice.chess.PgnReplay;
import imed.moveanalysisservice.chess.SanCodec;
import imed.moveanalysisservice.config.StockfishConfig;
import imed.moveanalysisservice.dto.request.LiveMoveAnalysisRequest;
import imed.moveanalysisservice.engine.EngineEvaluation;
import imed.moveanalysisservice.engine.SearchLimits;
import imed.moveanalysisservice.engine.StockfishPool;
import imed.moveanalysisservice.engine.StockfishProcess;
import imed.moveanalysisservice.metrics.AnalysisMetrics;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.model.MoveAnalysisStatus;
import imed.moveanalysisservice.model.MoveClassification;
import imed.moveanalysisservice.repository.GameAnalysisRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

/**
 * Computes one game analysis job: replays the stored PGN, searches each distinct position once,
 * and persists one row per ply as it goes. Rows are saved incrementally so progress is visible and
 * a crash preserves completed work for a retry.
 */
@Component
public class AnalysisRunner {

    private static final Logger log = LoggerFactory.getLogger(AnalysisRunner.class);

    private final GameAnalysisRepository gameAnalysisRepository;
    private final MoveAnalysisRepository moveAnalysisRepository;
    private final StockfishPool stockfishPool;
    private final StockfishConfig stockfishConfig;
    private final ObjectMapper objectMapper;
    private final AnalysisQueue analysisQueue;
    private final AnalysisMetrics analysisMetrics;
    private final EvalCache evalCache;
    private final OpeningBook openingBook;
    private final AtomicReference<UUID> lastLiveGameId = new AtomicReference<>();

    public AnalysisRunner(GameAnalysisRepository gameAnalysisRepository,
                          MoveAnalysisRepository moveAnalysisRepository,
                          StockfishPool stockfishPool,
                          StockfishConfig stockfishConfig,
                          ObjectMapper objectMapper,
                          AnalysisQueue analysisQueue,
                          AnalysisMetrics analysisMetrics,
                          EvalCache evalCache,
                          OpeningBook openingBook) {
        this.gameAnalysisRepository = gameAnalysisRepository;
        this.moveAnalysisRepository = moveAnalysisRepository;
        this.stockfishPool = stockfishPool;
        this.stockfishConfig = stockfishConfig;
        this.objectMapper = objectMapper;
        this.analysisQueue = analysisQueue;
        this.analysisMetrics = analysisMetrics;
        this.evalCache = evalCache;
        this.openingBook = openingBook;
    }

    public void run(AnalysisQueue.ClaimedJob job) {
        if (job == null) {
            return;
        }

        MDC.put("jobId", job.id().toString());
        MDC.put("analysisId", job.gameAnalysisId().toString());
        try {
            GameAnalysis analysis = gameAnalysisRepository.findById(job.gameAnalysisId()).orElse(null);
            if (analysis == null) {
                log.warn("Analysis {} disappeared before the job started", job.gameAnalysisId());
                return;
            }
            MDC.put("gameId", analysis.getGameId() == null ? "-" : analysis.getGameId().toString());
            run(analysis, job);
        } finally {
            MDC.remove("jobId");
            MDC.remove("analysisId");
            MDC.remove("gameId");
        }
    }

    public MoveAnalysis analyzeLiveMove(GameAnalysis analysis, LiveMoveAnalysisRequest request) throws IOException {
        SearchLimits limits = stockfishConfig.quickLimits();
        EngineEvaluation before = evalCache.get(request.fenBefore(), limits);
        EngineEvaluation after = evalCache.get(request.fenAfter(), limits);
        StockfishProcess process = null;
        try {
            if (before == null || after == null) {
                process = stockfishPool.borrow();
                UUID gameId = request.gameId();
                if (!gameId.equals(lastLiveGameId.getAndSet(gameId))) {
                    stockfishPool.newGame(process);
                }
                if (before == null) {
                    before = evaluate(process, request.fenBefore(), limits);
                    evalCache.put(request.fenBefore(), limits, before);
                }
                if (after == null) {
                    after = evaluate(process, request.fenAfter(), limits);
                    evalCache.put(request.fenAfter(), limits, after);
                }
            }
            PgnReplay.Ply ply = new PgnReplay.Ply(
                    request.ply(), request.moveNumber(), request.color(), request.san(), request.uci(),
                    request.fenBefore(), request.fenAfter());
            MoveAnalysis row = buildRow(analysis, ply, before, after);
            row.setIsPreliminary(Boolean.TRUE);
            return row;
        } finally {
            if (process != null) {
                stockfishPool.release(process);
            }
        }
    }

    public void completeFromStoredMoves(GameAnalysis analysis) {
        List<MoveAnalysis> rows = moveAnalysisRepository.findByGameAnalysisIdOrderByPlyAsc(analysis.getId());
        openingBook.apply(rows);
        List<String> sans = rows.stream().map(MoveAnalysis::getSan).toList();
        openingBook.nameOf(sans).ifPresent(named -> {
            analysis.setOpeningEco(named.eco());
            analysis.setOpeningName(named.name());
        });
        for (MoveAnalysis row : rows) {
            row.setIsPreliminary(Boolean.FALSE);
        }
        moveAnalysisRepository.saveAll(rows);
        analysis.setStatus(AnalysisStatus.COMPLETED);
        analysis.setCompletedPlies(rows.size());
        if (analysis.getExpectedPlies() == null || analysis.getExpectedPlies() < rows.size()) {
            analysis.setExpectedPlies(rows.size());
        }
        analysis.setCompletedAt(OffsetDateTime.now());
        analysis.setSummary(summarise(rows));
        analysis.setLastError(null);
        if (!rows.isEmpty()) {
            analysis.setEngineVersion(rows.get(0).getEngineVersion());
            analysis.setEngineName(analysis.getEngineName() == null ? "Stockfish" : analysis.getEngineName());
        }
        gameAnalysisRepository.save(analysis);
    }

    private void run(GameAnalysis analysis, AnalysisQueue.ClaimedJob job) {
        if (analysis.getStatus() == AnalysisStatus.COMPLETED) {
            log.info("Analysis {} is already complete; skipping", analysis.getId());
            return;
        }

        List<MoveAnalysis> stored = new ArrayList<>();
        StockfishProcess process = null;
        try {
            moveAnalysisRepository.deleteByGameAnalysisId(analysis.getId());
            analysis.setStatus(AnalysisStatus.PROCESSING);
            analysis.setLastError(null);
            analysis.setCompletedPlies(0);
            analysis.setCompletedAt(null);
            analysis = gameAnalysisRepository.save(analysis);

            List<PgnReplay.Ply> plies = PgnReplay.replay(analysis.getPgn() == null ? "" : analysis.getPgn());
            analysis.setExpectedPlies(plies.size());
            analysis.setConfigVersion(configVersion());
            analysis.setAnalysisConfig(analysisConfigJson());
            analysis = gameAnalysisRepository.save(analysis);

            List<String> played = new ArrayList<>();
            if (plies.isEmpty()) {
                MoveAnalysis row = analysePosition(analysis);
                stored.add(row);
                analysis.setCompletedPlies(1);
                analysis.setExpectedPlies(1);
            } else {
                process = stockfishPool.borrow();
                stockfishPool.newGame(process);
                for (PgnReplay.Ply ply : plies) {
                    // Each position is searched at most once: the next ply's "before" position is
                    // this ply's "after", and cached hits also cover retries and other replicas.
                    EngineEvaluation before = evaluateCached(process, ply.fenBefore());
                    EngineEvaluation after = evaluateCached(process, ply.fenAfter());
                    MoveAnalysis row = buildRow(analysis, ply, before, after);
                    played.add(ply.san());
                    if (openingBook.isBook(played, played.size() - 1)
                            && (row.getClassification() == null
                            || row.getClassification() == MoveClassification.GOOD)) {
                        row.setClassification(MoveClassification.BOOK);
                    }
                    stored.add(moveAnalysisRepository.save(row));
                    analysis.setCompletedPlies(stored.size());
                    analysis.setEngineName(before.engineName());
                    analysis.setEngineVersion(before.engineVersion());
                    analysis = gameAnalysisRepository.save(analysis);
                    if (stored.size() % 5 == 0) {
                        if (!analysisQueue.renewLease(job.id(), job.claimedBy())) {
                            log.warn("Lost the lease for job {}; another worker took over", job.id());
                        }
                    }
                }
            }

            OpeningBook.Named named = openingBook.nameOf(played).orElse(null);
            if (named != null) {
                analysis.setOpeningEco(named.eco());
                analysis.setOpeningName(named.name());
            }
            analysis.setStatus(AnalysisStatus.COMPLETED);
            analysis.setCompletedPlies(stored.size());
            analysis.setExpectedPlies(stored.size());
            analysis.setCompletedAt(OffsetDateTime.now());
            analysis.setSummary(summarise(stored));
            analysis.setLastError(null);
            gameAnalysisRepository.save(analysis);
            log.info("Analysis {} finished: {} moves, {}", analysis.getId(), stored.size(), configVersion());
        } catch (Exception exception) {
            log.error("Analysis failed for {}", analysis.getId(), exception);
            if (!stored.isEmpty()) {
                analysis.setStatus(AnalysisStatus.PARTIAL);
                analysis.setCompletedPlies(stored.size());
            } else {
                analysis.setStatus(AnalysisStatus.FAILED);
            }
            analysis.setLastError(truncate(exception.getMessage()));
            analysis.setSummary(summarise(stored));
            gameAnalysisRepository.save(analysis);
            throw exception instanceof RuntimeException runtime
                    ? runtime
                    : new IllegalStateException("Analysis failed: " + exception.getMessage(), exception);
        } finally {
            if (process != null) {
                stockfishPool.release(process);
            }
        }
    }

    private EngineEvaluation evaluate(StockfishProcess process, String fen) {
        return evaluate(process, fen, stockfishConfig.gameLimits());
    }

    /** Cache lookup around one {@link #evaluate} call, so engine results are reused per FEN and limits. */
    private EngineEvaluation evaluateCached(StockfishProcess process, String fen) {
        SearchLimits limits = stockfishConfig.gameLimits();
        EngineEvaluation cached = evalCache.get(fen, limits);
        if (cached != null) {
            return cached;
        }
        EngineEvaluation evaluated = evaluate(process, fen);
        evalCache.put(fen, limits, evaluated);
        return evaluated;
    }

    private EngineEvaluation evaluate(StockfishProcess process, String fen, SearchLimits limits) {
        try {
            EngineEvaluation evaluation = process.search(fen, limits);
            analysisMetrics.recordSearch(evaluation.elapsedMs(), "ok");
            return evaluation;
        } catch (IOException exception) {
            analysisMetrics.recordSearch(0, "error");
            throw new IllegalStateException("Engine failed on " + fen + ": " + exception.getMessage(), exception);
        }
    }

    private MoveAnalysis buildRow(GameAnalysis analysis, PgnReplay.Ply ply,
                                  EngineEvaluation before, EngineEvaluation after) {
        boolean moverIsWhite = "white".equals(ply.color());
        MoveGrader.Grade grade = MoveGrader.grade(moverIsWhite, before, after);
        ChessBoard board = ChessBoard.fromFen(ply.fenBefore());
        String bestMoveSan = toSan(board, before.bestMove());

        MoveAnalysis row = new MoveAnalysis();
        row.setGameAnalysisId(analysis.getId());
        row.setGameId(analysis.getGameId());
        row.setPly(ply.ply());
        row.setMoveNumber(ply.moveNumber());
        row.setColor(ply.color());
        row.setSan(ply.san());
        row.setUci(ply.uci());
        row.setFenBefore(ply.fenBefore());
        row.setFenAfter(ply.fenAfter());
        row.setEvalBeforeCp(grade.evalBeforeCp());
        row.setEvalBeforeMate(grade.evalBeforeMate());
        row.setEvalAfterCp(grade.evalAfterCp());
        row.setEvalAfterMate(grade.evalAfterMate());
        row.setBestMoveUci(before.bestMove());
        row.setBestMoveSan(bestMoveSan);
        row.setBestMoveEvalCp(grade.evalBeforeCp());
        row.setBestMoveEvalMate(grade.evalBeforeMate());
        row.setDifferenceCp(grade.differenceCp());
        row.setCpLoss(grade.cpLoss());
        row.setClassification(grade.classification());
        row.setPv(before.pv());
        row.setDepth(before.depth());
        row.setSeldepth(before.seldepth());
        row.setMultipv(before.multipv());
        row.setNodes(before.nodes());
        row.setElapsedMs(before.elapsedMs());
        row.setEngineVersion(before.engineVersion());
        row.setConfigVersion(analysis.getConfigVersion());
        row.setIsPreliminary(Boolean.FALSE);
        row.setStatus(MoveAnalysisStatus.COMPLETED);
        return row;
    }

    /** A request without move text is a single position, so the best move doubles as the played move. */
    private MoveAnalysis analysePosition(GameAnalysis analysis) throws IOException {
        String fen = analysis.getFen() != null && !analysis.getFen().isBlank()
                ? analysis.getFen()
                : PgnReplay.startFen(analysis.getPgn() == null ? "" : analysis.getPgn());
        ChessBoard board = ChessBoard.fromFen(fen);
        boolean whiteToMove = board.whiteToMove();

        StockfishProcess process = null;
        SearchLimits limits = stockfishConfig.gameLimits();
        EngineEvaluation score = evalCache.get(fen, limits);
        try {
            if (score == null) {
                process = stockfishPool.borrow();
                stockfishPool.newGame(process);
                score = evaluate(process, fen);
                evalCache.put(fen, limits, score);
            }
        } finally {
            if (process != null) {
                stockfishPool.release(process);
            }
        }

        String bestMoveSan = toSan(board, score.bestMove());
        analysis.setEngineName(score.engineName());
        analysis.setEngineVersion(score.engineVersion());
        MoveAnalysis row = new MoveAnalysis();
        row.setGameAnalysisId(analysis.getId());
        row.setGameId(analysis.getGameId());
        row.setPly(0);
        row.setMoveNumber(board.fullmoveNumber());
        row.setColor(whiteToMove ? "white" : "black");
        row.setSan(bestMoveSan == null ? "-" : bestMoveSan);
        row.setUci(score.bestMove());
        row.setFenBefore(fen);
        row.setFenAfter(fen);
        row.setEvalBeforeCp(MoveGrader.whiteCp(score, whiteToMove));
        row.setEvalBeforeMate(MoveGrader.whiteMate(score, whiteToMove));
        row.setEvalAfterCp(row.getEvalBeforeCp());
        row.setEvalAfterMate(row.getEvalBeforeMate());
        row.setBestMoveUci(score.bestMove());
        row.setBestMoveSan(bestMoveSan);
        row.setBestMoveEvalCp(row.getEvalBeforeCp());
        row.setBestMoveEvalMate(row.getEvalBeforeMate());
        row.setDifferenceCp(0);
        row.setCpLoss(0);
        row.setClassification(MoveClassification.GOOD);
        row.setPv(score.pv());
        row.setDepth(score.depth());
        row.setSeldepth(score.seldepth());
        row.setMultipv(score.multipv());
        row.setNodes(score.nodes());
        row.setElapsedMs(score.elapsedMs());
        row.setEngineVersion(score.engineVersion());
        row.setConfigVersion(analysis.getConfigVersion());
        row.setIsPreliminary(Boolean.FALSE);
        row.setStatus(MoveAnalysisStatus.COMPLETED);
        return moveAnalysisRepository.save(row);
    }

    private String toSan(ChessBoard board, String uci) {
        ChessBoard.Move move = SanCodec.fromUci(board, uci);
        return move == null ? null : SanCodec.toSan(board, move);
    }

    private String configVersion() {
        return "depth-" + stockfishConfig.getDepth() + "-multipv-" + stockfishConfig.getMultiPv();
    }

    private String analysisConfigJson() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("depth", stockfishConfig.getDepth());
        config.put("multiPv", stockfishConfig.getMultiPv());
        config.put("threads", stockfishConfig.getThreads());
        config.put("hash", stockfishConfig.getHash());
        try {
            return objectMapper.writeValueAsString(config);
        } catch (Exception exception) {
            return null;
        }
    }

    private String summarise(List<MoveAnalysis> rows) {
        Map<String, Object> summary = new LinkedHashMap<>();
        Map<String, Integer> classifications = new LinkedHashMap<>();
        for (MoveClassification value : MoveClassification.values()) {
            classifications.put(value.name(), 0);
        }
        Map<String, long[]> perColor = new LinkedHashMap<>();
        perColor.put("white", new long[2]);
        perColor.put("black", new long[2]);
        long totalLoss = 0;
        for (MoveAnalysis row : rows) {
            if (row.getClassification() != null) {
                classifications.compute(row.getClassification().name(), (key, count) -> count + 1);
            }
            long[] colour = perColor.get(row.getColor());
            if (colour != null) {
                colour[0]++;
                long loss = row.getCpLoss() == null ? 0 : Math.min(row.getCpLoss(), 1_000);
                colour[1] += loss;
                totalLoss += loss;
            }
        }
        summary.put("moves", rows.size());
        summary.put("depth", stockfishConfig.getDepth());
        summary.put("classifications", classifications);
        summary.put("averageCpLoss", rows.isEmpty() ? 0.0 : (double) totalLoss / rows.size());
        Map<String, Object> players = new LinkedHashMap<>();
        perColor.forEach((colour, counts) -> {
            Map<String, Object> player = new LinkedHashMap<>();
            player.put("moves", counts[0]);
            player.put("totalCpLoss", counts[1]);
            player.put("averageCpLoss", counts[0] == 0 ? 0.0 : (double) counts[1] / counts[0]);
            players.put(colour, player);
        });
        summary.put("players", players);
        try {
            return objectMapper.writeValueAsString(summary);
        } catch (Exception exception) {
            log.warn("Could not serialise the summary of {} moves", rows.size(), exception);
            return null;
        }
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= 2_000 ? value : value.substring(0, 2_000);
    }
}
