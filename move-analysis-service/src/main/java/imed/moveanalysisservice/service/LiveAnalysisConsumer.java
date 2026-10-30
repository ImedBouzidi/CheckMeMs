package imed.moveanalysisservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.config.LiveAnalysisConfig;
import imed.moveanalysisservice.dto.request.LiveMoveAnalysisRequest;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.model.MoveAnalysis;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "analysis.live.consumer-enabled", havingValue = "true", matchIfMissing = true)
public class LiveAnalysisConsumer {

    private static final Logger log = LoggerFactory.getLogger(LiveAnalysisConsumer.class);

    private final ObjectMapper objectMapper;
    private final LiveAnalysisService liveAnalysisService;
    private final AnalysisRunner runner;

    public LiveAnalysisConsumer(ObjectMapper objectMapper,
                                LiveAnalysisService liveAnalysisService,
                                AnalysisRunner runner) {
        this.objectMapper = objectMapper;
        this.liveAnalysisService = liveAnalysisService;
        this.runner = runner;
    }

    @KafkaListener(topics = LiveAnalysisConfig.TOPIC, groupId = "move-analysis-live")
    public void consume(String payload) {
        LiveMoveAnalysisRequest request;
        try {
            request = objectMapper.readValue(payload, LiveMoveAnalysisRequest.class);
        } catch (Exception exception) {
            log.error("Could not parse live analysis payload", exception);
            return;
        }

        GameAnalysis analysis = liveAnalysisService.loadOrCreate(request);
        if (analysis.getStatus() == AnalysisStatus.COMPLETED) {
            log.debug("Skipping live ply {} for already-finalized game {}", request.ply(), request.gameId());
            return;
        }

        try {
            MoveAnalysis row = runner.analyzeLiveMove(analysis, request);
            liveAnalysisService.persistCompletedPly(analysis, request, row);
        } catch (Exception exception) {
            log.error("Live move analysis failed for game {} ply {}", request.gameId(), request.ply(), exception);
            liveAnalysisService.persistFailedPly(analysis, request, exception);
        }
    }
}
