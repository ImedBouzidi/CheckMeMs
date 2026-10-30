package imed.moveanalysisservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "analysis.worker")
public class AnalysisWorkerProperties {

    private boolean enabled = true;
    private int concurrency = 1;
    private long pollIntervalMs = 500;
    private long leaseSeconds = 120;
    private int maxAttempts = 3;
    private long retryBackoffSeconds = 10;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getConcurrency() {
        return concurrency;
    }

    public void setConcurrency(int concurrency) {
        this.concurrency = concurrency;
    }

    public long getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }

    public long getLeaseSeconds() {
        return leaseSeconds;
    }

    public void setLeaseSeconds(long leaseSeconds) {
        this.leaseSeconds = leaseSeconds;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public long getRetryBackoffSeconds() {
        return retryBackoffSeconds;
    }

    public void setRetryBackoffSeconds(long retryBackoffSeconds) {
        this.retryBackoffSeconds = retryBackoffSeconds;
    }
}
