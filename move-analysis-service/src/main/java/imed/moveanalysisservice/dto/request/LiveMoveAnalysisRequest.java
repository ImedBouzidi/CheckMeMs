package imed.moveanalysisservice.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record LiveMoveAnalysisRequest(
        @NotNull UUID gameId,
        @NotNull @Min(1) @Max(500) Integer ply,
        @NotNull @Min(1) @Max(250) Integer moveNumber,
        @NotBlank @Pattern(regexp = "white|black") String color,
        @NotBlank @Size(max = 32) String san,
        @NotBlank @Size(max = 16) String uci,
        @NotBlank @Size(max = 200) String fenBefore,
        @NotBlank @Size(max = 200) String fenAfter,
        String requester
) {
}
