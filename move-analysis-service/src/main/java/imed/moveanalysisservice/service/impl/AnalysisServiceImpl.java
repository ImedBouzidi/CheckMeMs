package imed.moveanalysisservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.chess.PgnReplay;
import imed.moveanalysisservice.config.StockfishConfig;
import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.AnalysisStatusResponse;
import imed.moveanalysisservice.dto.response.AnalysisSummary;
import imed.moveanalysisservice.dto.response.MoveAnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import imed.moveanalysisservice.exception.AnalysisNotFoundException;
import imed.moveanalysisservice.exception.ForbiddenException;
import imed.moveanalysisservice.model.AnalysisJobType;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.repository.GameAnalysisRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import imed.moveanalysisservice.service.AnalysisQueue;
import imed.moveanalysisservice.service.AnalysisService;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalysisServiceImpl implements AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisServiceImpl.class);

    private static final String DEFAULT_PROFILE = "STANDARD";
    private static final int MAX_PLIES = 500;
    private static final int JOB_PRIORITY = 5;

    private final GameAnalysisRepository gameAnalysisRepository;
    private final MoveAnalysisRepository moveAnalysisRepository;
    private final AnalysisQueue analysisQueue;
    private final StockfishConfig stockfishConfig;
    private final ObjectMapper objectMapper;

    public AnalysisServiceImpl(GameAnalysisRepository gameAnalysisRepository,
                               MoveAnalysisRepository moveAnalysisRepository,
                               AnalysisQueue analysisQueue,
                               StockfishConfig stockfishConfig,
                               ObjectMapper objectMapper) {
        this.gameAnalysisRepository = gameAnalysisRepository;
        this.moveAnalysisRepository = moveAnalysisRepository;
        this.analysisQueue = analysisQueue;
        this.stockfishConfig = stockfishConfig;
        this.objectMapper = objectMapper;
    }

    /**
     * The aggregate is committed before the async worker can see it, so this method deliberately
     * has no surrounding transaction. The unique (game_id, profile) key turns concurrent duplicate
     * submissions into one analysis.
     */
    @Override
    public SubmitAnalysisResponse submit(SubmitAnalysisRequest request, String requester) {
        if (requester == null || requester.isBlank()) {
            throw new ForbiddenException("An authenticated caller is required");
        }
        if (request.gameId() == null || request.gameId().isBlank()) {
            throw new IllegalArgumentException("gameId is required");
        }
        String pgn = request.pgn() == null ? "" : request.pgn().trim();
        String fen = request.fen() == null ? "" : request.fen().trim();
        if (pgn.isEmpty() && fen.isEmpty()) {
            throw new IllegalArgumentException("pgn or fen is required");
        }

        UUID gameId;
        try {
            gameId = UUID.fromString(request.gameId());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("gameId must be a UUID");
        }

        int plies = pgn.isEmpty() ? 0 : countPlies(pgn);
        int expectedPlies = plies == 0 ? 1 : plies;

        Optional<GameAnalysis> existing = gameAnalysisRepository.findByGameIdAndProfile(gameId, DEFAULT_PROFILE);
        if (existing.isPresent()) {
            GameAnalysis analysis = existing.get();
            assertAccess(analysis, requester);
            if (analysis.getStatus() == AnalysisStatus.FAILED) {
                resetForRetry(analysis);
                analysis = gameAnalysisRepository.save(analysis);
                enqueue(analysis);
                return response(analysis, "Analysis restarted");
            }
            if (analysis.getStatus() != AnalysisStatus.COMPLETED) {
                enqueue(analysis);
            }
            return response(analysis, analysis.getStatus() == AnalysisStatus.COMPLETED
                    ? "Analysis already completed"
                    : "Analysis already in progress");
        }

        GameAnalysis analysis = new GameAnalysis();
        analysis.setGameId(gameId);
        analysis.setProfile(DEFAULT_PROFILE);
        analysis.setStatus(AnalysisStatus.PENDING);
        analysis.setPgn(pgn);
        analysis.setFen(fen.isEmpty() ? null : fen);
        analysis.setExpectedPlies(expectedPlies);
        analysis.setCompletedPlies(0);
        analysis.setRequestedBy(requester);
        analysis.setWhitePlayerId(blankToNull(request.whitePlayerId()));
        analysis.setBlackPlayerId(blankToNull(request.blackPlayerId()));
        analysis.setConfigVersion(configVersion());

        try {
            analysis = gameAnalysisRepository.save(analysis);
        } catch (DataIntegrityViolationException exception) {
            GameAnalysis winner = gameAnalysisRepository.findByGameIdAndProfile(gameId, DEFAULT_PROFILE)
                    .orElseThrow(() -> exception);
            enqueue(winner);
            return response(winner, "Analysis already in progress");
        }

        enqueue(analysis);
        return response(analysis, "Analysis submitted");
    }

    @Override
    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysis(UUID requestId, String requester) {
        GameAnalysis analysis = gameAnalysisRepository.findById(requestId)
                .orElseThrow(() -> new AnalysisNotFoundException("Analysis not found: " + requestId));
        assertAccess(analysis, requester);
        List<MoveAnalysis> rows = moveAnalysisRepository.findByGameAnalysisIdOrderByPlyAsc(analysis.getId());
        return responseWithMoves(analysis, rows);
    }

    @Override
    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysisByGameId(UUID gameId, String requester) {
        GameAnalysis analysis = gameAnalysisRepository.findByGameIdAndProfile(gameId, DEFAULT_PROFILE)
                .orElseThrow(() -> new AnalysisNotFoundException("Analysis not found for game: " + gameId));
        assertAccess(analysis, requester);
        List<MoveAnalysis> rows = moveAnalysisRepository.findByGameAnalysisIdOrderByPlyAsc(analysis.getId());
        return responseWithMoves(analysis, rows);
    }

    @Override
    @Transactional(readOnly = true)
    public AnalysisStatusResponse getStatus(UUID requestId, String requester) {
        GameAnalysis analysis = gameAnalysisRepository.findById(requestId)
                .orElseThrow(() -> new AnalysisNotFoundException("Analysis not found: " + requestId));
        assertAccess(analysis, requester);
        return new AnalysisStatusResponse(analysis.getId(), analysis.getGameId(), analysis.getStatus(),
                analysis.getExpectedPlies(), analysis.getCompletedPlies(), analysis.progressPct(),
                analysis.getLastError(), analysis.getCreatedAt(), analysis.getUpdatedAt(),
                analysis.getCompletedAt());
    }

    @Override
    @Transactional(readOnly = true)
    public MoveAnalysisResponse getMove(UUID gameId, int ply, String requester) {
        GameAnalysis analysis = gameAnalysisRepository.findByGameIdAndProfile(gameId, DEFAULT_PROFILE)
                .orElseThrow(() -> new AnalysisNotFoundException("Analysis not found for game: " + gameId));
        assertAccess(analysis, requester);
        MoveAnalysis row = moveAnalysisRepository.findByGameAnalysisIdAndPly(analysis.getId(), ply)
                .orElseThrow(() -> new AnalysisNotFoundException("Ply " + ply + " not found for game " + gameId));
        return toMoveResponse(row);
    }

    @Override
    public SubmitAnalysisResponse retry(UUID requestId, String requester) {
        GameAnalysis analysis = gameAnalysisRepository.findById(requestId)
                .orElseThrow(() -> new AnalysisNotFoundException("Analysis not found: " + requestId));
        assertAccess(analysis, requester);
        if (analysis.getStatus() == AnalysisStatus.COMPLETED) {
            return response(analysis, "Analysis already completed");
        }
        resetForRetry(analysis);
        analysis = gameAnalysisRepository.save(analysis);
        enqueue(analysis);
        return response(analysis, "Analysis queued for retry");
    }

    private void resetForRetry(GameAnalysis analysis) {
        analysis.setStatus(AnalysisStatus.PENDING);
        analysis.setCompletedPlies(0);
        analysis.setCompletedAt(null);
        analysis.setLastError(null);
        analysis.setSummary(null);
    }

    private void enqueue(GameAnalysis analysis) {
        analysisQueue.enqueue(analysis.getId(), AnalysisJobType.GAME, JOB_PRIORITY, "{}");
    }

    private int countPlies(String pgn) {
        try {
            int plies = PgnReplay.replay(pgn).size();
            if (plies > MAX_PLIES) {
                throw new IllegalArgumentException("pgn has more than " + MAX_PLIES + " plies");
            }
            return plies;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid PGN: " + exception.getMessage(), exception);
        }
    }

    private void assertAccess(GameAnalysis analysis, String requester) {
        if (requester == null || requester.isBlank()) {
            throw new ForbiddenException("An authenticated caller is required");
        }
        if (requester.equals(analysis.getRequestedBy())
                || requester.equals(analysis.getWhitePlayerId())
                || requester.equals(analysis.getBlackPlayerId())) {
            return;
        }
        throw new ForbiddenException("Not authorized to access this analysis");
    }

    private AnalysisResponse responseWithMoves(GameAnalysis analysis, List<MoveAnalysis> rows) {
        List<MoveAnalysisResponse> moves = new ArrayList<>(rows.size());
        for (MoveAnalysis row : rows) {
            moves.add(toMoveResponse(row));
        }
        return new AnalysisResponse(
                analysis.getId(),
                analysis.getGameId(),
                analysis.getProfile(),
                analysis.getStatus(),
                analysis.getExpectedPlies(),
                analysis.getCompletedPlies(),
                analysis.progressPct(),
                moves.size(),
                moves,
                parseSummary(analysis.getSummary()),
                analysis.getEngineName(),
                analysis.getEngineVersion(),
                analysis.getConfigVersion(),
                analysis.getCreatedAt(),
                analysis.getUpdatedAt(),
                analysis.getCompletedAt(),
                analysis.getLastError());
    }

    private MoveAnalysisResponse toMoveResponse(MoveAnalysis row) {
        return new MoveAnalysisResponse(
                row.getPly(),
                row.getMoveNumber(),
                row.getColor(),
                row.getSan(),
                row.getUci(),
                row.getFenBefore(),
                row.getFenAfter(),
                row.getEvalBeforeCp(),
                row.getEvalAfterCp(),
                row.getEvalBeforeMate(),
                row.getEvalAfterMate(),
                row.getBestMoveUci(),
                row.getBestMoveSan(),
                row.getCpLoss(),
                row.getClassification(),
                row.getPv(),
                row.getDepth(),
                row.getSeldepth(),
                row.getNodes(),
                row.getElapsedMs(),
                row.getEngineVersion(),
                row.getConfigVersion(),
                row.getIsPreliminary(),
                row.getStatus(),
                row.getError());
    }

    private AnalysisSummary parseSummary(String summary) {
        if (summary == null || summary.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(summary, AnalysisSummary.class);
        } catch (Exception exception) {
            log.warn("Could not parse analysis summary: {}", exception.getMessage());
            return null;
        }
    }

    private SubmitAnalysisResponse response(GameAnalysis analysis, String message) {
        return new SubmitAnalysisResponse(analysis.getId(), analysis.getGameId(), analysis.getStatus(), message);
    }

    private String configVersion() {
        return "depth-" + stockfishConfig.getDepth() + "-multipv-" + stockfishConfig.getMultiPv();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
