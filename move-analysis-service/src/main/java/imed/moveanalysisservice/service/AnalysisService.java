package imed.moveanalysisservice.service;

import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import java.util.UUID;

public interface AnalysisService {
    SubmitAnalysisResponse submit(SubmitAnalysisRequest request, String source);

    AnalysisResponse getAnalysis(UUID requestId);
}
