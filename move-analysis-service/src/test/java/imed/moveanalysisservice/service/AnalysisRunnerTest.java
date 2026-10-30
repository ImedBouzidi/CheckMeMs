package imed.moveanalysisservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.chess.ChessBoard;
import imed.moveanalysisservice.chess.SanCodec;
import imed.moveanalysisservice.config.LiveAnalysisProperties;
import imed.moveanalysisservice.config.StockfishConfig;
import imed.moveanalysisservice.engine.EngineEvaluation;
import imed.moveanalysisservice.engine.StockfishPool;
import imed.moveanalysisservice.engine.StockfishProcess;
import imed.moveanalysisservice.engine.StockfishProcess;
import imed.moveanalysisservice.metrics.AnalysisMetrics;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import imed.moveanalysisservice.model.AnalysisJobType;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.model.MoveClassification;
import imed.moveanalysisservice.repository.GameAnalysisRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * The runner is exercised against a stubbed engine pool, so a failing assertion here always points
 * at the wiring rather than at Stockfish.
 */
class AnalysisRunnerTest {

    private final GameAnalysisRepository gameRepository = mock(GameAnalysisRepository.class);
    private final MoveAnalysisRepository moveRepository = mock(MoveAnalysisRepository.class);
    private final StockfishPool pool = mock(StockfishPool.class);
    private final StockfishProcess engine = mock(StockfishProcess.class);
    private final AnalysisQueue queue = mock(AnalysisQueue.class);
    private final AnalysisMetrics metrics = mock(AnalysisMetrics.class);
    private final EvalCache evalCache = new EvalCache(new ObjectMapper(), new LiveAnalysisProperties(),
            metrics, emptyRedisProvider());
    private final StockfishConfig config = new StockfishConfig();
    private final UUID analysisId = UUID.randomUUID();
    private final UUID gameId = UUID.randomUUID();

    private AnalysisRunner runner;
    private GameAnalysis analysis;

    @BeforeEach
    void setUp() throws Exception {
        config.setDepth(12);
        runner = new AnalysisRunner(gameRepository, moveRepository, pool, config,
                new ObjectMapper(), queue, metrics, evalCache);
        when(moveRepository.save(any(MoveAnalysis.class))).thenAnswer(call -> call.getArgument(0));
        when(gameRepository.save(any(GameAnalysis.class))).thenAnswer(call -> call.getArgument(0));
        when(pool.borrow()).thenReturn(engine);
        when(engine.getEngineName()).thenReturn("Stockfish");
        when(engine.getEngineVersion()).thenReturn("17.1");
    }

    @Test
    void storesOneRowPerPlyAndSummarisesTheGame() throws Exception {
        givenAnalysis("1. e4 e5 2. Nf3 Nc6");
        stubEngine(0);

        runner.run(job());

        List<MoveAnalysis> stored = captureRows(4);
        assertThat(stored).extracting(MoveAnalysis::getPly).containsExactly(1, 2, 3, 4);
        assertThat(stored).extracting(MoveAnalysis::getSan).containsExactly("e4", "e5", "Nf3", "Nc6");
        assertThat(stored).extracting(MoveAnalysis::getUci)
                .containsExactly("e2e4", "e7e5", "g1f3", "b8c6");
        assertThat(stored).allSatisfy(row -> {
            assertThat(sanOf(row.getFenBefore(), row.getBestMoveUci())).isEqualTo(row.getBestMoveSan());
            assertThat(row.getCpLoss()).isZero();
            assertThat(row.getClassification()).isEqualTo(MoveClassification.GOOD);
            assertThat(row.getEngineVersion()).isEqualTo("17.1");
            assertThat(row.getStatus().name()).isEqualTo("COMPLETED");
        });
        for (int index = 0; index + 1 < stored.size(); index++) {
            assertThat(stored.get(index).getFenAfter()).isEqualTo(stored.get(index + 1).getFenBefore());
        }
        // four plies, but only the distinct positions are searched: start plus one per played move
        verify(engine, times(5)).search(anyString(), any());

        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.COMPLETED);
        assertThat(analysis.getCompletedPlies()).isEqualTo(4);
        assertThat(analysis.getSummary()).contains("\"moves\":4").contains("\"GOOD\":4");
    }

    @Test
    void gradesBlackPerspectiveAgainstWhite() throws Exception {
        givenAnalysis("1. e4 e5");
        stubEngine(80);

        runner.run(job());

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
        verify(engine, times(3)).search(anyString(), any());
    }

    @Test
    void analysesTheFenTaggedPositionWhenThePgnHasNoMoves() throws Exception {
        givenAnalysis("""
                [Event "setup"]
                [FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]
                """);
        stubEngineWith("a1a8", null);

        runner.run(job());

        MoveAnalysis row = captureRows(1).get(0);
        assertThat(row.getPly()).isZero();
        assertThat(row.getColor()).isEqualTo("white");
        assertThat(row.getFenBefore()).startsWith("6k1/5ppp/8/8/8/8/5PPP/R5K1");
        assertThat(row.getUci()).isEqualTo("a1a8");
        assertThat(row.getSan()).isEqualTo("Ra8#");
        assertThat(row.getBestMoveSan()).isEqualTo("Ra8#");
        verify(engine, times(1)).search(anyString(), any());
    }

    @Test
    void marksTheAnalysisFailedWhenTheEngineDies() throws Exception {
        givenAnalysis("1. e4 e5");
        when(engine.search(anyString(), any())).thenThrow(new IOException("engine gone"));

        assertThatThrownBy(() -> runner.run(job())).isInstanceOf(RuntimeException.class);

        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(analysis.getLastError()).contains("engine gone");
        verify(moveRepository, times(0)).save(any(MoveAnalysis.class));
    }

    @Test
    void reusesCachedEvaluationsOnARerunWithoutSearchingAgain() throws Exception {
        givenAnalysis("1. e4 e5");
        stubEngine(0);
        runner.run(job());

        clearInvocations(engine, moveRepository);
        givenAnalysis("1. e4 e5");
        runner.run(job());

        List<MoveAnalysis> stored = captureRows(2);
        assertThat(stored).extracting(MoveAnalysis::getPly).containsExactly(1, 2);
        verify(engine, times(0)).search(anyString(), any());
        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.COMPLETED);
    }

    private void givenAnalysis(String pgn) {
        analysis = new GameAnalysis();
        analysis.setId(analysisId);
        analysis.setGameId(gameId);
        analysis.setPgn(pgn);
        analysis.setStatus(AnalysisStatus.PENDING);
        analysis.setExpectedPlies(0);
        analysis.setCompletedPlies(0);
        when(gameRepository.findById(analysisId)).thenReturn(Optional.of(analysis));
    }

    /** Any legal move of the requested position, so best move SAN is always resolvable. */
    private void stubEngine(Integer cp) throws IOException {
        when(engine.search(anyString(), any())).thenAnswer(call -> {
            ChessBoard board = ChessBoard.fromFen(call.<String>getArgument(0));
            return score(cp, board.legalMoves().get(0).uci());
        });
    }

    private void stubEngineWith(String bestMoveUci, Integer cp) throws IOException {
        when(engine.search(anyString(), any())).thenAnswer(call -> score(cp, bestMoveUci));
    }

    private static EngineEvaluation score(Integer cp, String bestMoveUci) {
        return new EngineEvaluation(cp, null, bestMoveUci, bestMoveUci + " " + bestMoveUci,
                12, 16, 1_000, 15, 1, "Stockfish", "17.1", false);
    }

    private AnalysisQueue.ClaimedJob job() {
        return new AnalysisQueue.ClaimedJob(UUID.randomUUID(), analysisId, AnalysisJobType.GAME,
                1, 3, OffsetDateTime.now(), "worker-test");
    }

    /** No Redis in unit tests, so the runner still exercises the bounded in-process cache layer. */
    @SuppressWarnings("unchecked")
    private static ObjectProvider<StringRedisTemplate> emptyRedisProvider() {
        ObjectProvider<StringRedisTemplate> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        return provider;
    }

    private List<MoveAnalysis> captureRows(int expected) {
        ArgumentCaptor<MoveAnalysis> rows = ArgumentCaptor.forClass(MoveAnalysis.class);
        verify(moveRepository, times(expected)).save(rows.capture());
        return rows.getAllValues();
    }

    private static String sanOf(String fen, String uci) {
        ChessBoard board = ChessBoard.fromFen(fen);
        return SanCodec.toSan(board, SanCodec.fromUci(board, uci));
    }
}
