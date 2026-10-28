package imed.gamesservice.service;

import imed.gamesservice.dto.request.CreateGameRequest;
import imed.gamesservice.dto.response.GameResponse;
import imed.gamesservice.dto.response.SubmitAnalysisResponse;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GameService {
    GameResponse createGame(CreateGameRequest request, String ownerId);

    GameResponse getGame(UUID id, String ownerId);

    Page<GameResponse> listGames(String ownerId, Pageable pageable);

    SubmitAnalysisResponse submitForAnalysis(UUID id, String ownerId, boolean force);
}
