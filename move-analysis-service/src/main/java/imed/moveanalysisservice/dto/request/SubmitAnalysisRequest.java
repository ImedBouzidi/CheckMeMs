package imed.moveanalysisservice.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SubmitAnalysisRequest(
        @Pattern(
                regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
                message = "gameId must be a UUID")
        String gameId,
        @Size(max = 1_000_000, message = "pgn is too large") String pgn,
        @Size(max = 200, message = "fen is too large") String fen,
        @Size(max = 128) String whitePlayerId,
        @Size(max = 128) String blackPlayerId,
        @Size(max = 32) String result,
        @Size(max = 20_000) String metadata
) {
}
