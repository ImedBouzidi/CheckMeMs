package imed.moveanalysisservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.chess.ChessBoard;
import imed.moveanalysisservice.chess.PgnReplay;
import imed.moveanalysisservice.chess.SanCodec;
import imed.moveanalysisservice.config.LiveAnalysisProperties;
import imed.moveanalysisservice.config.StockfishConfig;
import imed.moveanalysisservice.dto.request.LiveMoveAnalysisRequest;
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
                new ObjectMapper(), queue, metrics, evalCache, new OpeningBook(new ObjectMapper()));
        when(moveRepository.save(any(MoveAnalysis.class))).thenAnswer(call -> call.getArgument(0));
        when(gameRepository.save(any(GameAnalysis.class))).thenAnswer(call -> call.getArgument(0));
        when(pool.borrow()).thenReturn(engine);
        when(engine.getEngineName()).thenReturn("Stockfish");
        when(engine.getEngineVersion()).thenReturn("17.1");
    }

    @Test
    void storesOneRowPerPlyAndSummarisesTheGame() throws Exception {
        givenAnalysis("1. h3 d5 2. Nf3 Nf6");
        stubEngine(0);

        runner.run(job());

        List<MoveAnalysis> stored = captureRows(4);
        assertThat(stored).extracting(MoveAnalysis::getPly).containsExactly(1, 2, 3, 4);
        assertThat(stored).extracting(MoveAnalysis::getSan).containsExactly("h3", "d5", "Nf3", "Nf6");
        assertThat(stored).extracting(MoveAnalysis::getUci)
                .containsExactly("h2h3", "d7d5", "g1f3", "g8f6");
        assertThat(stored).allSatisfy(row -> {
            assertThat(sanOf(row.getFenBefore(), row.getBestMoveUci())).isEqualTo(row.getBestMoveSan());
            assertThat(row.getCpLoss()).isZero();
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
        // 1. h3 2...d5 is Clemenz theory; 3.Nf3 leaves the book and keeps its graded verdict
        assertThat(stored.get(0).getClassification()).isEqualTo(MoveClassification.BOOK);
        assertThat(stored.get(1).getClassification()).isEqualTo(MoveClassification.BOOK);
        assertThat(stored.get(2).getClassification()).isEqualTo(MoveClassification.GOOD);
        assertThat(stored.get(3).getClassification()).isEqualTo(MoveClassification.GOOD);
        assertThat(analysis.getSummary()).contains("\"moves\":4").contains("\"BOOK\":2").contains("\"GOOD\":2");
        // the in-book part still names the opening even after the players left the book
        assertThat(analysis.getOpeningEco()).isEqualTo("A00");
        assertThat(analysis.getOpeningName()).isEqualTo("Clemenz Opening");
    }

    @Test
    void marksTheOpeningMovesAsBookTheory() throws Exception {
        givenAnalysis("1. e4 d5 2. Qh5");
        stubEngine(0);

        runner.run(job());

        List<MoveAnalysis> stored = captureRows(3);
        // e4/d5 is Scandinavian theory; Qh5 leaves the book and keeps its graded GOOD verdict
        assertThat(stored).extracting(MoveAnalysis::getPly).containsExactly(1, 2, 3);
        assertThat(stored.get(0).getClassification()).isEqualTo(MoveClassification.BOOK);
        assertThat(stored.get(1).getClassification()).isEqualTo(MoveClassification.BOOK);
        assertThat(stored.get(2).getClassification()).isEqualTo(MoveClassification.GOOD);
        assertThat(analysis.getSummary()).contains("\"BOOK\":2").contains("\"GOOD\":1");
        assertThat(analysis.getOpeningEco()).isEqualTo("B01");
        assertThat(analysis.getOpeningName()).isEqualTo("Scandinavian Defense");
    }

    @Test
    void settlingAStoredAndStreamedReviewFlagsBookMoves() {
        analysis = new GameAnalysis();
        analysis.setId(analysisId);
        analysis.setGameId(gameId);
        analysis.setPgn("1. e4 e5");
        analysis.setStatus(AnalysisStatus.PROCESSING);
        MoveAnalysis white = buildStoredRow(1, "e4");
        MoveAnalysis black = buildStoredRow(2, "e5");
        when(moveRepository.findByGameAnalysisIdOrderByPlyAsc(analysisId)).thenReturn(List.of(white, black));

        runner.completeFromStoredMoves(analysis);

        assertThat(white.getClassification()).isEqualTo(MoveClassification.BOOK);
        assertThat(black.getClassification()).isEqualTo(MoveClassification.BOOK);
        assertThat(white.getIsPreliminary()).isFalse();
        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.COMPLETED);
        assertThat(analysis.getSummary()).contains("\"BOOK\":2");
        // the settle path names the opening just like the batch path
        assertThat(analysis.getOpeningEco()).isEqualTo("C20");
        assertThat(analysis.getOpeningName()).isEqualTo("King's Pawn Game");
        verify(moveRepository).saveAll(List.of(white, black));
    }

    private MoveAnalysis buildStoredRow(int ply, String san) {
        MoveAnalysis row = new MoveAnalysis();
        row.setGameAnalysisId(analysisId);
        row.setGameId(gameId);
        row.setPly(ply);
        row.setSan(san);
        row.setColor(ply % 2 == 1 ? "white" : "black");
        row.setClassification(MoveClassification.GOOD);
        return row;
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

    @Test
    void liveMoveSearchReusesTheCacheAndStaysOutsideTheDb() throws Exception {
        givenAnalysis("1. e4 e5");
        analysis.setStatus(AnalysisStatus.PROCESSING);
        analysis.setConfigVersion("live");
        stubEngine(0);
        List<PgnReplay.Ply> plies = PgnReplay.replay("1. e4 e5");

        runner.analyzeLiveMove(analysis, live(plies.get(0)));
        runner.analyzeLiveMove(analysis, live(plies.get(1)));

        // Three distinct positions only: the middle one is ply 1's "after" and ply 2's "before" cache hit.
        verify(engine, times(3)).search(anyString(), any());
        // The game is announced once; a newGame per ply would throw away the shared hash state.
        verify(pool, times(1)).newGame(engine);
        // The search itself is pure engine and cache work: rows persist later, in the consumer's
        // separate persist transactions, so a Stockfish search never waits on a database connection.
        verify(moveRepository, never()).save(any(MoveAnalysis.class));
        verify(gameRepository, never()).save(any(GameAnalysis.class));
        verify(pool, times(2)).release(engine);
    }

    private LiveMoveAnalysisRequest live(PgnReplay.Ply ply) {
        return new LiveMoveAnalysisRequest(gameId, ply.ply(), ply.moveNumber(), ply.color(),
                ply.san(), ply.uci(), ply.fenBefore(), ply.fenAfter(), "owner");
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
