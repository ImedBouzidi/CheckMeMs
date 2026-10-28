package imed.gamesservice.dto.response;

import imed.gamesservice.model.AnalysisStatus;
import imed.gamesservice.model.GameMode;
import imed.gamesservice.model.GameResult;
import imed.gamesservice.model.GameStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record GameResponse(
        UUID id,
        String whitePlayerId,
        String blackPlayerId,
        String ownerId,
        String pgn,
        String fen,
        GameResult result,
        GameStatus status,
        GameMode mode,
        String timeControl,
        String metadata,
        Boolean submittedForAnalysis,
        AnalysisStatus analysisStatus,
        String analysisRequestId,
        OffsetDateTime startedAt,
        OffsetDateTime endedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
