package imed.moveanalysisservice.engine;

import imed.moveanalysisservice.config.StockfishConfig;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class StockfishEngine {

    private static final Logger log = LoggerFactory.getLogger(StockfishEngine.class);

    private final StockfishConfig config;
    private Process process;
    private BufferedWriter writer;
    private BufferedReader reader;
    private Thread readerThread;
    private final BlockingQueue<String> outputQueue = new LinkedBlockingQueue<>();

    public StockfishEngine(StockfishConfig config) {
        this.config = config;
    }

    @PostConstruct
    public void start() throws IOException {
        String path = config.getPath();
        if (path == null || path.isBlank()) {
            path = "stockfish";
        }
        ProcessBuilder pb = new ProcessBuilder(path);
        process = pb.start();
        writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream()));
        reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        startReader();
        sendCommand("uci");
        waitFor("uciok", 5000);
        sendCommand("setoption name Threads value " + config.getThreads());
        sendCommand("setoption name Hash value " + config.getHash());
        sendCommand("setoption name MultiPV value " + config.getMultiPv());
        sendCommand("isready");
        waitFor("readyok", 5000);
        log.info("Stockfish engine started successfully");
    }

    private void startReader() {
        readerThread = new Thread(() -> {
            try {
                String line;
                while ((line = reader.readLine()) != null) {
                    outputQueue.offer(line);
                }
            } catch (Exception e) {
                log.error("Error reading from stockfish", e);
            }
        });
        readerThread.setDaemon(true);
        readerThread.start();
    }

    private void sendCommand(String command) throws IOException {
        if (writer != null) {
            writer.write(command);
            writer.newLine();
            writer.flush();
        }
    }

    private void waitFor(String expected, long timeoutMs) throws IOException {
        long start = System.currentTimeMillis();
        while (System.currentTimeMillis() - start < timeoutMs) {
            try {
                String line = outputQueue.poll(100, TimeUnit.MILLISECONDS);
                if (line != null && line.contains(expected)) {
                    return;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    public EngineScore analyzePosition(String fen, int depth) throws IOException {
        outputQueue.clear();
        sendCommand("position fen " + fen);
        sendCommand("go depth " + depth);
        int bestCp = 0;
        int bestMate = 0;
        boolean hasMate = false;
        String bestMove = null;
        String pv = null;
        long start = System.currentTimeMillis();
        long timeout = 30000;
        while (System.currentTimeMillis() - start < timeout) {
            try {
                String line = outputQueue.poll(200, TimeUnit.MILLISECONDS);
                if (line == null) {
                    continue;
                }
                if (line.startsWith("info")) {
                    EngineScore parsed = parseInfoLine(line);
                    if (parsed != null) {
                        if (parsed.mate != null) {
                            hasMate = true;
                            bestMate = parsed.mate;
                        } else if (parsed.cp != null) {
                            bestCp = parsed.cp;
                        }
                        if (parsed.pv != null) {
                            pv = parsed.pv;
                        }
                        if (parsed.bestMoveCandidate != null && bestMove == null) {
                            bestMove = parsed.bestMoveCandidate;
                        }
                    }
                }
                if (line.startsWith("bestmove")) {
                    String[] parts = line.split("\\s+");
                    if (parts.length >= 2 && !parts[1].equals("(none)")) {
                        bestMove = parts[1];
                    }
                    break;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        EngineScore score = new EngineScore();
        if (hasMate) {
            score.mate = bestMate;
            score.cp = null;
        } else {
            score.cp = bestCp;
            score.mate = null;
        }
        score.bestMove = bestMove;
        score.pv = pv;
        return score;
    }

    private EngineScore parseInfoLine(String line) {
        EngineScore score = new EngineScore();
        Pattern cpPattern = Pattern.compile("score cp (-?\\d+)");
        Matcher cpMatcher = cpPattern.matcher(line);
        if (cpMatcher.find()) {
            try {
                score.cp = Integer.parseInt(cpMatcher.group(1));
            } catch (Exception ignored) {
            }
        }
        Pattern matePattern = Pattern.compile("score mate (-?\\d+)");
        Matcher mateMatcher = matePattern.matcher(line);
        if (mateMatcher.find()) {
            try {
                score.mate = Integer.parseInt(mateMatcher.group(1));
            } catch (Exception ignored) {
            }
        }
        Pattern pvPattern = Pattern.compile(" pv (.+)$");
        Matcher pvMatcher = pvPattern.matcher(line);
        if (pvMatcher.find()) {
            score.pv = pvMatcher.group(1).trim();
        }
        // best move candidate not directly in info usually, but pv first move is best line start
        if (score.pv != null && !score.pv.isBlank()) {
            String[] pvParts = score.pv.split("\\s+");
            if (pvParts.length > 0) {
                score.bestMoveCandidate = pvParts[0];
            }
        }
        if (score.cp == null && score.mate == null) {
            return null;
        }
        return score;
    }

    @PreDestroy
    public void stop() {
        try {
            if (writer != null) {
                sendCommand("quit");
            }
        } catch (Exception ignored) {
        }
        if (process != null) {
            process.destroy();
        }
    }

    public static class EngineScore {
        public Integer cp;
        public Integer mate;
        public String bestMove;
        public String bestMoveCandidate;
        public String pv;
    }
}
