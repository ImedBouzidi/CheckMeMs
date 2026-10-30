package imed.moveanalysisservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.config.LiveAnalysisProperties;
import imed.moveanalysisservice.engine.EngineEvaluation;
import imed.moveanalysisservice.engine.SearchLimits;
import imed.moveanalysisservice.metrics.AnalysisMetrics;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Shared Stockfish results keyed by FEN and search limits. Redis is the cross-replica store;
 * an in-process map covers tests and a broker outage so live analysis still reuses consecutive plies.
 * The local map is a bounded LRU: consecutive plies resolve to the same FEN in the horizon of the cap.
 */
@Component
public class EvalCache {

    private static final Logger log = LoggerFactory.getLogger(EvalCache.class);

    /** Capacity of the in-process fallback; Redis TTL is the only limit on the shared store. */
    private static final int MAX_LOCAL_ENTRIES = 10_000;

    private final ObjectMapper objectMapper;
    private final LiveAnalysisProperties properties;
    private final AnalysisMetrics analysisMetrics;
    private final StringRedisTemplate redis;
    private final Map<String, EngineEvaluation> local;
    private final ConcurrentHashMap<String, Integer> liveProgress = new ConcurrentHashMap<>();

    public EvalCache(ObjectMapper objectMapper,
                     LiveAnalysisProperties properties,
                     AnalysisMetrics analysisMetrics,
                     ObjectProvider<StringRedisTemplate> redis) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.analysisMetrics = analysisMetrics;
        this.local = Collections.synchronizedMap(new LinkedHashMap<>(64, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, EngineEvaluation> eldest) {
                return size() > MAX_LOCAL_ENTRIES;
            }
        });
        this.redis = redis.getIfAvailable();
    }

    public EngineEvaluation get(String fen, SearchLimits limits) {
        String key = evalKey(fen, limits);
        EngineEvaluation cached;
        synchronized (local) {
            cached = local.get(key);
        }
        if (cached != null) {
            analysisMetrics.recordCacheHit();
            return cached;
        }
        if (redis == null) {
            return null;
        }
        try {
            String json = redis.opsForValue().get(key);
            if (json == null || json.isBlank()) {
                return null;
            }
            EngineEvaluation evaluation = objectMapper.readValue(json, EngineEvaluation.class);
            synchronized (local) {
                local.put(key, evaluation);
            }
            analysisMetrics.recordCacheHit();
            return evaluation;
        } catch (Exception exception) {
            log.debug("Redis eval get failed for {}: {}", key, exception.getMessage());
            return null;
        }
    }

    public void put(String fen, SearchLimits limits, EngineEvaluation evaluation) {
        if (evaluation == null) {
            return;
        }
        String key = evalKey(fen, limits);
        synchronized (local) {
            local.put(key, evaluation);
        }
        if (redis == null) {
            return;
        }
        try {
            Duration ttl = properties.getEvalTtl();
            redis.opsForValue().set(key, objectMapper.writeValueAsString(evaluation), ttl);
        } catch (Exception exception) {
            log.debug("Redis eval put failed for {}: {}", key, exception.getMessage());
        }
    }

    public void recordLiveProgress(java.util.UUID gameId, int completedPly) {
        if (gameId == null) {
            return;
        }
        String key = progressKey(gameId);
        liveProgress.merge(key, completedPly, Math::max);
        if (redis == null) {
            return;
        }
        try {
            redis.opsForValue().set(key, Integer.toString(completedPly), properties.getEvalTtl());
        } catch (Exception exception) {
            log.debug("Redis live progress put failed for {}: {}", key, exception.getMessage());
        }
    }

    public int liveProgress(java.util.UUID gameId) {
        if (gameId == null) {
            return 0;
        }
        String key = progressKey(gameId);
        Integer localValue = liveProgress.get(key);
        int best = localValue == null ? 0 : localValue;
        if (redis == null) {
            return best;
        }
        try {
            String raw = redis.opsForValue().get(key);
            if (raw != null) {
                best = Math.max(best, Integer.parseInt(raw));
            }
        } catch (Exception exception) {
            log.debug("Redis live progress get failed for {}: {}", key, exception.getMessage());
        }
        return best;
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
