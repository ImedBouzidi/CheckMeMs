package imed.moveanalysisservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.chess.ChessBoard;
import imed.moveanalysisservice.chess.PgnReplay;
import imed.moveanalysisservice.chess.SanCodec;
import imed.moveanalysisservice.config.StockfishConfig;
import imed.moveanalysisservice.engine.StockfishEngine;
import imed.moveanalysisservice.engine.StockfishEngine.EngineScore;
import imed.moveanalysisservice.model.AnalysisRequest;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.model.MoveClassification;
import imed.moveanalysisservice.repository.AnalysisRequestRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Runs one analysis job off the request thread: replays the PGN, asks the engine about every
 * distinct position once and stores a row per ply. Each row is saved immediately so a long game
 * stays observable through the polling endpoint instead of appearing only at the end.
 */
@Component
public class AnalysisRunner {

    private static final Logger log = LoggerFactory.getLogger(AnalysisRunner.class);

    private final AnalysisRequestRepository analysisRequestRepository;
    private final MoveAnalysisRepository moveAnalysisRepository;
    private final StockfishEngine stockfishEngine;
    private final StockfishConfig stockfishConfig;
    private final ObjectMapper objectMapper;

    public AnalysisRunner(AnalysisRequestRepository analysisRequestRepository,
                          MoveAnalysisRepository moveAnalysisRepository,
                          StockfishEngine stockfishEngine,
                          StockfishConfig stockfishConfig,
                          ObjectMapper objectMapper) {
        this.analysisRequestRepository = analysisRequestRepository;
        this.moveAnalysisRepository = moveAnalysisRepository;
        this.stockfishEngine = stockfishEngine;
        this.stockfishConfig = stockfishConfig;
        this.objectMapper = objectMapper;
    }

    @Async
    public void run(UUID requestId) {
        AnalysisRequest request = analysisRequestRepository.findById(requestId).orElse(null);
        if (request == null) {
            log.warn("Analysis request {} disappeared before the job started", requestId);
            return;
        }
        try {
            request.setStatus(AnalysisStatus.IN_PROGRESS);
            analysisRequestRepository.save(request);

            List<PgnReplay.Ply> plies = PgnReplay.replay(request.getPgn());
            List<MoveAnalysis> rows = plies.isEmpty()
                    ? List.of(analysePosition(request))
                    : analysePlies(request, plies);

            request.setStatus(AnalysisStatus.COMPLETED);
            request.setResultSummary(summarise(rows));
            analysisRequestRepository.save(request);
            log.info("Analysis {} finished: {} moves at depth {}", requestId, rows.size(), stockfishConfig.getDepth());
        } catch (Exception exception) {
            log.error("Analysis failed for request {}", requestId, exception);
            markFailed(requestId);
        }
    }

    private List<MoveAnalysis> analysePlies(AnalysisRequest request, List<PgnReplay.Ply> plies) {
        Map<String, EngineScore> scores = new LinkedHashMap<>();
        List<MoveAnalysis> rows = new ArrayList<>(plies.size());
        for (PgnReplay.Ply ply : plies) {
            EngineScore before = scores.computeIfAbsent(ply.fenBefore(), fen -> evaluateQuietly(fen));
            EngineScore after = scores.computeIfAbsent(ply.fenAfter(), fen -> evaluateQuietly(fen));
            boolean moverIsWhite = "white".equals(ply.color());
            MoveGrader.Grade grade = MoveGrader.grade(moverIsWhite, before, after);

            ChessBoard board = ChessBoard.fromFen(ply.fenBefore());
            String bestMoveSan = toSan(board, before.bestMove);

            MoveAnalysis row = new MoveAnalysis();
            row.setAnalysisRequestId(request.getId());
            row.setGameId(request.getGameId());
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
            row.setBestMoveUci(before.bestMove);
            row.setBestMoveSan(bestMoveSan);
            row.setBestMoveEvalCp(grade.evalBeforeCp());
            row.setBestMoveEvalMate(grade.evalBeforeMate());
            row.setDifferenceCp(grade.differenceCp());
            row.setCpLoss(grade.cpLoss());
            row.setClassification(grade.classification());
            row.setPv(before.pv);
            rows.add(moveAnalysisRepository.save(row));
        }
        return rows;
    }

    /** A request without move text is a single position, so the best move doubles as the played move. */
    private MoveAnalysis analysePosition(AnalysisRequest request) {
        String fen = request.getFen() != null && !request.getFen().isBlank()
                ? request.getFen()
                : PgnReplay.startFen(request.getPgn());
        ChessBoard board = ChessBoard.fromFen(fen);
        boolean whiteToMove = board.whiteToMove();
        EngineScore score = evaluateQuietly(fen);
        String bestMoveSan = toSan(board, score.bestMove);

        MoveAnalysis row = new MoveAnalysis();
        row.setAnalysisRequestId(request.getId());
        row.setGameId(request.getGameId());
        row.setPly(0);
        row.setMoveNumber(board.fullmoveNumber());
        row.setColor(whiteToMove ? "white" : "black");
        row.setSan(bestMoveSan == null ? "-" : bestMoveSan);
        row.setUci(score.bestMove);
        row.setFenBefore(fen);
        row.setFenAfter(fen);
        row.setEvalBeforeCp(MoveGrader.whiteCp(score, whiteToMove));
        row.setEvalBeforeMate(MoveGrader.whiteMate(score, whiteToMove));
        row.setEvalAfterCp(row.getEvalBeforeCp());
        row.setEvalAfterMate(row.getEvalBeforeMate());
        row.setBestMoveUci(score.bestMove);
        row.setBestMoveSan(bestMoveSan);
        row.setBestMoveEvalCp(row.getEvalBeforeCp());
        row.setBestMoveEvalMate(row.getEvalBeforeMate());
        row.setDifferenceCp(0);
        row.setCpLoss(0);
        row.setClassification(MoveClassification.GOOD);
        row.setPv(score.pv);
        return moveAnalysisRepository.save(row);
    }

    private EngineScore evaluateQuietly(String fen) {
        try {
            return stockfishEngine.analyzePosition(fen, stockfishConfig.getDepth());
        } catch (Exception exception) {
            throw new IllegalStateException("Engine failed on " + fen, exception);
        }
    }

    private String toSan(ChessBoard board, String uci) {
        ChessBoard.Move move = SanCodec.fromUci(board, uci);
        return move == null ? null : SanCodec.toSan(board, move);
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
        int totalLoss = 0;
        for (MoveAnalysis row : rows) {
            classifications.compute(row.getClassification().name(), (key, count) -> count + 1);
            long[] colour = perColor.get(row.getColor());
            if (colour != null) {
                colour[0]++;
                colour[1] += row.getCpLoss();
                totalLoss += row.getCpLoss();
            }
        }
        summary.put("moves", rows.size());
        summary.put("depth", stockfishConfig.getDepth());
        summary.put("classifications", classifications);
        summary.put("averageCpLoss", rows.isEmpty() ? 0 : totalLoss / rows.size());
        Map<String, Object> players = new LinkedHashMap<>();
        perColor.forEach((colour, counts) -> {
            Map<String, Object> player = new LinkedHashMap<>();
            player.put("moves", counts[0]);
            player.put("totalCpLoss", counts[1]);
            player.put("averageCpLoss", counts[0] == 0 ? 0 : counts[1] / counts[0]);
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

    private void markFailed(UUID requestId) {
        try {
            AnalysisRequest request = analysisRequestRepository.findById(requestId).orElse(null);
            if (request != null) {
                request.setStatus(AnalysisStatus.FAILED);
                analysisRequestRepository.save(request);
            }
        } catch (Exception exception) {
            log.error("Could not mark analysis {} as failed", requestId, exception);
        }
    }
}
