package imed.moveanalysisservice.engine;

/**
 * One bounded search. Only one limit kind is sent to the engine: movetime wins over nodes, and
 * nodes wins over depth, which matches the UCI recommendation not to combine them blindly.
 */
public record SearchLimits(int depth, Long nodes, Long movetimeMs, int multiPv) {

    public SearchLimits {
        if (depth <= 0 && (nodes == null || nodes <= 0) && (movetimeMs == null || movetimeMs <= 0)) {
            throw new IllegalArgumentException("At least one search limit must be positive");
        }
        if (multiPv <= 0) {
            multiPv = 1;
        }
    }

    public static SearchLimits depth(int depth) {
        return new SearchLimits(depth, null, null, 1);
    }

    public static SearchLimits movetime(long movetimeMs) {
        return new SearchLimits(0, null, movetimeMs, 1);
    }

    public static SearchLimits nodes(long nodes) {
        return new SearchLimits(0, nodes, null, 1);
    }

    public String goCommand() {
        if (movetimeMs != null && movetimeMs > 0) {
            return "go movetime " + movetimeMs;
        }
        if (nodes != null && nodes > 0) {
            return "go nodes " + nodes;
        }
        return "go depth " + depth;
    }

    public String describe() {
        String limit;
        if (movetimeMs != null && movetimeMs > 0) {
            limit = "movetime=" + movetimeMs + "ms";
        } else if (nodes != null && nodes > 0) {
            limit = "nodes=" + nodes;
        } else {
            limit = "depth=" + depth;
        }
        // multiPv 1 is the engine default, so keys for it stay short and stable.
        return limit + (multiPv > 1 ? "+multipv=" + multiPv : "");
    }
}
