package imed.moveanalysisservice.service.impl;

import imed.moveanalysisservice.config.StockfishConfig;
import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.MoveAnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import imed.moveanalysisservice.engine.StockfishEngine;
import imed.moveanalysisservice.model.AnalysisRequest;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.model.MoveClassification;
import imed.moveanalysisservice.repository.AnalysisRequestRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import imed.moveanalysisservice.service.AnalysisService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalysisServiceImpl implements AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisServiceImpl.class);

    private final AnalysisRequestRepository analysisRequestRepository;
    private final MoveAnalysisRepository moveAnalysisRepository;
    private final StockfishEngine stockfishEngine;
    private final StockfishConfig stockfishConfig;

    public AnalysisServiceImpl(AnalysisRequestRepository analysisRequestRepository,
                               MoveAnalysisRepository moveAnalysisRepository,
                               StockfishEngine stockfishEngine,
                               StockfishConfig stockfishConfig) {
        this.analysisRequestRepository = analysisRequestRepository;
        this.moveAnalysisRepository = moveAnalysisRepository;
        this.stockfishEngine = stockfishEngine;
        this.stockfishConfig = stockfishConfig;
    }

    @Override
    @Transactional
    public SubmitAnalysisResponse submit(SubmitAnalysisRequest request, String source) {
        AnalysisRequest analysisRequest = new AnalysisRequest();
        if (request.gameId() != null && !request.gameId().isBlank()) {
            try {
                analysisRequest.setGameId(UUID.fromString(request.gameId()));
            } catch (Exception ignored) {
            }
        }
        analysisRequest.setPgn(request.pgn());
        analysisRequest.setFen(request.fen());
        analysisRequest.setRequestSource(source);
        analysisRequest.setStatus(AnalysisStatus.PENDING);
        analysisRequest = analysisRequestRepository.save(analysisRequest);
        analyzeAsync(analysisRequest.getId());
        return new SubmitAnalysisResponse(analysisRequest.getId(), analysisRequest.getGameId(), analysisRequest.getStatus(), "Analysis submitted");
    }

    @Async
    @Transactional
    public void analyzeAsync(UUID requestId) {
        try {
            AnalysisRequest analysisRequest = analysisRequestRepository.findById(requestId).orElseThrow();
            analysisRequest.setStatus(AnalysisStatus.IN_PROGRESS);
            analysisRequestRepository.save(analysisRequest);

            String fen = analysisRequest.getFen() != null && !analysisRequest.getFen().isBlank()
                    ? analysisRequest.getFen()
                    : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

            int depth = stockfishConfig.getDepth();
            StockfishEngine.EngineScore score = stockfishEngine.analyzePosition(fen, depth);

            MoveAnalysis moveAnalysis = new MoveAnalysis();
            moveAnalysis.setAnalysisRequestId(analysisRequest.getId());
            moveAnalysis.setGameId(analysisRequest.getGameId());
            moveAnalysis.setMoveNumber(0);
            moveAnalysis.setPly(0);
            moveAnalysis.setColor("white");
            moveAnalysis.setSan("startpos");
            moveAnalysis.setFenBefore(fen);
            moveAnalysis.setFenAfter(fen);
            if (score.mate != null) {
                moveAnalysis.setEvalBeforeMate(score.mate);
                moveAnalysis.setEvalAfterMate(score.mate);
            } else if (score.cp != null) {
                moveAnalysis.setEvalBeforeCp(score.cp);
                moveAnalysis.setEvalAfterCp(score.cp);
            }
            moveAnalysis.setBestMoveUci(score.bestMove);
            moveAnalysis.setBestMoveSan(score.bestMove);
            moveAnalysis.setCpLoss(0);
            moveAnalysis.setDifferenceCp(0);
            moveAnalysis.setClassification(MoveClassification.GOOD);
            moveAnalysis.setPv(score.pv);
            moveAnalysisRepository.save(moveAnalysis);

            analysisRequest.setStatus(AnalysisStatus.COMPLETED);
            analysisRequestRepository.save(analysisRequest);
        } catch (Exception e) {
            log.error("Analysis failed for request {}", requestId, e);
            try {
                AnalysisRequest analysisRequest = analysisRequestRepository.findById(requestId).orElse(null);
                if (analysisRequest != null) {
                    analysisRequest.setStatus(AnalysisStatus.FAILED);
                    analysisRequestRepository.save(analysisRequest);
                }
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysis(UUID requestId) {
        AnalysisRequest analysisRequest = analysisRequestRepository.findById(requestId).orElseThrow();
        List<MoveAnalysis> moveAnalyses = moveAnalysisRepository.findByAnalysisRequestIdOrderByPlyAsc(requestId);
        List<MoveAnalysisResponse> moves = new ArrayList<>();
        for (MoveAnalysis ma : moveAnalyses) {
            moves.add(new MoveAnalysisResponse(
                    ma.getMoveNumber(),
                    ma.getColor(),
                    ma.getSan(),
                    ma.getUci(),
                    ma.getEvalBeforeCp(),
                    ma.getEvalAfterCp(),
                    ma.getEvalBeforeMate(),
                    ma.getEvalAfterMate(),
                    ma.getBestMoveUci(),
                    ma.getBestMoveSan(),
                    ma.getCpLoss(),
                    ma.getClassification(),
                    ma.getPv()
            ));
        }
        return new AnalysisResponse(analysisRequest.getId(), analysisRequest.getGameId(), analysisRequest.getStatus(), moves.size(), moves, null);
    }
}
