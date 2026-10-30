package imed.moveanalysisservice.engine;

/**
 * Immutable result of one UCI search. {@code cp} and {@code mate} are side-to-move relative, as
 * reported by Stockfish; callers must normalize to White's perspective before grading.
 */
public record EngineEvaluation(
        Integer cp,
        Integer mate,
        String bestMove,
        String pv,
        int depth,
        Integer seldepth,
        long nodes,
        long elapsedMs,
        int multipv,
        String engineName,
        String engineVersion,
        boolean bounded
) {
    public boolean hasScore() {
        return cp != null || mate != null;
    }

    public static EngineEvaluation empty(String engineName, String engineVersion, long elapsedMs) {
        return new EngineEvaluation(null, null, null, null, 0, null, 0, elapsedMs, 1,
                engineName, engineVersion, false);
    }
}
