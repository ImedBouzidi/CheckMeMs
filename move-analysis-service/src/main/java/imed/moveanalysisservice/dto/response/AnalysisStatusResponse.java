package imed.moveanalysisservice.dto.response;

import imed.moveanalysisservice.model.AnalysisStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AnalysisStatusResponse(
        UUID requestId,
        UUID gameId,
        AnalysisStatus status,
        int expectedPlies,
        int completedPlies,
        int progressPct,
        String error,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime completedAt
) {
}
