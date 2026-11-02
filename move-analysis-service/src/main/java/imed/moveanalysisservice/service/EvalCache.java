package imed.moveanalysisservice.service;

import imed.moveanalysisservice.engine.EngineEvaluation;
import imed.moveanalysisservice.engine.SearchLimits;
import imed.moveanalysisservice.metrics.AnalysisMetrics;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Stockfish results keyed by FEN and search limits, kept in a bounded in-process LRU so
 * consecutive plies reuse the same evaluation. The map lives for the lifetime of the service.
 */
@Component
public class EvalCache {

    /** Capacity of the in-process cache. */
    private static final int MAX_LOCAL_ENTRIES = 10_000;

    private final AnalysisMetrics analysisMetrics;
    private final Map<String, EngineEvaluation> local;
    private final ConcurrentHashMap<String, Integer> liveProgress = new ConcurrentHashMap<>();

    public EvalCache(AnalysisMetrics analysisMetrics) {
        this.analysisMetrics = analysisMetrics;
        this.local = Collections.synchronizedMap(new LinkedHashMap<>(64, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, EngineEvaluation> eldest) {
                return size() > MAX_LOCAL_ENTRIES;
            }
        });
    }

    public EngineEvaluation get(String fen, SearchLimits limits) {
        String key = evalKey(fen, limits);
        EngineEvaluation cached;
        synchronized (local) {
            cached = local.get(key);
        }
        if (cached != null) {
            analysisMetrics.recordCacheHit();
        }
        return cached;
    }

    public void put(String fen, SearchLimits limits, EngineEvaluation evaluation) {
        if (evaluation == null) {
            return;
        }
        String key = evalKey(fen, limits);
        synchronized (local) {
            local.put(key, evaluation);
        }
    }

    public void recordLiveProgress(java.util.UUID gameId, int completedPly) {
        if (gameId == null) {
            return;
        }
        liveProgress.merge(progressKey(gameId), completedPly, Math::max);
    }

    public int liveProgress(java.util.UUID gameId) {
        if (gameId == null) {
            return 0;
        }
        Integer localValue = liveProgress.get(progressKey(gameId));
        return localValue == null ? 0 : localValue;
    }

    Map<String, EngineEvaluation> localView() {
        return local;
    }

    private static String evalKey(String fen, SearchLimits limits) {
        return "analysis:eval:" + limits.describe() + ":" + fen;
    }

    private static String progressKey(java.util.UUID gameId) {
        return "analysis:live:" + gameId;
    }
}
