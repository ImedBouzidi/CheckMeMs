package imed.chessplatform;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "keycloak")
public record KeycloakProperties(
        String serverUrl,
        String authServerUrl,
        String realm,
        String clientId,
        String resource,
        String clientSecret,
        String loginClientId,
        Admin admin,
        Client client
) {
    public String serverUrl() {
        if (serverUrl != null && !serverUrl.isBlank()) {
            return serverUrl;
        }
        if (authServerUrl != null && !authServerUrl.isBlank()) {
            return authServerUrl;
        }
        return null;
    }

    public String clientId() {
        if (clientId != null && !clientId.isBlank()) {
            return clientId;
        }
        if (resource != null && !resource.isBlank()) {
            return resource;
        }
        if (admin != null && admin.clientId() != null && !admin.clientId().isBlank()) {
            return admin.clientId();
        }
        return null;
    }

    /**
     * Client used for the resource-owner credential grant at login, which is the browser-facing
     * public client rather than the confidential one used for admin calls.
     */
    public String loginClientId() {
        return loginClientId != null && !loginClientId.isBlank() ? loginClientId : "chess-web";
    }

    public String clientSecret() {
        if (clientSecret != null && !clientSecret.isBlank()) {
            return clientSecret;
        }
        if (client != null && client.secret() != null && !client.secret().isBlank()) {
            return client.secret();
        }
        return null;
    }

    public record Admin(String clientId, String username, String password) {
    }

    public record Client(String secret) {
    }
}
