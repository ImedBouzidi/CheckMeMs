package imed.gamesservice.dto.request;

import imed.gamesservice.model.GameMode;
import imed.gamesservice.model.GameResult;
import imed.gamesservice.model.GameStatus;
import jakarta.validation.constraints.NotBlank;

public record CreateGameRequest(
        @NotBlank(message = "pgn is required") String pgn,
        String fen,
        String whitePlayerId,
        String blackPlayerId,
        GameResult result,
        GameStatus status,
        GameMode mode,
        String timeControl,
        String metadata,
        Boolean submitForAnalysis
) {
}
