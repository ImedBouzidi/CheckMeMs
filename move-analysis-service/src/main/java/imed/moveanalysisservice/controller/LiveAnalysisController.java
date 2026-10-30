package imed.moveanalysisservice.controller;

import imed.moveanalysisservice.dto.request.FinalizeLiveAnalysisRequest;
import imed.moveanalysisservice.dto.request.LiveMoveAnalysisRequest;
import imed.moveanalysisservice.model.GameAnalysis;
import imed.moveanalysisservice.service.LiveAnalysisService;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analysis")
public class LiveAnalysisController {

    private final LiveAnalysisService liveAnalysisService;

    public LiveAnalysisController(LiveAnalysisService liveAnalysisService) {
        this.liveAnalysisService = liveAnalysisService;
    }

    @PostMapping("/live-moves")
    public ResponseEntity<Map<String, String>> submit(
            @Valid @RequestBody LiveMoveAnalysisRequest request,
            Authentication authentication) {
        String requester = authentication == null ? null : authentication.getName();
        if (requester == null || requester.isBlank()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        liveAnalysisService.publish(new LiveMoveAnalysisRequest(
                request.gameId(), request.ply(), request.moveNumber(), request.color(),
                request.san(), request.uci(), request.fenBefore(), request.fenAfter(), requester));
        return ResponseEntity.accepted().body(Map.of("status", "QUEUED"));
    }

    /**
     * Tell the service the game is over. The review keeps processing the streamed moves until the
     * last one has been searched, so the answer only reports the counters of this moment.
     */
    @PostMapping("/games/{gameId}/live-moves/finalize")
    public ResponseEntity<Map<String, Object>> finalizeGame(
            @PathVariable UUID gameId,
            @Valid @RequestBody FinalizeLiveAnalysisRequest request,
            Authentication authentication) {
        GameAnalysis analysis = liveAnalysisService.finaliseGame(gameId, request,
                authentication == null ? null : authentication.getName());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("requestId", analysis.getId());
        body.put("gameId", analysis.getGameId());
        body.put("status", analysis.getStatus().name());
        body.put("expectedPlies", analysis.getExpectedPlies());
        body.put("completedPlies", analysis.getCompletedPlies());
        return ResponseEntity.accepted().body(body);
    }
}
