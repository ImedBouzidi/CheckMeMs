package imed.moveanalysisservice.config;

import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    /**
     * Worker threads are bounded by the engine pool: there is no point running more analyses than
     * there are Stockfish processes. The queue absorbs short bursts; a full queue is rejected and
     * the caller puts the job back instead of growing the JVM heap.
     */
    @Bean(name = "analysisWorkerExecutor")
    public TaskExecutor analysisWorkerExecutor(AnalysisWorkerProperties workerProperties,
                                               StockfishConfig stockfishConfig) {
        int concurrency = Math.max(1, Math.min(workerProperties.getConcurrency(), stockfishConfig.getPoolSize()));
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(concurrency);
        executor.setMaxPoolSize(concurrency);
        executor.setQueueCapacity(Math.max(1, concurrency * 2));
        executor.setThreadNamePrefix("analysis-worker-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
