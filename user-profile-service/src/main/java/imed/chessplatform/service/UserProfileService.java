package imed.chessplatform.service;

import imed.chessplatform.dto.AuthResponse;
import imed.chessplatform.dto.LoginRequest;
import imed.chessplatform.dto.RegisterRequest;
import imed.chessplatform.dto.UserProfileResponse;
import imed.chessplatform.exception.AccountNotFoundException;
import imed.chessplatform.exception.EmailAlreadyExistsException;
import imed.chessplatform.exception.UsernameAlreadyExistsException;
import imed.chessplatform.model.UserProfile;
import imed.chessplatform.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final UserProfileRepository repository;
    private final KeycloakIdentityService keycloakIdentityService;

    public UserProfileService(UserProfileRepository repository, KeycloakIdentityService keycloakIdentityService) {
        this.repository = repository;
        this.keycloakIdentityService = keycloakIdentityService;
    }

    @Transactional
    public UserProfileResponse register(RegisterRequest request) {
        if (repository.existsByEmailIgnoreCase(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }
        if (repository.existsByUsernameIgnoreCase(request.username())) {
            throw new UsernameAlreadyExistsException(request.username());
        }

        String keycloakUserId = keycloakIdentityService.register(request);
        UserProfile profile = repository.save(new UserProfile(
                keycloakUserId,
                request.email(),
                request.username(),
                request.firstName(),
                request.lastName()));
        return UserProfileResponse.from(profile);
    }

    public AuthResponse login(LoginRequest request) {
        return keycloakIdentityService.login(resolveLoginIdentifier(request), request.password());
    }

    /**
     * The chess-platform realm has registrationEmailAsUsername enabled, so Keycloak replaces the
     * application username with the email and only the email authenticates. Postgres still decides
     * whether the account exists.
     */
    private String resolveLoginIdentifier(LoginRequest request) {
        String email = request.email();
        UserProfile profile;
        if (email != null && !email.isBlank()) {
            profile = repository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new AccountNotFoundException(email));
        } else {
            profile = repository.findByUsernameIgnoreCase(request.username())
                    .orElseThrow(() -> new AccountNotFoundException(request.username()));
        }
        return profile.getEmail();
    }
}
