package imed.gamesservice.controller;

import imed.gamesservice.dto.request.CreateGameRequest;
import imed.gamesservice.dto.response.GameResponse;
import imed.gamesservice.dto.response.SubmitAnalysisResponse;
import imed.gamesservice.service.GameService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping
    public ResponseEntity<GameResponse> createGame(@Valid @RequestBody CreateGameRequest request, Principal principal) {
        String ownerId = principal != null ? principal.getName() : null;
        GameResponse response = gameService.createGame(request, ownerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameResponse> getGame(@PathVariable UUID id, Principal principal) {
        String ownerId = principal != null ? principal.getName() : null;
        GameResponse response = gameService.getGame(id, ownerId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<GameResponse>> listGames(Principal principal, Pageable pageable) {
        String ownerId = principal != null ? principal.getName() : null;
        Page<GameResponse> response = gameService.listGames(ownerId, pageable);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/submit-analysis")
    public ResponseEntity<SubmitAnalysisResponse> submitForAnalysis(@PathVariable UUID id,
                                                                    Principal principal,
                                                                    @RequestParam(name = "force", defaultValue = "false") boolean force) {
        String ownerId = principal != null ? principal.getName() : null;
        SubmitAnalysisResponse response = gameService.submitForAnalysis(id, ownerId, force);
        return ResponseEntity.ok(response);
    }
}
