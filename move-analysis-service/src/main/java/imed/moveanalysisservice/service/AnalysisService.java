package imed.moveanalysisservice.service;

import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.AnalysisStatusResponse;
import imed.moveanalysisservice.dto.response.MoveAnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import java.util.UUID;

public interface AnalysisService {

    SubmitAnalysisResponse submit(SubmitAnalysisRequest request, String requester);

    AnalysisResponse getAnalysis(UUID requestId, String requester);

    AnalysisResponse getAnalysisByGameId(UUID gameId, String requester);

    AnalysisStatusResponse getStatus(UUID requestId, String requester);

    MoveAnalysisResponse getMove(UUID gameId, int ply, String requester);

    SubmitAnalysisResponse retry(UUID requestId, String requester);
}
