package imed.moveanalysisservice.dto.response;

import imed.moveanalysisservice.model.AnalysisStatus;
import java.util.List;
import java.util.UUID;

public record AnalysisResponse(
        UUID requestId,
        UUID gameId,
        AnalysisStatus status,
        Integer moveCount,
        List<MoveAnalysisResponse> moves,
        String summary
) {
}
