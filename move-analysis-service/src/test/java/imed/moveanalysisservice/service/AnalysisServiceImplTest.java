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
import imed.moveanalysisservice.config.StockfishConfig;
import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import imed.moveanalysisservice.exception.ForbiddenException;
import imed.moveanalysisservice.model.AnalysisJobType;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.repository.GameAnalysisRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import imed.moveanalysisservice.service.impl.AnalysisServiceImpl;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AnalysisServiceImplTest {

    private final GameAnalysisRepository gameRepository = mock(GameAnalysisRepository.class);
    private final MoveAnalysisRepository moveRepository = mock(MoveAnalysisRepository.class);
    private final AnalysisQueue queue = mock(AnalysisQueue.class);
    private final StockfishConfig config = new StockfishConfig();
    private final UUID gameId = UUID.randomUUID();

    private AnalysisServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AnalysisServiceImpl(gameRepository, moveRepository, queue, config, new ObjectMapper());
        when(gameRepository.save(any(GameAnalysis.class))).thenAnswer(call -> call.getArgument(0));
        when(queue.enqueue(any(), any(AnalysisJobType.class), anyInt(), anyString()))
                .thenReturn(Optional.of(UUID.randomUUID()));
    }

    @Test
    void submitCreatesPendingAnalysisAndEnqueuesOneJob() {
        when(gameRepository.findByGameIdAndProfile(gameId, "STANDARD")).thenReturn(Optional.empty());

        SubmitAnalysisResponse response = service.submit(request("1. e4 e5"), "user-1");

        assertThat(response.status()).isEqualTo(AnalysisStatus.PENDING);
        assertThat(response.gameId()).isEqualTo(gameId);
        verify(queue).enqueue(any(), any(AnalysisJobType.class), anyInt(), anyString());
    }

    @Test
    void duplicateSubmitReturnsTheExistingAnalysis() {
        GameAnalysis existing = analysis(AnalysisStatus.PROCESSING, "owner");
        when(gameRepository.findByGameIdAndProfile(gameId, "STANDARD")).thenReturn(Optional.of(existing));

        SubmitAnalysisResponse response = service.submit(request("1. e4 e5"), "owner");

        assertThat(response.requestId()).isEqualTo(existing.getId());
        assertThat(response.status()).isEqualTo(AnalysisStatus.PROCESSING);
        assertThat(response.message()).contains("already");
        verify(gameRepository, never()).save(any(GameAnalysis.class));
    }

    @Test
    void rejectsInvalidPgn() {
        assertThatThrownBy(() -> service.submit(request("1. e4 e5 2. e5"), "user-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid PGN");
    }

    @Test
    void rejectsMissingGameId() {
        SubmitAnalysisRequest request = new SubmitAnalysisRequest(null, "1. e4", null, null, null, null, null);
        assertThatThrownBy(() -> service.submit(request, "user-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("gameId");
    }

    @Test
    void rejectsAnUnauthorizedReader() {
        GameAnalysis existing = analysis(AnalysisStatus.COMPLETED, "owner");
        when(gameRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.getAnalysis(existing.getId(), "intruder"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void allowsAParticipantToReadTheReview() {
        GameAnalysis existing = analysis(AnalysisStatus.COMPLETED, "owner");
        existing.setWhitePlayerId("player-white");
        when(gameRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(moveRepository.findByGameAnalysisIdOrderByPlyAsc(existing.getId())).thenReturn(java.util.List.of());

        AnalysisResponse response = service.getAnalysis(existing.getId(), "player-white");

        assertThat(response.status()).isEqualTo(AnalysisStatus.COMPLETED);
    }

    @Test
    void retryResetsAFailedAnalysis() {
        GameAnalysis existing = analysis(AnalysisStatus.FAILED, "owner");
        existing.setCompletedPlies(12);
        existing.setLastError("engine gone");
        when(gameRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        SubmitAnalysisResponse response = service.retry(existing.getId(), "owner");

        assertThat(response.status()).isEqualTo(AnalysisStatus.PENDING);
        assertThat(existing.getCompletedPlies()).isZero();
        assertThat(existing.getLastError()).isNull();
        verify(queue).enqueue(any(), any(AnalysisJobType.class), anyInt(), anyString());
    }

    private SubmitAnalysisRequest request(String pgn) {
        return new SubmitAnalysisRequest(gameId.toString(), pgn, null,
                "player-white", "player-black", "1-0", "{}");
    }

    private GameAnalysis analysis(AnalysisStatus status, String requestedBy) {
        GameAnalysis analysis = new GameAnalysis();
        analysis.setId(UUID.randomUUID());
        analysis.setGameId(gameId);
        analysis.setProfile("STANDARD");
        analysis.setStatus(status);
        analysis.setPgn("1. e4 e5");
        analysis.setExpectedPlies(2);
        analysis.setCompletedPlies(status == AnalysisStatus.COMPLETED ? 2 : 0);
        analysis.setRequestedBy(requestedBy);
        return analysis;
    }
}
