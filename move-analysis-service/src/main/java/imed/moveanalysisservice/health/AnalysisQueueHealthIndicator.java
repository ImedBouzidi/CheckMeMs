package imed.moveanalysisservice.health;

import imed.moveanalysisservice.service.AnalysisQueue;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class AnalysisQueueHealthIndicator implements HealthIndicator {

    private static final double WARNING_AGE_SECONDS = 120;

    private final AnalysisQueue queue;

    public AnalysisQueueHealthIndicator(AnalysisQueue queue) {
        this.queue = queue;
    }

    @Override
    public Health health() {
        try {
            long queued = queue.countQueued();
            long running = queue.countRunning();
            double oldestAge = queue.oldestQueuedAgeSeconds();
            Health.Builder builder = oldestAge > WARNING_AGE_SECONDS ? Health.status("DEGRADED") : Health.up();
            return builder
                    .withDetail("queued", queued)
                    .withDetail("running", running)
                    .withDetail("oldestQueuedSeconds", Math.round(oldestAge))
                    .build();
        } catch (Exception exception) {
            return Health.down(exception).build();
        }
    }
}
