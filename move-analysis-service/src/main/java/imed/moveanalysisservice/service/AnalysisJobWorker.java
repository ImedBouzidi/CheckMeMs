package imed.moveanalysisservice.service;

import imed.moveanalysisservice.config.AnalysisWorkerProperties;
import imed.moveanalysisservice.metrics.AnalysisMetrics;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.repository.GameAnalysisRepository;
import java.lang.management.ManagementFactory;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Polls the PostgreSQL queue, claims jobs with a lease, and runs them on a bounded executor whose
 * size matches the engine pool. A crashed worker's lease expires and the job is picked up again.
 */
@Component
@ConditionalOnProperty(name = "analysis.worker.enabled", havingValue = "true", matchIfMissing = true)
public class AnalysisJobWorker {

    private static final Logger log = LoggerFactory.getLogger(AnalysisJobWorker.class);

    private final AnalysisQueue queue;
    private final AnalysisRunner runner;
    private final AnalysisWorkerProperties properties;
    private final GameAnalysisRepository gameAnalysisRepository;
    private final AnalysisMetrics metrics;
    private final TaskExecutor executor;

    private final AtomicBoolean polling = new AtomicBoolean();
    private final AtomicInteger inFlight = new AtomicInteger();
    private final String workerId = buildWorkerId();

    public AnalysisJobWorker(AnalysisQueue queue,
                             AnalysisRunner runner,
                             AnalysisWorkerProperties properties,
                             GameAnalysisRepository gameAnalysisRepository,
                             AnalysisMetrics metrics,
                             @Qualifier("analysisWorkerExecutor") TaskExecutor executor) {
        this.queue = queue;
        this.runner = runner;
        this.properties = properties;
        this.gameAnalysisRepository = gameAnalysisRepository;
        this.metrics = metrics;
        this.executor = executor;
    }

    @Scheduled(fixedDelayString = "${analysis.worker.poll-interval-ms:500}")
    public void poll() {
        if (inFlight.get() >= concurrency() || !polling.compareAndSet(false, true)) {
            return;
        }
        try {
            int recovered = queue.recoverExpiredLeases();
            if (recovered > 0) {
                log.warn("Requeued {} analysis job(s) with an expired lease", recovered);
            }
            while (inFlight.get() < concurrency()) {
                Optional<AnalysisQueue.ClaimedJob> claimed = queue.claim(workerId);
                if (claimed.isEmpty()) {
                    break;
                }
                AnalysisQueue.ClaimedJob job = claimed.get();
                inFlight.incrementAndGet();
                try {
                    executor.execute(() -> execute(job));
                } catch (RuntimeException exception) {
                    inFlight.decrementAndGet();
                    log.warn("Worker executor rejected job {}: {}", job.id(), exception.getMessage());
                    queue.fail(job.id(), workerId, "worker executor rejected the job");
                    metrics.jobFailed();
                }
            }
        } catch (Exception exception) {
            log.error("Analysis queue poll failed", exception);
        } finally {
            polling.set(false);
        }
    }

    private void execute(AnalysisQueue.ClaimedJob job) {
        long waitMs = job.createdAt() == null
                ? 0
                : Duration.between(job.createdAt(), OffsetDateTime.now()).toMillis();
        metrics.recordJobWait(waitMs);
        long started = System.currentTimeMillis();
        try {
            runner.run(job);
            if (!queue.complete(job.id(), workerId)) {
                log.warn("Job {} was completed by another worker after its lease expired", job.id());
            }
            metrics.recordJobDuration(System.currentTimeMillis() - started);
            recordCompletion(job.gameAnalysisId());
            log.info("Job {} completed in {}ms (attempt {}/{})",
                    job.id(), System.currentTimeMillis() - started, job.attempts(), job.maxAttempts());
        } catch (Exception exception) {
            metrics.recordJobDuration(System.currentTimeMillis() - started);
            metrics.jobFailed();
            log.error("Job {} failed on attempt {}/{}", job.id(), job.attempts(), job.maxAttempts(), exception);
            try {
                queue.fail(job.id(), workerId, describe(exception));
            } catch (Exception queueException) {
                log.error("Could not release failed job {}", job.id(), queueException);
            }
        } finally {
            inFlight.decrementAndGet();
        }
    }

    private void recordCompletion(UUID gameAnalysisId) {
        GameAnalysis analysis = gameAnalysisRepository.findById(gameAnalysisId).orElse(null);
        if (analysis == null || analysis.getStatus() != AnalysisStatus.COMPLETED
                || analysis.getCreatedAt() == null) {
            return;
        }
        OffsetDateTime finished = analysis.getCompletedAt() == null ? OffsetDateTime.now() : analysis.getCompletedAt();
        metrics.recordReviewCompletion(Duration.between(analysis.getCreatedAt(), finished).toMillis());
    }

    private int concurrency() {
        return Math.max(1, properties.getConcurrency());
    }

    private String describe(Exception exception) {
        String message = exception.getMessage();
        return message == null || message.isBlank() ? exception.getClass().getSimpleName() : message;
    }

    private static String buildWorkerId() {
        String runtime = ManagementFactory.getRuntimeMXBean().getName();
        return "worker-" + runtime + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
