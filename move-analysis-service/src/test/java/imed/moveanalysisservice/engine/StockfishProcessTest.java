package imed.moveanalysisservice.engine;

import static org.assertj.core.api.Assertions.assertThat;

import imed.moveanalysisservice.chess.ChessBoard;
import imed.moveanalysisservice.config.StockfishConfig;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/**
 * Talks to the real Stockfish binary. Skipped automatically when the binary is not available, so
 * the unit suite still runs on machines without an engine.
 */
@Tag("engine")
class StockfishProcessTest {

    private static final String DEFAULT_PATH = "../stockfish/stockfish-linux-x86-64-universal";

    @Test
    void startsSearchesAndReportsEngineIdentity() throws Exception {
        String path = enginePath();
        Assumptions.assumeTrue(Files.isExecutable(Path.of(path)), "Stockfish binary not found at " + path);

        StockfishConfig config = config(path);
        try (StockfishProcess process = new StockfishProcess(config)) {
            process.start();
            process.newGame();

            EngineEvaluation evaluation = process.search(ChessBoard.START_FEN, SearchLimits.depth(6));

            assertThat(evaluation.bestMove()).isNotBlank();
            assertThat(evaluation.hasScore()).isTrue();
            assertThat(evaluation.depth()).isGreaterThanOrEqualTo(6);
            assertThat(evaluation.engineName()).isEqualTo("Stockfish");
            assertThat(evaluation.engineVersion()).isNotBlank();
            assertThat(evaluation.elapsedMs()).isPositive();
        }
    }

    @Test
    void canBeRestartedForTheNextJob() throws Exception {
        String path = enginePath();
        Assumptions.assumeTrue(Files.isExecutable(Path.of(path)), "Stockfish binary not found at " + path);

        StockfishConfig config = config(path);
        StockfishProcess first = new StockfishProcess(config);
        first.start();
        first.search(ChessBoard.START_FEN, SearchLimits.depth(4));
        first.close();
        assertThat(first.isAlive()).isFalse();

        try (StockfishProcess second = new StockfishProcess(config)) {
            second.start();
            EngineEvaluation evaluation = second.search(
                    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
                    SearchLimits.depth(4));
            assertThat(evaluation.bestMove()).isNotBlank();
        }
    }

    private StockfishConfig config(String path) {
        StockfishConfig config = new StockfishConfig();
        config.setPath(path);
        config.setThreads(1);
        config.setHash(16);
        config.setMultiPv(1);
        config.setSearchTimeoutMs(10_000);
        config.setServerTimeoutMs(5_000);
        return config;
    }

    private String enginePath() {
        String fromEnvironment = System.getenv("STOCKFISH_PATH");
        return fromEnvironment == null || fromEnvironment.isBlank() ? DEFAULT_PATH : fromEnvironment;
    }
}
