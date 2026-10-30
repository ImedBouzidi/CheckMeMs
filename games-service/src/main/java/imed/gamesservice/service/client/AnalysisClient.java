package imed.gamesservice.service.client;

import imed.gamesservice.model.Game;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class AnalysisClient {

    private static final Logger log = LoggerFactory.getLogger(AnalysisClient.class);

    private final WebClient webClient;

    @Value("${analysis.service.submit-path:/api/analysis/games}")
    private String submitPath;

    /**
     * Analysis must never hold up gameplay: a slow or unreachable service is abandoned after this
     * budget and the game is still persisted with analysis marked as failed.
     */
    @Value("${analysis.service.timeout-ms:2000}")
    private long timeoutMs;

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

            String authorization = currentAuthorization();
            WebClient.RequestBodySpec request = webClient.post()
                    .uri(submitPath)
                    .contentType(MediaType.APPLICATION_JSON);
            if (authorization != null && !authorization.isBlank()) {
                request = request.header(HttpHeaders.AUTHORIZATION, authorization);
            }

            Map response = request.bodyValue(payload)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), clientResponse -> {
                        log.warn("Analysis service returned {} for game {}", clientResponse.statusCode(), game.getId());
                        return Mono.error(new IllegalStateException("Analysis service returned " + clientResponse.statusCode()));
                    })
                    .bodyToMono(Map.class)
                    .block(Duration.ofMillis(timeoutMs));

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

    /**
     * analysis-service is a protected resource, so the caller's token has to travel with the
     * service-to-service call; without it the submission is rejected as anonymous.
     */
    private String currentAuthorization() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            return servletAttributes.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
        }
        return null;
    }
}
