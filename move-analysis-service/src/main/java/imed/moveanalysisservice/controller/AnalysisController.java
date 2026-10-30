package imed.moveanalysisservice.controller;

import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.AnalysisStatusResponse;
import imed.moveanalysisservice.dto.response.MoveAnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import imed.moveanalysisservice.service.AnalysisService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analysis")
@Validated
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping("/games")
    public ResponseEntity<SubmitAnalysisResponse> submitGame(@Valid @RequestBody SubmitAnalysisRequest request,
                                                             Authentication authentication) {
        return accepted(analysisService.submit(request, requester(authentication)));
    }

    /** Kept as an alias so the existing games-service client keeps working. */
    @PostMapping("/submit")
    public ResponseEntity<SubmitAnalysisResponse> submit(@Valid @RequestBody SubmitAnalysisRequest request,
                                                         Authentication authentication) {
        return accepted(analysisService.submit(request, requester(authentication)));
    }

    /** Backwards-compatible status lookup by analysis request id. */
    @GetMapping("/{requestId}")
    public ResponseEntity<AnalysisResponse> getAnalysis(@PathVariable UUID requestId,
                                                        Authentication authentication) {
        return ResponseEntity.ok(analysisService.getAnalysis(requestId, requester(authentication)));
    }

    @GetMapping("/jobs/{requestId}/status")
    public ResponseEntity<AnalysisStatusResponse> getStatus(@PathVariable UUID requestId,
                                                            Authentication authentication) {
        return ResponseEntity.ok(analysisService.getStatus(requestId, requester(authentication)));
    }

    @GetMapping("/games/{gameId}")
    public ResponseEntity<AnalysisResponse> getReview(@PathVariable UUID gameId,
                                                      Authentication authentication) {
        return ResponseEntity.ok(analysisService.getAnalysisByGameId(gameId, requester(authentication)));
    }

    @GetMapping("/games/{gameId}/moves/{ply}")
    public ResponseEntity<MoveAnalysisResponse> getMove(@PathVariable UUID gameId,
                                                        @PathVariable @Min(0) @Max(500) int ply,
                                                        Authentication authentication) {
        return ResponseEntity.ok(analysisService.getMove(gameId, ply, requester(authentication)));
    }

    @PostMapping("/games/{gameId}/retry")
    public ResponseEntity<SubmitAnalysisResponse> retryByGameId(@PathVariable UUID gameId,
                                                                Authentication authentication) {
        String requester = requester(authentication);
        AnalysisResponse review = analysisService.getAnalysisByGameId(gameId, requester);
        return accepted(analysisService.retry(review.requestId(), requester));
    }

    @PostMapping("/jobs/{requestId}/retry")
    public ResponseEntity<SubmitAnalysisResponse> retry(@PathVariable UUID requestId,
                                                        Authentication authentication) {
        return accepted(analysisService.retry(requestId, requester(authentication)));
    }

    private ResponseEntity<SubmitAnalysisResponse> accepted(SubmitAnalysisResponse response) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    private String requester(Authentication authentication) {
        return authentication == null ? null : authentication.getName();
    }
}
