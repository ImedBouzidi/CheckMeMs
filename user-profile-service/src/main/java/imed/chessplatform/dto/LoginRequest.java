package imed.chessplatform.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @Size(max = 320) String email,
        @Size(max = 100) String username,
        @NotBlank String password
) {

    @AssertTrue(message = "Provide either email or username")
    public boolean isIdentifierPresent() {
        return (email != null && !email.isBlank()) || (username != null && !username.isBlank());
    }
}
