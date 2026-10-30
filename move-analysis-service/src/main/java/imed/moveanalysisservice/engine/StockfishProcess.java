package imed.moveanalysisservice.engine;

import imed.moveanalysisservice.config.StockfishConfig;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * One persistent Stockfish UCI process. A process handles exactly one search at a time; the pool
 * owns exclusivity. All reads are serialized through a single queue so a timed-out search can be
 * stopped and drained without desynchronizing the protocol.
 */
public class StockfishProcess implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(StockfishProcess.class);

    private static final Pattern ID_NAME = Pattern.compile("^id name\\s+(.+)$");
    private static final Pattern INFO_DEPTH = Pattern.compile("\\bdepth (\\d+)");
    private static final Pattern INFO_SELDEPTH = Pattern.compile("\\bseldepth (\\d+)");
    private static final Pattern INFO_MULTIPV = Pattern.compile("\\bmultipv (\\d+)");
    private static final Pattern INFO_NODES = Pattern.compile("\\bnodes (\\d+)");
    private static final Pattern INFO_SCORE_CP = Pattern.compile("\\bscore cp (-?\\d+)");
    private static final Pattern INFO_SCORE_MATE = Pattern.compile("\\bscore mate (-?\\d+)");
    private static final Pattern INFO_PV = Pattern.compile("\\bpv (.+)$");
    private static final Pattern INFO_BOUND = Pattern.compile("\\b(lowerbound|upperbound)\\b");

    private final StockfishConfig config;
    private final BlockingQueue<String> outputQueue = new LinkedBlockingQueue<>();

    private volatile Process process;
    private volatile BufferedWriter writer;
    private volatile Thread readerThread;
    private volatile Thread errorThread;
    private volatile boolean alive;
    private volatile String engineName = "Stockfish";
    private volatile String engineVersion = "unknown";

    public StockfishProcess(StockfishConfig config) {
        this.config = config;
    }

    public synchronized void start() throws IOException {
        if (isAlive()) {
            return;
        }
        String path = config.getPath();
        if (path == null || path.isBlank()) {
            path = "stockfish";
        }
        ProcessBuilder builder = new ProcessBuilder(path);
        builder.redirectErrorStream(false);
        process = builder.start();
        writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
        BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8));
        alive = true;
        outputQueue.clear();

        readerThread = new Thread(() -> pump(reader), "stockfish-stdout");
        readerThread.setDaemon(true);
        readerThread.start();

        errorThread = new Thread(() -> drainErrors(errorReader), "stockfish-stderr");
        errorThread.setDaemon(true);
        errorThread.start();

        sendCommand("uci");
        boolean identified = waitFor(line -> {
            Matcher matcher = ID_NAME.matcher(line);
            if (matcher.matches()) {
                rememberName(matcher.group(1));
            }
            return "uciok".equals(line);
        }, serverTimeout());
        if (!identified) {
            close();
            throw new IOException("Stockfish did not answer uciok within " + serverTimeout() + "ms");
        }

        if (config.getThreads() > 0) {
            sendCommand("setoption name Threads value " + config.getThreads());
        }
        if (config.getHash() > 0) {
            sendCommand("setoption name Hash value " + config.getHash());
        }
        if (config.getMultiPv() > 0) {
            sendCommand("setoption name MultiPV value " + config.getMultiPv());
        }
        synchronizeEngine();
        log.info("Stockfish process started: {} {}", engineName, engineVersion);
    }

    private void rememberName(String rawName) {
        String value = rawName.trim();
        if (value.regionMatches(true, 0, "Stockfish", 0, "Stockfish".length())) {
            engineName = "Stockfish";
            String version = value.substring("Stockfish".length()).trim();
            engineVersion = version.isEmpty() ? "unknown" : version;
        } else {
            engineName = value;
            engineVersion = value;
        }
    }

    private void pump(BufferedReader reader) {
        try {
            String line;
            while ((line = reader.readLine()) != null) {
                outputQueue.offer(line);
            }
        } catch (IOException exception) {
            if (alive) {
                log.warn("Stockfish stdout ended unexpectedly: {}", exception.getMessage());
            }
        } finally {
            alive = false;
        }
    }

    private void drainErrors(BufferedReader reader) {
        try {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank()) {
                    log.debug("Stockfish stderr: {}", line);
                }
            }
        } catch (IOException ignored) {
        }
    }

    private void sendCommand(String command) throws IOException {
        BufferedWriter current = writer;
        if (current == null) {
            throw new IOException("Stockfish process is not running");
        }
        current.write(command);
        current.newLine();
        current.flush();
    }

    private boolean waitFor(String expected, long timeoutMs) throws IOException {
        return waitFor(expected::equals, timeoutMs);
    }

    private boolean waitFor(Predicate<String> matcher, long timeoutMs) throws IOException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (!alive && process != null && !process.isAlive()) {
                throw new IOException("Stockfish process exited while waiting for a response");
            }
            String line = poll(100);
            if (line == null) {
                continue;
            }
            if (matcher.test(line)) {
                return true;
            }
        }
        return false;
    }

    private String poll(long timeoutMs) {
        try {
            return outputQueue.poll(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    /**
     * Drain any output left by a previous command and wait for readyok. This is the barrier that
     * makes the next position/go pair safe even after a timeout or a stop.
     */
    public synchronized void synchronizeEngine() throws IOException {
        outputQueue.clear();
        sendCommand("isready");
        if (!waitFor("readyok", serverTimeout())) {
            throw new IOException("Stockfish did not answer readyok within " + serverTimeout() + "ms");
        }
    }

    public synchronized void newGame() throws IOException {
        ensureAlive();
        sendCommand("ucinewgame");
        synchronizeEngine();
    }

    public synchronized EngineEvaluation search(String fen, SearchLimits limits) throws IOException {
        ensureAlive();
        long startedNanos = System.nanoTime();
        synchronizeEngine();
        sendCommand("position fen " + fen);
        sendCommand(limits.goCommand());

        SearchState state = new SearchState();
        boolean finished = false;
        long deadline = System.currentTimeMillis() + searchTimeout();
        while (System.currentTimeMillis() < deadline) {
            String line = poll(100);
            if (line == null) {
                if (!alive && process != null && !process.isAlive()) {
                    throw new IOException("Stockfish exited during search of " + fen);
                }
                continue;
            }
            if (line.startsWith("info ")) {
                state.acceptInfo(line);
            } else if (line.startsWith("bestmove")) {
                state.acceptBestMove(line);
                finished = true;
                break;
            }
        }

        if (!finished) {
            boolean stopped = stopAndDrain(state);
            if (!stopped) {
                alive = false;
                throw new IOException("Stockfish did not stop within the timeout for " + fen);
            }
            log.warn("Stockfish search timed out after {}ms; kept the best result seen so far",
                    searchTimeout());
        }

        try {
            synchronizeEngine();
        } catch (IOException exception) {
            alive = false;
            throw exception;
        }

        long elapsedMs = (System.nanoTime() - startedNanos) / 1_000_000L;
        return state.toEvaluation(engineName, engineVersion, elapsedMs);
    }

    private boolean stopAndDrain(SearchState state) throws IOException {
        try {
            sendCommand("stop");
        } catch (IOException exception) {
            return false;
        }
        long deadline = System.currentTimeMillis() + 2_000;
        while (System.currentTimeMillis() < deadline) {
            String line = poll(100);
            if (line == null) {
                continue;
            }
            if (line.startsWith("bestmove")) {
                state.acceptBestMove(line);
                return true;
            }
            if (line.startsWith("info ")) {
                state.acceptInfo(line);
            }
        }
        return false;
    }

    private void ensureAlive() throws IOException {
        if (!isAlive()) {
            throw new IOException("Stockfish process is not alive");
        }
    }

    public boolean isAlive() {
        Process current = process;
        return alive && current != null && current.isAlive();
    }

    public String getEngineName() {
        return engineName;
    }

    public String getEngineVersion() {
        return engineVersion;
    }

    private long serverTimeout() {
        return config.getServerTimeoutMs() > 0 ? config.getServerTimeoutMs() : 5_000;
    }

    private long searchTimeout() {
        return config.getSearchTimeoutMs() > 0 ? config.getSearchTimeoutMs() : 15_000;
    }

    @Override
    public synchronized void close() {
        alive = false;
        try {
            if (writer != null && process != null && process.isAlive()) {
                sendCommand("quit");
            }
        } catch (IOException ignored) {
        }
        Process current = process;
        if (current != null) {
            try {
                if (!current.waitFor(500, TimeUnit.MILLISECONDS)) {
                    current.destroy();
                    if (!current.waitFor(500, TimeUnit.MILLISECONDS)) {
                        current.destroyForcibly();
                    }
                }
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                current.destroyForcibly();
            }
        }
        if (readerThread != null) {
            readerThread.interrupt();
        }
        if (errorThread != null) {
            errorThread.interrupt();
        }
        writer = null;
        process = null;
    }

    /** Mutable accumulator for one search; only the highest-depth MultiPV 1 score is kept. */
    private static final class SearchState {
        private int bestDepth = -1;
        private Integer cp;
        private Integer mate;
        private boolean bounded;
        private Integer seldepth;
        private long nodes;
        private String pv;
        private String bestMove;

        void acceptInfo(String line) {
            Matcher depthMatcher = INFO_DEPTH.matcher(line);
            if (!depthMatcher.find()) {
                return;
            }
            int depth = Integer.parseInt(depthMatcher.group(1));
            Matcher multipvMatcher = INFO_MULTIPV.matcher(line);
            if (multipvMatcher.find() && Integer.parseInt(multipvMatcher.group(1)) != 1) {
                return;
            }
            if (depth < bestDepth) {
                return;
            }
            Matcher seldepthMatcher = INFO_SELDEPTH.matcher(line);
            if (seldepthMatcher.find()) {
                seldepth = Integer.parseInt(seldepthMatcher.group(1));
            }
            Matcher nodesMatcher = INFO_NODES.matcher(line);
            if (nodesMatcher.find()) {
                nodes = Long.parseLong(nodesMatcher.group(1));
            }
            Matcher pvMatcher = INFO_PV.matcher(line);
            if (pvMatcher.find()) {
                pv = pvMatcher.group(1).trim();
            }
            boolean isBounded = INFO_BOUND.matcher(line).find();
            Matcher cpMatcher = INFO_SCORE_CP.matcher(line);
            if (cpMatcher.find()) {
                if (!isBounded || bestDepth < 0) {
                    cp = Integer.parseInt(cpMatcher.group(1));
                    mate = null;
                    bounded = isBounded;
                    bestDepth = depth;
                }
                return;
            }
            Matcher mateMatcher = INFO_SCORE_MATE.matcher(line);
            if (mateMatcher.find()) {
                if (!isBounded || bestDepth < 0) {
                    mate = Integer.parseInt(mateMatcher.group(1));
                    cp = null;
                    bounded = isBounded;
                    bestDepth = depth;
                }
            }
        }

        void acceptBestMove(String line) {
            String[] parts = line.trim().split("\\s+");
            if (parts.length >= 2 && !"(none)".equals(parts[1])) {
                bestMove = parts[1];
            }
        }

        EngineEvaluation toEvaluation(String engineName, String engineVersion, long elapsedMs) {
            return new EngineEvaluation(cp, mate, bestMove, pv, Math.max(bestDepth, 0),
                    seldepth, nodes, elapsedMs, 1, engineName, engineVersion, bounded);
        }
    }
}
