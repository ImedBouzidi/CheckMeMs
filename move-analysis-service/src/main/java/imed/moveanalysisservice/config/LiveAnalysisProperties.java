package imed.moveanalysisservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "analysis.live")
public class LiveAnalysisProperties {

    private boolean consumerEnabled = true;
    private long finalizeWaitMs = 5_000;
    private long finalizePollMs = 100;

    public boolean isConsumerEnabled() {
        return consumerEnabled;
    }

    public void setConsumerEnabled(boolean consumerEnabled) {
        this.consumerEnabled = consumerEnabled;
    }

    public long getFinalizeWaitMs() {
        return finalizeWaitMs;
    }

    public void setFinalizeWaitMs(long finalizeWaitMs) {
        this.finalizeWaitMs = finalizeWaitMs;
    }

    public long getFinalizePollMs() {
        return finalizePollMs;
    }

    public void setFinalizePollMs(long finalizePollMs) {
        this.finalizePollMs = finalizePollMs;
    }
}
