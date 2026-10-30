package imed.moveanalysisservice.dto.response;

import java.util.Map;

public record AnalysisSummary(
        int moves,
        int depth,
        Map<String, Integer> classifications,
        double averageCpLoss,
        Map<String, PlayerSummary> players
) {
    public record PlayerSummary(int moves, long totalCpLoss, double averageCpLoss) {
    }
}
