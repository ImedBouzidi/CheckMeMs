package imed.moveanalysisservice.service;

import imed.moveanalysisservice.config.AnalysisWorkerProperties;
import imed.moveanalysisservice.model.AnalysisJobType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * PostgreSQL-backed work queue. Claiming uses FOR UPDATE SKIP LOCKED so multiple worker replicas
 * can run safely, and an expired lease puts a crashed job back in circulation.
 */
@Component
public class AnalysisQueue {

    private static final Logger log = LoggerFactory.getLogger(AnalysisQueue.class);

    private final JdbcTemplate jdbc;
    private final AnalysisWorkerProperties properties;

    public AnalysisQueue(JdbcTemplate jdbc, AnalysisWorkerProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    public Optional<UUID> enqueue(UUID gameAnalysisId, AnalysisJobType type, int priority, String payload) {
        UUID id = UUID.randomUUID();
        int inserted = jdbc.update("""
                INSERT INTO analysis_jobs
                    (id, game_analysis_id, job_type, status, priority, payload,
                     attempts, max_attempts, available_at, created_at, updated_at)
                VALUES (?, ?, ?, 'QUEUED', ?, CAST(? AS jsonb), 0, ?, now(), now(), now())
                ON CONFLICT DO NOTHING
                """,
                id, gameAnalysisId, type.name(), priority, payload, properties.getMaxAttempts());
        if (inserted == 0) {
            log.debug("An active {} job already exists for analysis {}", type, gameAnalysisId);
            return Optional.empty();
        }
        return Optional.of(id);
    }

    public Optional<ClaimedJob> claim(String workerId) {
        List<ClaimedJob> rows = jdbc.query("""
                UPDATE analysis_jobs
                SET status = 'RUNNING',
                    claimed_by = ?,
                    claimed_at = now(),
                    locked_until = now() + CAST(? AS interval),
                    attempts = attempts + 1,
                    updated_at = now()
                WHERE id = (
                    SELECT id
                    FROM analysis_jobs
                    WHERE status = 'QUEUED' AND available_at <= now()
                    ORDER BY priority DESC, created_at
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                )
                RETURNING id, game_analysis_id, job_type, attempts, max_attempts, created_at, claimed_by
                """,
                (rs, rowNum) -> new ClaimedJob(
                        rs.getObject("id", UUID.class),
                        rs.getObject("game_analysis_id", UUID.class),
                        AnalysisJobType.valueOf(rs.getString("job_type")),
                        rs.getInt("attempts"),
                        rs.getInt("max_attempts"),
                        rs.getObject("created_at", OffsetDateTime.class),
                        rs.getString("claimed_by")),
                workerId,
                properties.getLeaseSeconds() + " seconds");
        return rows.stream().findFirst();
    }

    /** Extending a lease only succeeds while the worker still owns the job. */
    public boolean renewLease(UUID jobId, String workerId) {
        return jdbc.update("""
                UPDATE analysis_jobs
                SET locked_until = now() + CAST(? AS interval), updated_at = now()
                WHERE id = ? AND status = 'RUNNING' AND claimed_by = ?
                """,
                properties.getLeaseSeconds() + " seconds",
                jobId,
                workerId) > 0;
    }

    public boolean complete(UUID jobId, String workerId) {
        return jdbc.update("""
                UPDATE analysis_jobs
                SET status = 'SUCCEEDED', locked_until = NULL, last_error = NULL, updated_at = now()
                WHERE id = ? AND status = 'RUNNING' AND claimed_by = ?
                """, jobId, workerId) > 0;
    }

    public boolean fail(UUID jobId, String workerId, String error) {
        return jdbc.update("""
                UPDATE analysis_jobs
                SET status = CASE WHEN attempts >= max_attempts THEN 'DEAD' ELSE 'QUEUED' END,
                    available_at = now() + CAST(? AS interval),
                    locked_until = NULL,
                    last_error = ?,
                    updated_at = now()
                WHERE id = ? AND status = 'RUNNING' AND claimed_by = ?
                """,
                properties.getRetryBackoffSeconds() + " seconds",
                truncate(error),
                jobId,
                workerId) > 0;
    }

    public int recoverExpiredLeases() {
        return jdbc.update("""
                UPDATE analysis_jobs
                SET status = CASE WHEN attempts >= max_attempts THEN 'DEAD' ELSE 'QUEUED' END,
                    available_at = now(),
                    locked_until = NULL,
                    claimed_by = NULL,
                    last_error = COALESCE(last_error, 'lease expired before the worker finished'),
                    updated_at = now()
                WHERE status = 'RUNNING' AND locked_until < now()
                """);
    }

    public long countQueued() {
        Long count = jdbc.queryForObject(
                "SELECT count(*) FROM analysis_jobs WHERE status = 'QUEUED' AND available_at <= now()",
                Long.class);
        return count == null ? 0 : count;
    }

    public long countRunning() {
        Long count = jdbc.queryForObject(
                "SELECT count(*) FROM analysis_jobs WHERE status = 'RUNNING'",
                Long.class);
        return count == null ? 0 : count;
    }

    public double oldestQueuedAgeSeconds() {
        Double age = jdbc.queryForObject("""
                SELECT COALESCE(EXTRACT(EPOCH FROM (now() - MIN(created_at))), 0)
                FROM analysis_jobs
                WHERE status = 'QUEUED'
                """, Double.class);
        return age == null ? 0 : age;
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= 4_000 ? value : value.substring(0, 4_000);
    }

    public record ClaimedJob(
            UUID id,
            UUID gameAnalysisId,
            AnalysisJobType jobType,
            int attempts,
            int maxAttempts,
            OffsetDateTime createdAt,
            String claimedBy) {
    }
}
