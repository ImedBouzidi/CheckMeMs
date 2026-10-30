package imed.moveanalysisservice.config;

import imed.moveanalysisservice.engine.SearchLimits;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "stockfish")
public class StockfishConfig {

    private String path;
    private int threads = 2;
    private int hash = 256;
    private int depth = 18;
    private int multiPv = 1;

    private int poolSize = 1;
    private long borrowTimeoutMs = 2_000;
    private long searchTimeoutMs = 15_000;
    private long serverTimeoutMs = 5_000;
    private long restartBackoffMs = 1_000;

    private int quickDepth = 12;
    private Long quickMovetimeMs = 150L;
    private Long quickNodes;
    private int deepDepth = 18;
    private Long deepNodes;

    public SearchLimits gameLimits() {
        return SearchLimits.depth(depth);
    }

    public SearchLimits quickLimits() {
        if (quickMovetimeMs != null && quickMovetimeMs > 0) {
            return SearchLimits.movetime(quickMovetimeMs);
        }
        if (quickNodes != null && quickNodes > 0) {
            return SearchLimits.nodes(quickNodes);
        }
        return SearchLimits.depth(quickDepth);
    }

    public SearchLimits deepLimits() {
        if (deepNodes != null && deepNodes > 0) {
            return SearchLimits.nodes(deepNodes);
        }
        return SearchLimits.depth(deepDepth);
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public int getThreads() {
        return threads;
    }

    public void setThreads(int threads) {
        this.threads = threads;
    }

    public int getHash() {
        return hash;
    }

    public void setHash(int hash) {
        this.hash = hash;
    }

    public int getDepth() {
        return depth;
    }

    public void setDepth(int depth) {
        this.depth = depth;
    }

    public int getMultiPv() {
        return multiPv;
    }

    public void setMultiPv(int multiPv) {
        this.multiPv = multiPv;
    }

    public int getPoolSize() {
        return poolSize;
    }

    public void setPoolSize(int poolSize) {
        this.poolSize = poolSize;
    }

    public long getBorrowTimeoutMs() {
        return borrowTimeoutMs;
    }

    public void setBorrowTimeoutMs(long borrowTimeoutMs) {
        this.borrowTimeoutMs = borrowTimeoutMs;
    }

    public long getSearchTimeoutMs() {
        return searchTimeoutMs;
    }

    public void setSearchTimeoutMs(long searchTimeoutMs) {
        this.searchTimeoutMs = searchTimeoutMs;
    }

    public long getServerTimeoutMs() {
        return serverTimeoutMs;
    }

    public void setServerTimeoutMs(long serverTimeoutMs) {
        this.serverTimeoutMs = serverTimeoutMs;
    }

    public long getRestartBackoffMs() {
        return restartBackoffMs;
    }

    public void setRestartBackoffMs(long restartBackoffMs) {
        this.restartBackoffMs = restartBackoffMs;
    }

    public int getQuickDepth() {
        return quickDepth;
    }

    public void setQuickDepth(int quickDepth) {
        this.quickDepth = quickDepth;
    }

    public Long getQuickMovetimeMs() {
        return quickMovetimeMs;
    }

    public void setQuickMovetimeMs(Long quickMovetimeMs) {
        this.quickMovetimeMs = quickMovetimeMs;
    }

    public Long getQuickNodes() {
        return quickNodes;
    }

    public void setQuickNodes(Long quickNodes) {
        this.quickNodes = quickNodes;
    }

    public int getDeepDepth() {
        return deepDepth;
    }

    public void setDeepDepth(int deepDepth) {
        this.deepDepth = deepDepth;
    }

    public Long getDeepNodes() {
        return deepNodes;
    }

    public void setDeepNodes(Long deepNodes) {
        this.deepNodes = deepNodes;
    }
}
