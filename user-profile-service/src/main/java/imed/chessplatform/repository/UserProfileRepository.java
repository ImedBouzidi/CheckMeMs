package imed.chessplatform.repository;

import imed.chessplatform.model.UserProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    Optional<UserProfile> findByEmailIgnoreCase(String email);

    Optional<UserProfile> findByUsernameIgnoreCase(String username);

    Optional<UserProfile> findByKeycloakUserId(String keycloakUserId);
}
