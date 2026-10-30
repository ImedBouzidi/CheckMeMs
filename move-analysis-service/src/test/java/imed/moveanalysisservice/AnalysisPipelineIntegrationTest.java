package imed.moveanalysisservice;

import static org.assertj.core.api.Assertions.assertThat;

import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import imed.moveanalysisservice.model.AnalysisJobType;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.service.AnalysisQueue;
import imed.moveanalysisservice.service.AnalysisRunner;
import imed.moveanalysisservice.service.AnalysisService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * End-to-end smoke test against a real PostgreSQL database and the real Stockfish binary. It is
 * opt-in ({@code -Danalysis.it.db=true}) so a normal unit run needs neither.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@EnabledIfSystemProperty(named = "analysis.it.db", matches = "true")
class AnalysisPipelineIntegrationTest {

    @Autowired
    private AnalysisService analysisService;

    @Autowired
    private AnalysisQueue analysisQueue;

    @Autowired
    private AnalysisRunner analysisRunner;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void cleanDatabase() {
        jdbc.update("DELETE FROM analysis_jobs");
        jdbc.update("DELETE FROM move_analyses");
        jdbc.update("DELETE FROM game_analyses");
    }

    @Test
    void submitsRunsAndCompletesARealAnalysis() {
        UUID gameId = UUID.randomUUID();
        String pgn = "1. e4 e5 2. Nf3 Nc6";

        SubmitAnalysisResponse submitted = analysisService.submit(request(gameId, pgn), "it-user");
        assertThat(submitted.status()).isEqualTo(AnalysisStatus.PENDING);

        SubmitAnalysisResponse duplicate = analysisService.submit(request(gameId, pgn), "it-user");
        assertThat(duplicate.requestId()).isEqualTo(submitted.requestId());
        assertThat(duplicate.message()).contains("already");

        AnalysisQueue.ClaimedJob job = analysisQueue.claim("it-worker").orElseThrow();
        assertThat(job.gameAnalysisId()).isEqualTo(submitted.requestId());

        analysisRunner.run(job);
        analysisQueue.complete(job.id(), "it-worker");

        AnalysisResponse review = analysisService.getAnalysis(submitted.requestId(), "it-user");
        assertThat(review.status()).isEqualTo(AnalysisStatus.COMPLETED);
        assertThat(review.expectedPlies()).isEqualTo(4);
        assertThat(review.completedPlies()).isEqualTo(4);
        assertThat(review.progressPct()).isEqualTo(100);
        assertThat(review.moves()).hasSize(4);
        assertThat(review.moves()).extracting(move -> move.san())
                .containsExactly("e4", "e5", "Nf3", "Nc6");
        assertThat(review.engineName()).isEqualTo("Stockfish");
        assertThat(review.engineVersion()).isNotBlank();
        assertThat(review.summary()).isNotNull();
        assertThat(review.summary().moves()).isEqualTo(4);
        assertThat(review.summary().players()).containsKeys("white", "black");
        assertThat(analysisQueue.claim("it-worker")).isEmpty();
    }

    @Test
    void recoversExpiredLeasesAndDeadLettersExhaustedJobs() {
        UUID analysisId = insertAnalysis();
        UUID jobId = analysisQueue.enqueue(analysisId, AnalysisJobType.GAME, 5, "{}").orElseThrow();

        assertThat(analysisQueue.enqueue(analysisId, AnalysisJobType.GAME, 5, "{}")).isEmpty();

        AnalysisQueue.ClaimedJob first = analysisQueue.claim("worker-a").orElseThrow();
        assertThat(first.id()).isEqualTo(jobId);
        assertThat(first.attempts()).isEqualTo(1);
        assertThat(analysisQueue.claim("worker-b")).isEmpty();

        jdbc.update("UPDATE analysis_jobs SET locked_until = now() - interval '1 minute' WHERE id = ?", jobId);
        assertThat(analysisQueue.recoverExpiredLeases()).isEqualTo(1);

        AnalysisQueue.ClaimedJob second = analysisQueue.claim("worker-b").orElseThrow();
        assertThat(second.attempts()).isEqualTo(2);
        assertThat(second.claimedBy()).isEqualTo("worker-b");
        assertThat(analysisQueue.renewLease(jobId, "worker-a")).isFalse();
        assertThat(analysisQueue.renewLease(jobId, "worker-b")).isTrue();

        jdbc.update("UPDATE analysis_jobs SET max_attempts = 2 WHERE id = ?", jobId);
        assertThat(analysisQueue.fail(jobId, "worker-b", "engine crashed")).isTrue();

        String status = jdbc.queryForObject(
                "SELECT status FROM analysis_jobs WHERE id = ?", String.class, jobId);
        assertThat(status).isEqualTo("DEAD");
        assertThat(analysisQueue.claim("worker-c")).isEmpty();
    }

    @Test
    void keepsAFailedJobQueuedForRetry() {
        UUID analysisId = insertAnalysis();
        analysisQueue.enqueue(analysisId, AnalysisJobType.GAME, 5, "{}").orElseThrow();

        AnalysisQueue.ClaimedJob job = analysisQueue.claim("worker-a").orElseThrow();
        assertThat(analysisQueue.fail(job.id(), "worker-a", "transient")).isTrue();

        String status = jdbc.queryForObject(
                "SELECT status FROM analysis_jobs WHERE id = ?", String.class, job.id());
        assertThat(status).isEqualTo("QUEUED");
        assertThat(analysisQueue.claim("worker-b")).isEmpty();

        List<String> errors = jdbc.queryForList(
                "SELECT last_error FROM analysis_jobs WHERE id = ?", String.class, job.id());
        assertThat(errors).containsExactly("transient");
    }

    private SubmitAnalysisRequest request(UUID gameId, String pgn) {
        return new SubmitAnalysisRequest(gameId.toString(), pgn, null,
                "player-white", "player-black", "1-0", "{}");
    }

    private UUID insertAnalysis() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO game_analyses
                    (id, game_id, profile, status, pgn, expected_plies, completed_plies)
                VALUES (?, ?, 'STANDARD', 'PENDING', '1. e4', 1, 0)
                """, id, UUID.randomUUID());
        return id;
    }
}
