package imed.gamesservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${analysis.service.url:http://localhost:8082}")
    private String analysisServiceUrl;

    @Bean
    public WebClient analysisWebClient() {
        return WebClient.builder()
                .baseUrl(analysisServiceUrl)
                .build();
    }
}
