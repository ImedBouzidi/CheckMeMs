package imed.moveanalysisservice.dto.response;

import imed.moveanalysisservice.model.AnalysisStatus;
import java.util.UUID;

public record SubmitAnalysisResponse(
        UUID requestId,
        UUID gameId,
        AnalysisStatus status,
        String message
) {
}
