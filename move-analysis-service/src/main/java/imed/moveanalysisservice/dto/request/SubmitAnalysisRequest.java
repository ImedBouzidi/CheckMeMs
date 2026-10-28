package imed.moveanalysisservice.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SubmitAnalysisRequest(
        String gameId,
        @NotBlank(message = "pgn is required") String pgn,
        String fen,
        String whitePlayerId,
        String blackPlayerId,
        String result,
        String metadata
) {
}
