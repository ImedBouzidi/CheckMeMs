package imed.moveanalysisservice.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "analysis.live")
public class LiveAnalysisProperties {

    private boolean consumerEnabled = true;
    private long finalizeWaitMs = 5_000;
    private long finalizePollMs = 100;
    private Duration evalTtl = Duration.ofHours(2);

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

    public Duration getEvalTtl() {
        return evalTtl;
    }

    public void setEvalTtl(Duration evalTtl) {
        this.evalTtl = evalTtl == null || evalTtl.isNegative() ? Duration.ofHours(2) : evalTtl;
    }
}
