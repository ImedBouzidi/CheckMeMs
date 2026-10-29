package imed.gamesservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${analysis.service.url:lb://analysis-service}")
    private String analysisServiceUrl;

    /**
     * The interceptor that turns the lb scheme into a Eureka lookup is only added to a builder
     * marked @LoadBalanced, so the builder is the bean that carries the annotation.
     */
    @Bean
    @LoadBalanced
    public WebClient.Builder analysisWebClientBuilder() {
        return WebClient.builder();
    }

    @Bean
    public WebClient analysisWebClient(@LoadBalanced WebClient.Builder builder) {
        return builder.baseUrl(analysisServiceUrl).build();
    }
}
