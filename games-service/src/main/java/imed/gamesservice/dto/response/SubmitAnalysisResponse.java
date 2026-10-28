package imed.gamesservice.dto.response;

import imed.gamesservice.model.AnalysisStatus;
import java.util.UUID;

public record SubmitAnalysisResponse(
        UUID gameId,
        Boolean submittedForAnalysis,
        AnalysisStatus analysisStatus,
        String analysisRequestId,
        String message
) {
}
