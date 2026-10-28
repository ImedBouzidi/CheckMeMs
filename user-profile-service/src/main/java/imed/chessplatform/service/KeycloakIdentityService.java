package imed.chessplatform.service;

import imed.chessplatform.KeycloakProperties;
import imed.chessplatform.dto.AuthResponse;
import imed.chessplatform.dto.RegisterRequest;
import imed.chessplatform.exception.InvalidCredentialsException;
import imed.chessplatform.exception.KeycloakOperationException;
import javax.ws.rs.core.Response;
import java.util.List;
import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class KeycloakIdentityService {

    private static final String IDENTITY_LOGIN_FAILURE = "Unable to sign in through the identity provider";

    private final Keycloak keycloak;
    private final KeycloakProperties properties;
    private final RestClient restClient;

    public KeycloakIdentityService(Keycloak keycloak, KeycloakProperties properties) {
        this.keycloak = keycloak;
        this.properties = properties;
        this.restClient = RestClient.builder().baseUrl(properties.serverUrl()).build();
    }

    public String register(RegisterRequest request) {
        UserRepresentation user = new UserRepresentation();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEnabled(true);
        user.setEmailVerified(false);

        CredentialRepresentation password = new CredentialRepresentation();
        password.setType(CredentialRepresentation.PASSWORD);
        password.setValue(request.password());
        password.setTemporary(false);
        user.setCredentials(List.of(password));

        UsersResource users = keycloak.realm(properties.realm()).users();
        try (Response response = users.create(user)) {
            if (response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
                throw new KeycloakOperationException(
                        "Keycloak rejected user registration with status " + response.getStatus());
            }
            String location = response.getHeaderString("Location");
            if (location == null || location.isBlank()) {
                throw new KeycloakOperationException("Keycloak did not return the new user identifier");
            }
            return location.substring(location.lastIndexOf('/') + 1);
        } catch (KeycloakOperationException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new KeycloakOperationException("Unable to register user with Keycloak", exception);
        }
    }

    public AuthResponse login(String username, String password) {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", OAuth2Constants.PASSWORD);
        form.add("client_id", properties.loginClientId());
        form.add("username", username);
        form.add("password", password);
        try {
            TokenResponse response = restClient.post()
                    .uri("/realms/{realm}/protocol/openid-connect/token", properties.realm())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(TokenResponse.class);
            if (response == null) {
                throw new KeycloakOperationException("Keycloak returned an empty login response");
            }
            return new AuthResponse(response.accessToken(), response.refreshToken(), response.expiresIn(),
                    response.refreshExpiresIn(), response.tokenType());
        } catch (KeycloakOperationException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new InvalidCredentialsException();
            }
            throw new KeycloakOperationException(IDENTITY_LOGIN_FAILURE, exception);
        } catch (RuntimeException exception) {
            throw new KeycloakOperationException(IDENTITY_LOGIN_FAILURE, exception);
        }
    }

    private record TokenResponse(
            @JsonProperty("access_token")
            String accessToken,
            @JsonProperty("refresh_token")
            String refreshToken,
            @JsonProperty("expires_in")
            long expiresIn,
            @JsonProperty("refresh_expires_in")
            long refreshExpiresIn,
            @JsonProperty("token_type")
            String tokenType
    ) {
    }
}
