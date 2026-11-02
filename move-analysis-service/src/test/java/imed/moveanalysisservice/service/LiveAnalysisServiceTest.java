package imed.moveanalysisservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.config.LiveAnalysisProperties;
import imed.moveanalysisservice.dto.request.FinalizeLiveAnalysisRequest;
import imed.moveanalysisservice.dto.request.LiveMoveAnalysisRequest;
import imed.moveanalysisservice.exception.AnalysisNotFoundException;
import imed.moveanalysisservice.exception.ForbiddenException;
import imed.moveanalysisservice.metrics.AnalysisMetrics;
import imed.moveanalysisservice.model.AnalysisJobType;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.model.MoveAnalysisStatus;
import imed.moveanalysisservice.repository.GameAnalysisRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * Finalize only settles what the live stream already stored: it waits for the tail, summarises the
 * rows, and never queues a batch re-run while streamed moves exist.
 */
class LiveAnalysisServiceTest {

    private final KafkaTemplate<String, String> kafka = kafkaTemplate();
    private final GameAnalysisRepository gameRepository = mock(GameAnalysisRepository.class);
    private final MoveAnalysisRepository moveRepository = mock(MoveAnalysisRepository.class);
    private final AnalysisQueue queue = mock(AnalysisQueue.class);
    private final AnalysisRunner runner = mock(AnalysisRunner.class);
    private final AnalysisMetrics metrics = mock(AnalysisMetrics.class);
    private final EvalCache evalCache = new EvalCache(metrics);
    private final LiveAnalysisProperties properties = new LiveAnalysisProperties();
    private final UUID gameId = UUID.randomUUID();

    private GameAnalysis analysis;
    private LiveAnalysisService service;

    @BeforeEach
    void setUp() {
        properties.setFinalizeWaitMs(200);
        properties.setFinalizePollMs(20);
        service = new LiveAnalysisService(kafka, new ObjectMapper(), gameRepository, moveRepository,
                queue, evalCache, runner, properties, noopTransactionManager());

        analysis = new GameAnalysis();
        analysis.setId(UUID.randomUUID());
        analysis.setGameId(gameId);
        analysis.setProfile("STANDARD");
        analysis.setStatus(AnalysisStatus.PROCESSING);
        analysis.setPgn("");
        analysis.setExpectedPlies(0);
        analysis.setCompletedPlies(0);
        analysis.setRequestedBy("owner");
        analysis.setConfigVersion("live");
        when(gameRepository.save(any(GameAnalysis.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void finalizeSummarisesTheStoredRowsAndNeverEnqueues() {
        existingAnalysis();
        when(moveRepository.countByGameAnalysisId(analysis.getId())).thenReturn(2L);
        when(gameRepository.findById(analysis.getId())).thenReturn(Optional.of(analysis));

        GameAnalysis result = service.finaliseGame(gameId, request(2, "1. e4 e5"), "owner");

        assertThat(result).isSameAs(analysis);
        assertThat(analysis.getFinalizedAt()).isNotNull();
        assertThat(analysis.getExpectedPlies()).isEqualTo(2);
        verify(runner).completeFromStoredMoves(analysis);
        verify(queue, never()).enqueue(any(), any(AnalysisJobType.class), anyInt(), anyString());
    }

    @Test
    void finalizeWaitsForTheStreamingTailBeforeSummarising() {
        existingAnalysis();
        // close counts 1 stored ply, the tail lands while finalize polls, settle re-counts twice.
        when(moveRepository.countByGameAnalysisId(analysis.getId())).thenReturn(1L, 1L, 2L, 2L);
        when(gameRepository.findById(analysis.getId())).thenReturn(Optional.of(analysis));

        service.finaliseGame(gameId, request(2, "1. e4 e5"), "owner");

        assertThat(analysis.getFinalizedAt()).isNotNull();
        verify(runner).completeFromStoredMoves(analysis);
        verify(queue, never()).enqueue(any(), any(AnalysisJobType.class), anyInt(), anyString());
    }

    @Test
    void finalizeKeepsTheReviewOpenWhenTheTailNeverArrives() {
        existingAnalysis();
        when(moveRepository.countByGameAnalysisId(analysis.getId())).thenReturn(1L);
        when(gameRepository.findById(analysis.getId())).thenReturn(Optional.of(analysis));

        service.finaliseGame(gameId, request(2, "1. e4 e5"), "owner");

        // Only one of two plies is stored, so the summary waits for the consumer to close the gap.
        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.PROCESSING);
        verify(runner, never()).completeFromStoredMoves(any());
        verify(queue, never()).enqueue(any(), any(AnalysisJobType.class), anyInt(), anyString());
    }

    @Test
    void finalizeReplaysThePgnOnlyWhenNotOnePlyWasStored() {
        existingAnalysis();
        when(moveRepository.countByGameAnalysisId(analysis.getId())).thenReturn(0L);
        when(gameRepository.findById(analysis.getId())).thenReturn(Optional.of(analysis));

        GameAnalysis result = service.finaliseGame(gameId, request(2, "1. e4 e5"), "owner");

        // Nothing streamed, so there are no live rows to delete and the batch replay is the only
        // way the review can produce a summary instead of staying open forever.
        assertThat(result.getStatus()).isEqualTo(AnalysisStatus.PENDING);
        assertThat(result.getCompletedPlies()).isZero();
        assertThat(result.getExpectedPlies()).isZero();
        verify(queue).enqueue(analysis.getId(), AnalysisJobType.GAME, 5, "{}");
        verify(runner, never()).completeFromStoredMoves(any());
    }

    @Test
    void finalizeThrowsWhenNoLiveAggregateExists() {
        when(gameRepository.findByGameIdAndProfile(gameId, "STANDARD")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.finaliseGame(gameId, request(2, "1. e4 e5"), "owner"))
                .isInstanceOf(AnalysisNotFoundException.class)
                .hasMessageContaining("No live analysis");
        verify(queue, never()).enqueue(any(), any(AnalysisJobType.class), anyInt(), anyString());
    }

    @Test
    void finalizeRejectsACallerWhoDoesNotOwnTheStream() {
        existingAnalysis();

        assertThatThrownBy(() -> service.finaliseGame(gameId, request(2, "1. e4 e5"), "intruder"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Not authorized");
        verify(runner, never()).completeFromStoredMoves(any());
    }

    @Test
    void persistingACompletedPlyDoesNotFinishAnUnfinalisedGame() {
        analysis.setExpectedPlies(2);
        analysis.setCompletedPlies(1);
        when(moveRepository.findByGameAnalysisIdAndPly(analysis.getId(), 2)).thenReturn(Optional.empty());

        service.persistCompletedPly(analysis, live(2, "e7e5"), completedRow(2));

        // The stored ply count alone never completes the review; that happens at finalize only.
        verify(runner, never()).completeFromStoredMoves(any());
        assertThat(analysis.getStatus()).isEqualTo(AnalysisStatus.PROCESSING);
        assertThat(analysis.getCompletedPlies()).isEqualTo(2);
        assertThat(evalCache.liveProgress(gameId)).isEqualTo(2);
    }

    @Test
    void persistingTheLastPlySettlesAFinalisedGame() {
        analysis.setFinalizedAt(OffsetDateTime.now());
        analysis.setExpectedPlies(2);
        analysis.setCompletedPlies(1);
        when(moveRepository.findByGameAnalysisIdAndPly(analysis.getId(), 2)).thenReturn(Optional.empty());

        service.persistCompletedPly(analysis, live(2, "e7e5"), completedRow(2));

        verify(runner).completeFromStoredMoves(analysis);
    }

    @Test
    void persistingAFailedPlyStillCountsThePly() {
        analysis.setExpectedPlies(2);
        analysis.setCompletedPlies(1);
        when(moveRepository.findByGameAnalysisIdAndPly(analysis.getId(), 2)).thenReturn(Optional.empty());

        service.persistFailedPly(analysis, live(2, "e7e5"), new RuntimeException("engine gone"));

        assertThat(analysis.getCompletedPlies()).isEqualTo(2);
        assertThat(analysis.getLastError()).contains("engine gone");
        verify(runner, never()).completeFromStoredMoves(any());
    }

    private GameAnalysis existingAnalysis() {
        when(gameRepository.findByGameIdAndProfile(gameId, "STANDARD")).thenReturn(Optional.of(analysis));
        return analysis;
    }

    private FinalizeLiveAnalysisRequest request(int expectedPlies, String pgn) {
        return new FinalizeLiveAnalysisRequest(expectedPlies, pgn);
    }

    private LiveMoveAnalysisRequest live(int ply, String san) {
        return new LiveMoveAnalysisRequest(gameId, ply, (ply + 1) / 2,
                ply % 2 == 1 ? "white" : "black", san, "e2e4", "start-fen", "after-fen", "owner");
    }

    private MoveAnalysis completedRow(int ply) {
        MoveAnalysis row = new MoveAnalysis();
        row.setGameAnalysisId(analysis.getId());
        row.setGameId(gameId);
        row.setPly(ply);
        row.setStatus(MoveAnalysisStatus.COMPLETED);
        row.setEngineVersion("17.1");
        row.setConfigVersion("live");
        return row;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static KafkaTemplate<String, String> kafkaTemplate() {
        return (KafkaTemplate) mock(KafkaTemplate.class);
    }

    private static PlatformTransactionManager noopTransactionManager() {
        return new PlatformTransactionManager() {
            @Override
            public TransactionStatus getTransaction(TransactionDefinition definition) {
                return new SimpleTransactionStatus();
            }

            @Override
            public void commit(TransactionStatus status) {
            }

            @Override
            public void rollback(TransactionStatus status) {
            }
        };
    }
}
