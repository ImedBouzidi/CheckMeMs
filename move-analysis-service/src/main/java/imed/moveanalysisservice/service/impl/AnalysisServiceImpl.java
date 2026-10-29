package imed.moveanalysisservice.service.impl;

import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.MoveAnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import imed.moveanalysisservice.model.AnalysisRequest;
import imed.moveanalysisservice.model.AnalysisStatus;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.repository.AnalysisRequestRepository;
import imed.moveanalysisservice.repository.MoveAnalysisRepository;
import imed.moveanalysisservice.service.AnalysisService;
import imed.moveanalysisservice.service.AnalysisRunner;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalysisServiceImpl implements AnalysisService {

    private final AnalysisRequestRepository analysisRequestRepository;
    private final MoveAnalysisRepository moveAnalysisRepository;
    private final AnalysisRunner analysisRunner;

    public AnalysisServiceImpl(AnalysisRequestRepository analysisRequestRepository,
                               MoveAnalysisRepository moveAnalysisRepository,
                               AnalysisRunner analysisRunner) {
        this.analysisRequestRepository = analysisRequestRepository;
        this.moveAnalysisRepository = moveAnalysisRepository;
        this.analysisRunner = analysisRunner;
    }

    /**
     * No transaction here on purpose: the row must be committed before the async job reads it,
     * otherwise the engine thread can query an id that is still invisible to it.
     */
    @Override
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
        analysisRunner.run(analysisRequest.getId());
        return new SubmitAnalysisResponse(analysisRequest.getId(), analysisRequest.getGameId(), analysisRequest.getStatus(), "Analysis submitted");
    }

    @Override
    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysis(UUID requestId) {
        AnalysisRequest analysisRequest = analysisRequestRepository.findById(requestId).orElseThrow();
        List<MoveAnalysis> moveAnalyses = moveAnalysisRepository.findByAnalysisRequestIdOrderByPlyAsc(requestId);
        List<MoveAnalysisResponse> moves = new ArrayList<>();
        for (MoveAnalysis ma : moveAnalyses) {
            moves.add(new MoveAnalysisResponse(
                    ma.getPly(),
                    ma.getMoveNumber(),
                    ma.getColor(),
                    ma.getSan(),
                    ma.getUci(),
                    ma.getFenBefore(),
                    ma.getFenAfter(),
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
        return new AnalysisResponse(analysisRequest.getId(), analysisRequest.getGameId(), analysisRequest.getStatus(), moves.size(), moves, analysisRequest.getResultSummary());
    }
}
