package imed.moveanalysisservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class LiveAnalysisConfig {
    public static final String TOPIC = "chess.analysis.live-moves";
}
