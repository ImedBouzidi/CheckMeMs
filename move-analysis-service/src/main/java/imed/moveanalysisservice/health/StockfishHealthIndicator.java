package imed.moveanalysisservice.health;

import imed.moveanalysisservice.engine.StockfishPool;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class StockfishHealthIndicator implements HealthIndicator {

    private final StockfishPool pool;

    public StockfishHealthIndicator(StockfishPool pool) {
        this.pool = pool;
    }

    @Override
    public Health health() {
        int alive = pool.aliveCount();
        Health.Builder builder = alive > 0 ? Health.up() : Health.down();
        return builder
                .withDetail("poolSize", pool.capacity())
                .withDetail("alive", alive)
                .withDetail("inUse", pool.inUse())
                .withDetail("engine", pool.engineName())
                .withDetail("engineVersion", pool.engineVersion())
                .withDetail("restarts", pool.restartCount())
                .build();
    }
}
