package imed.moveanalysisservice.engine;

import imed.moveanalysisservice.config.StockfishConfig;
import imed.moveanalysisservice.exception.EngineUnavailableException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Bounded set of persistent Stockfish processes. Borrowing hands out exclusive ownership for one
 * search; the caller must release in a finally block. Dead processes are replaced lazily on the
 * next borrow so an engine crash never takes the API down.
 */
@Component
public class StockfishPool implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(StockfishPool.class);

    private final StockfishConfig config;
    private final BlockingQueue<StockfishProcess> available = new LinkedBlockingQueue<>();
    private final Set<StockfishProcess> all = ConcurrentHashMap.newKeySet();
    private final AtomicInteger inUse = new AtomicInteger();
    private final AtomicLong restarts = new AtomicLong();
    private final AtomicLong startups = new AtomicLong();
    private final AtomicLong nextAttemptAt = new AtomicLong();

    public StockfishPool(StockfishConfig config) {
        this.config = config;
    }

    @PostConstruct
    public void init() {
        int target = capacity();
        for (int index = 0; index < target; index++) {
            try {
                StockfishProcess process = createProcess();
                all.add(process);
                available.offer(process);
            } catch (Exception exception) {
                log.warn("Could not start Stockfish at startup: {}", exception.getMessage());
                break;
            }
        }
        log.info("Stockfish pool ready: {}/{} processes", all.size(), target);
    }

    public StockfishProcess borrow() {
        return borrow(config.getBorrowTimeoutMs(), TimeUnit.MILLISECONDS);
    }

    public StockfishProcess borrow(long timeout, TimeUnit unit) {
        long timeoutNanos = unit.toNanos(timeout);
        long deadline = System.nanoTime() + timeoutNanos;
        while (true) {
            long remainingNanos = deadline - System.nanoTime();
            long remainingMillis = Math.max(0, TimeUnit.NANOSECONDS.toMillis(remainingNanos));
            StockfishProcess process;
            try {
                process = available.poll(Math.min(remainingMillis, 100), TimeUnit.MILLISECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new EngineUnavailableException("Interrupted while waiting for a Stockfish process", exception);
            }
            if (process != null) {
                if (process.isAlive()) {
                    inUse.incrementAndGet();
                    return process;
                }
                discard(process, "process was dead before use");
                continue;
            }
            StockfishProcess created = tryCreate();
            if (created != null) {
                inUse.incrementAndGet();
                return created;
            }
            if (System.nanoTime() >= deadline) {
                throw new EngineUnavailableException("No Stockfish process available within " + timeout + " " + unit);
            }
        }
    }

    public void release(StockfishProcess process) {
        if (process == null) {
            return;
        }
        inUse.decrementAndGet();
        if (process.isAlive()) {
            available.offer(process);
        } else {
            discard(process, "process died during a search");
        }
    }

    public void newGame(StockfishProcess process) throws java.io.IOException {
        process.newGame();
    }

    public int capacity() {
        return Math.max(1, config.getPoolSize());
    }

    public int aliveCount() {
        int alive = 0;
        for (StockfishProcess process : all) {
            if (process.isAlive()) {
                alive++;
            }
        }
        return alive;
    }

    public int inUse() {
        return inUse.get();
    }

    public long restartCount() {
        return restarts.get();
    }

    public long startupCount() {
        return startups.get();
    }

    public String engineName() {
        for (StockfishProcess process : all) {
            if (process.isAlive()) {
                return process.getEngineName();
            }
        }
        return null;
    }

    public String engineVersion() {
        for (StockfishProcess process : all) {
            if (process.isAlive()) {
                return process.getEngineVersion();
            }
        }
        return null;
    }

    private StockfishProcess tryCreate() {
        long now = System.currentTimeMillis();
        long retryAt = nextAttemptAt.get();
        if (now < retryAt) {
            return null;
        }
        synchronized (this) {
            if (all.size() >= capacity()) {
                return null;
            }
            try {
                StockfishProcess process = createProcess();
                all.add(process);
                startups.incrementAndGet();
                nextAttemptAt.set(0);
                return process;
            } catch (Exception exception) {
                long backoff = Math.max(100, config.getRestartBackoffMs());
                nextAttemptAt.set(System.currentTimeMillis() + backoff);
                log.warn("Could not start a replacement Stockfish process: {}", exception.getMessage());
                return null;
            }
        }
    }

    private StockfishProcess createProcess() throws Exception {
        StockfishProcess process = new StockfishProcess(config);
        process.start();
        return process;
    }

    private void discard(StockfishProcess process, String reason) {
        if (process == null) {
            return;
        }
        all.remove(process);
        process.close();
        restarts.incrementAndGet();
        log.warn("Discarded Stockfish process ({}); {} remaining", reason, all.size());
    }

    @Override
    @PreDestroy
    public void close() {
        for (StockfishProcess process : all) {
            process.close();
        }
        all.clear();
        available.clear();
    }
}
