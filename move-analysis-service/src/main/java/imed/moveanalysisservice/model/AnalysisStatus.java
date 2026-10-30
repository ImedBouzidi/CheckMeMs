package imed.moveanalysisservice.model;

public enum AnalysisStatus {
    PENDING,
    PROCESSING,
    PARTIAL,
    COMPLETED,
    FAILED;

    public boolean isTerminal() {
        return this == COMPLETED || this == FAILED;
    }
}
