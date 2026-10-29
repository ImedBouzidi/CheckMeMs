package imed.moveanalysisservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.chess.ChessBoard;
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
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * The runner is exercised against a stubbed engine, so a failing assertion here always points at
 * the wiring rather than at Stockfish.
 */
class AnalysisRunnerTest {

    private final AnalysisRequestRepository requestRepository = mock(AnalysisRequestRepository.class);
    private final MoveAnalysisRepository moveRepository = mock(MoveAnalysisRepository.class);
    private final StockfishEngine engine = mock(StockfishEngine.class);
    private final StockfishConfig config = new StockfishConfig();
    private final UUID requestId = UUID.randomUUID();

    private AnalysisRunner runner;

    @BeforeEach
    void setUp() {
        config.setDepth(12);
        runner = new AnalysisRunner(requestRepository, moveRepository, engine, config, new ObjectMapper());
        when(moveRepository.save(any(MoveAnalysis.class))).thenAnswer(call -> call.getArgument(0));
        when(requestRepository.save(any(AnalysisRequest.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void storesOneRowPerPlyAndSummarisesTheGame() throws IOException {
        givenRequest("1. e4 e5 2. Nf3 Nc6");
        stubEngine(0);

        runner.run(requestId);

        List<MoveAnalysis> stored = captureRows(4);
        assertThat(stored).extracting(MoveAnalysis::getPly).containsExactly(1, 2, 3, 4);
        assertThat(stored).extracting(MoveAnalysis::getSan).containsExactly("e4", "e5", "Nf3", "Nc6");
        assertThat(stored).extracting(MoveAnalysis::getUci)
                .containsExactly("e2e4", "e7e5", "g1f3", "b8c6");
        assertThat(stored).allSatisfy(row -> {
            assertThat(sanOf(row.getFenBefore(), row.getBestMoveUci())).isEqualTo(row.getBestMoveSan());
            assertThat(row.getCpLoss()).isZero();
            assertThat(row.getClassification()).isEqualTo(MoveClassification.GOOD);
        });
        for (int index = 0; index + 1 < stored.size(); index++) {
            assertThat(stored.get(index).getFenAfter()).isEqualTo(stored.get(index + 1).getFenBefore());
        }
        // four plies, but only the distinct positions are searched: start plus one per played move
        verify(engine, times(5)).analyzePosition(anyString(), anyInt());

        AnalysisRequest finished = captureRequest();
        assertThat(finished.getStatus()).isEqualTo(AnalysisStatus.COMPLETED);
        assertThat(finished.getResultSummary()).contains("\"moves\":4").contains("\"GOOD\":4");
    }

    @Test
    void gradesBlackPerspectiveAgainstWhite() throws IOException {
        givenRequest("1. e4 e5");
        // +80 for whoever is to move, so each player gives away 160 by making the opponent the mover
        stubEngine(80);

        runner.run(requestId);

        List<MoveAnalysis> stored = captureRows(2);
        MoveAnalysis white = stored.get(0);
        MoveAnalysis black = stored.get(1);
        assertThat(white.getEvalBeforeCp()).isEqualTo(80);
        assertThat(white.getEvalAfterCp()).isEqualTo(-80);
        assertThat(white.getCpLoss()).isEqualTo(160);
        assertThat(white.getColor()).isEqualTo("white");
        assertThat(black.getEvalBeforeCp()).isEqualTo(-80);
        assertThat(black.getEvalAfterCp()).isEqualTo(80);
        assertThat(black.getCpLoss()).isEqualTo(160);
        assertThat(black.getColor()).isEqualTo("black");
        assertThat(black.getClassification()).isEqualTo(MoveClassification.BLUNDER);
        verify(engine, times(3)).analyzePosition(anyString(), anyInt());
    }

    @Test
    void analysesTheFenTaggedPositionWhenThePgnHasNoMoves() throws IOException {
        givenRequest("""
                [Event "setup"]
                [FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]
                """);
        stubEngineWith("a1a8", null);

        runner.run(requestId);

        MoveAnalysis row = captureRows(1).get(0);
        assertThat(row.getPly()).isZero();
        assertThat(row.getColor()).isEqualTo("white");
        assertThat(row.getFenBefore()).startsWith("6k1/5ppp/8/8/8/8/5PPP/R5K1");
        assertThat(row.getUci()).isEqualTo("a1a8");
        assertThat(row.getSan()).isEqualTo("Ra8#");
        assertThat(row.getBestMoveSan()).isEqualTo("Ra8#");
        verify(engine, times(1)).analyzePosition(anyString(), anyInt());
    }

    @Test
    void marksTheRequestFailedWhenTheEngineDies() throws IOException {
        givenRequest("1. e4 e5");
        when(engine.analyzePosition(anyString(), anyInt())).thenThrow(new IOException("engine gone"));

        runner.run(requestId);

        assertThat(captureRequest().getStatus()).isEqualTo(AnalysisStatus.FAILED);
        verify(moveRepository, never()).save(any(MoveAnalysis.class));
    }

    private void givenRequest(String pgn) {
        AnalysisRequest request = new AnalysisRequest();
        request.setId(requestId);
        request.setPgn(pgn);
        request.setStatus(AnalysisStatus.PENDING);
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
    }

    /** Any legal move of the requested position, so best move SAN is always resolvable. */
    private void stubEngine(Integer cp) throws IOException {
        when(engine.analyzePosition(anyString(), anyInt())).thenAnswer(call -> {
            ChessBoard board = ChessBoard.fromFen(call.<String>getArgument(0));
            return score(cp, board.legalMoves().get(0).uci());
        });
    }

    private void stubEngineWith(String bestMoveUci, Integer cp) throws IOException {
        when(engine.analyzePosition(anyString(), anyInt())).thenAnswer(call -> score(cp, bestMoveUci));
    }

    private static EngineScore score(Integer cp, String bestMoveUci) {
        EngineScore score = new EngineScore();
        score.cp = cp;
        score.bestMove = bestMoveUci;
        score.pv = bestMoveUci + " " + bestMoveUci;
        return score;
    }

    private List<MoveAnalysis> captureRows(int expected) {
        ArgumentCaptor<MoveAnalysis> rows = ArgumentCaptor.forClass(MoveAnalysis.class);
        verify(moveRepository, times(expected)).save(rows.capture());
        return rows.getAllValues();
    }

    private AnalysisRequest captureRequest() {
        ArgumentCaptor<AnalysisRequest> saved = ArgumentCaptor.forClass(AnalysisRequest.class);
        verify(requestRepository, times(2)).save(saved.capture());
        return saved.getAllValues().get(1);
    }

    private static String sanOf(String fen, String uci) {
        ChessBoard board = ChessBoard.fromFen(fen);
        return SanCodec.toSan(board, SanCodec.fromUci(board, uci));
    }
}
