package imed.moveanalysisservice.dto.response;

import imed.moveanalysisservice.model.AnalysisStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AnalysisResponse(
        UUID requestId,
        UUID gameId,
        String profile,
        AnalysisStatus status,
        int expectedPlies,
        int completedPlies,
        int progressPct,
        int moveCount,
        List<MoveAnalysisResponse> moves,
        AnalysisSummary summary,
        String engineName,
        String engineVersion,
        String configVersion,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime completedAt,
        String error
) {
}
