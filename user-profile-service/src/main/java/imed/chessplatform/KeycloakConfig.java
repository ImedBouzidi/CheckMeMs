package imed.chessplatform;

import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeycloakConfig {

    @Bean
    Keycloak keycloakAdminClient(KeycloakProperties properties) {
        String serverUrl = properties.serverUrl();
        String realm = properties.realm();
        String clientId = properties.clientId();
        String clientSecret = properties.clientSecret();
        if (serverUrl == null || realm == null || clientId == null || clientSecret == null || clientSecret.isBlank()) {
            throw new IllegalStateException("Keycloak admin client configuration missing: serverUrl/realm/clientId/clientSecret required");
        }
        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm(realm)
                .grantType(OAuth2Constants.CLIENT_CREDENTIALS)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .build();
    }
}
