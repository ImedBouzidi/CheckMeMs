package imed.moveanalysisservice.metrics;

import imed.moveanalysisservice.engine.StockfishPool;
import imed.moveanalysisservice.service.AnalysisQueue;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import org.springframework.stereotype.Component;

@Component
public class AnalysisMetrics {

    private final MeterRegistry registry;
    private final Counter failedJobs;

    public AnalysisMetrics(MeterRegistry registry, StockfishPool stockfishPool, AnalysisQueue analysisQueue) {
        this.registry = registry;
        this.failedJobs = Counter.builder("analysis.jobs.failed")
                .description("Analysis jobs that ended in a retry or dead-letter state")
                .register(registry);

        Gauge.builder("analysis.engine.pool.in_use", stockfishPool, StockfishPool::inUse)
                .description("Stockfish processes currently leased to a worker")
                .register(registry);
        Gauge.builder("analysis.engine.pool.alive", stockfishPool, StockfishPool::aliveCount)
                .description("Live Stockfish processes")
                .register(registry);
        Gauge.builder("analysis.engine.pool.size", stockfishPool, StockfishPool::capacity)
                .description("Configured Stockfish pool capacity")
                .register(registry);
        Gauge.builder("analysis.engine.restarts", stockfishPool, pool -> (double) pool.restartCount())
                .description("Stockfish processes discarded or restarted")
                .register(registry);
        Gauge.builder("analysis.jobs.queued", analysisQueue, queue -> (double) safeQueued(queue))
                .description("Queued analysis jobs ready to run")
                .register(registry);
        Gauge.builder("analysis.jobs.running", analysisQueue, queue -> (double) safeRunning(queue))
                .description("Analysis jobs currently running")
                .register(registry);
        Gauge.builder("analysis.jobs.oldest_wait_seconds", analysisQueue, queue -> safeOldest(queue))
                .description("Age of the oldest queued analysis job")
                .register(registry);
    }

    private long safeQueued(AnalysisQueue queue) {
        try {
            return queue.countQueued();
        } catch (Exception exception) {
            return 0;
        }
    }

    private long safeRunning(AnalysisQueue queue) {
        try {
            return queue.countRunning();
        } catch (Exception exception) {
            return 0;
        }
    }

    private double safeOldest(AnalysisQueue queue) {
        try {
            return queue.oldestQueuedAgeSeconds();
        } catch (Exception exception) {
            return 0;
        }
    }

    public void recordSearch(long elapsedMs, String result) {
        Timer.builder("analysis.search")
                .description("Stockfish search duration")
                .tag("result", result)
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry)
                .record(Duration.ofMillis(Math.max(0, elapsedMs)));
    }

    public void recordCacheHit() {
        Counter.builder("analysis.eval.cache.hits")
                .description("Stockfish evaluations served from the FEN eval cache instead of a search")
                .register(registry)
                .increment();
    }

    public void recordJobWait(long waitMs) {
        Timer.builder("analysis.job.wait")
                .description("Time between job creation and the worker claiming it")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry)
                .record(Duration.ofMillis(Math.max(0, waitMs)));
    }

    public void recordJobDuration(long durationMs) {
        Timer.builder("analysis.job.duration")
                .description("Time spent processing one analysis job")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry)
                .record(Duration.ofMillis(Math.max(0, durationMs)));
    }

    public void recordReviewCompletion(long durationMs) {
        Timer.builder("analysis.review.completion")
                .description("Time from submission to a completed review")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry)
                .record(Duration.ofMillis(Math.max(0, durationMs)));
    }

    public void jobFailed() {
        failedJobs.increment();
    }
}
