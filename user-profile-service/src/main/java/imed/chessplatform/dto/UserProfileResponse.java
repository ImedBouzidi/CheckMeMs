package imed.chessplatform.dto;

import imed.chessplatform.model.UserProfile;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String keycloakUserId,
        String email,
        String username,
        String firstName,
        String lastName
) {
    public static UserProfileResponse from(UserProfile profile) {
        return new UserProfileResponse(
                profile.getId(),
                profile.getKeycloakUserId(),
                profile.getEmail(),
                profile.getUsername(),
                profile.getFirstName(),
                profile.getLastName());
    }
}
