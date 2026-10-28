package imed.gamesservice.service.client;

import imed.gamesservice.model.Game;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class AnalysisClient {

    private static final Logger log = LoggerFactory.getLogger(AnalysisClient.class);

    private final WebClient webClient;

    @Value("${analysis.service.submit-path:/api/analysis/games}")
    private String submitPath;

    public AnalysisClient(WebClient analysisWebClient) {
        this.webClient = analysisWebClient;
    }

    public String submitGame(Game game) {
        try {
            Map<String, Object> payload = Map.of(
                    "gameId", game.getId() != null ? game.getId().toString() : UUID.randomUUID().toString(),
                    "pgn", game.getPgn() != null ? game.getPgn() : "",
                    "fen", game.getFen() != null ? game.getFen() : "",
                    "whitePlayerId", game.getWhitePlayerId() != null ? game.getWhitePlayerId() : "",
                    "blackPlayerId", game.getBlackPlayerId() != null ? game.getBlackPlayerId() : "",
                    "result", game.getResult() != null ? game.getResult().name() : "UNKNOWN",
                    "metadata", game.getMetadata() != null ? game.getMetadata() : "{}"
            );

            Map response = webClient.post()
                    .uri(submitPath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), clientResponse -> {
                        log.warn("Analysis service returned error status: {}", clientResponse.statusCode());
                        return Mono.error(new RuntimeException("Analysis service error"));
                    })
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.get("requestId") != null) {
                return response.get("requestId").toString();
            }
            if (response != null && response.get("id") != null) {
                return response.get("id").toString();
            }
            if (response != null && response.get("analysisRequestId") != null) {
                return response.get("analysisRequestId").toString();
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to submit game to analysis service", e);
            throw e;
        }
    }
}
