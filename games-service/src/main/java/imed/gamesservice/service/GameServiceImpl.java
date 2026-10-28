package imed.gamesservice.service;

import imed.gamesservice.dto.request.CreateGameRequest;
import imed.gamesservice.dto.response.GameResponse;
import imed.gamesservice.dto.response.SubmitAnalysisResponse;
import imed.gamesservice.exception.ForbiddenException;
import imed.gamesservice.exception.ResourceNotFoundException;
import imed.gamesservice.model.AnalysisStatus;
import imed.gamesservice.model.Game;
import imed.gamesservice.repository.GameRepository;
import imed.gamesservice.service.client.AnalysisClient;
import imed.gamesservice.service.mapper.GameMapper;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GameServiceImpl implements GameService {

    private final GameRepository gameRepository;
    private final GameMapper gameMapper;
    private final AnalysisClient analysisClient;

    public GameServiceImpl(GameRepository gameRepository, GameMapper gameMapper, AnalysisClient analysisClient) {
        this.gameRepository = gameRepository;
        this.gameMapper = gameMapper;
        this.analysisClient = analysisClient;
    }

    @Override
    @Transactional
    public GameResponse createGame(CreateGameRequest request, String ownerId) {
        Game game = gameMapper.toEntity(request, ownerId);
        Game saved = gameRepository.save(game);

        if (Boolean.TRUE.equals(request.submitForAnalysis()) && saved.getSubmittedForAnalysis()) {
            try {
                String requestId = analysisClient.submitGame(saved);
                if (requestId != null) {
                    saved.setAnalysisRequestId(requestId);
                }
                saved.setAnalysisStatus(AnalysisStatus.REQUESTED);
                saved.setSubmittedForAnalysis(Boolean.TRUE);
                saved = gameRepository.save(saved);
            } catch (Exception ex) {
                saved.setAnalysisStatus(AnalysisStatus.FAILED);
                saved = gameRepository.save(saved);
            }
        }

        return gameMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public GameResponse getGame(UUID id, String ownerId) {
        Game game = gameRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Game not found: " + id));
        if (ownerId != null && game.getOwnerId() != null && !game.getOwnerId().equals(ownerId)) {
            throw new ForbiddenException("Not authorized to access this game");
        }
        if (ownerId != null && game.getOwnerId() == null && game.getWhitePlayerId() != null && !game.getWhitePlayerId().equals(ownerId) && (game.getBlackPlayerId() == null || !game.getBlackPlayerId().equals(ownerId))) {
            // allow if matches players, but be strict if owner set; simple check
        }
        return gameMapper.toResponse(game);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GameResponse> listGames(String ownerId, Pageable pageable) {
        if (ownerId == null || ownerId.isBlank()) {
            return gameRepository.findAll(pageable).map(gameMapper::toResponse);
        }
        return gameRepository.findByOwnerId(ownerId, pageable).map(gameMapper::toResponse);
    }

    @Override
    @Transactional
    public SubmitAnalysisResponse submitForAnalysis(UUID id, String ownerId, boolean force) {
        Game game = gameRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Game not found: " + id));
        if (ownerId != null && game.getOwnerId() != null && !game.getOwnerId().equals(ownerId)) {
            throw new ForbiddenException("Not authorized to submit this game for analysis");
        }

        if (!force && Boolean.TRUE.equals(game.getSubmittedForAnalysis()) && game.getAnalysisStatus() == AnalysisStatus.REQUESTED) {
            return new SubmitAnalysisResponse(game.getId(), true, game.getAnalysisStatus(), game.getAnalysisRequestId(), "Already submitted for analysis");
        }

        try {
            String requestId = analysisClient.submitGame(game);
            game.setSubmittedForAnalysis(Boolean.TRUE);
            game.setAnalysisStatus(AnalysisStatus.REQUESTED);
            if (requestId != null) {
                game.setAnalysisRequestId(requestId);
            }
            gameRepository.save(game);
            return new SubmitAnalysisResponse(game.getId(), true, game.getAnalysisStatus(), game.getAnalysisRequestId(), "Submitted for analysis");
        } catch (Exception ex) {
            game.setAnalysisStatus(AnalysisStatus.FAILED);
            gameRepository.save(game);
            return new SubmitAnalysisResponse(game.getId(), false, game.getAnalysisStatus(), game.getAnalysisRequestId(), "Failed to submit for analysis: " + ex.getMessage());
        }
    }
}
