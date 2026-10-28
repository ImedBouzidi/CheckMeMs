package imed.moveanalysisservice.dto.response;

import imed.moveanalysisservice.model.MoveClassification;

public record MoveAnalysisResponse(
        Integer moveNumber,
        String color,
        String san,
        String uci,
        Integer evalBeforeCp,
        Integer evalAfterCp,
        Integer evalBeforeMate,
        Integer evalAfterMate,
        String bestMoveUci,
        String bestMoveSan,
        Integer cpLoss,
        MoveClassification classification,
        String pv
) {
}
