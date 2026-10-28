package imed.moveanalysisservice.controller;

import imed.moveanalysisservice.dto.request.SubmitAnalysisRequest;
import imed.moveanalysisservice.dto.response.AnalysisResponse;
import imed.moveanalysisservice.dto.response.SubmitAnalysisResponse;
import imed.moveanalysisservice.service.AnalysisService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping("/games")
    public ResponseEntity<SubmitAnalysisResponse> submitGame(@Valid @RequestBody SubmitAnalysisRequest request, Principal principal) {
        String source = principal != null ? principal.getName() : "game-service";
        SubmitAnalysisResponse response = analysisService.submit(request, source);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @PostMapping("/submit")
    public ResponseEntity<SubmitAnalysisResponse> submit(@Valid @RequestBody SubmitAnalysisRequest request, Principal principal) {
        String source = principal != null ? principal.getName() : "api";
        SubmitAnalysisResponse response = analysisService.submit(request, source);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<AnalysisResponse> getAnalysis(@PathVariable UUID requestId) {
        AnalysisResponse response = analysisService.getAnalysis(requestId);
        return ResponseEntity.ok(response);
    }
}
