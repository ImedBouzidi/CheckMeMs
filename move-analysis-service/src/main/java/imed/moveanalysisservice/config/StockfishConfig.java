package imed.moveanalysisservice.config;

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
}
