package imed.gamesservice.service.mapper;

import imed.gamesservice.dto.request.CreateGameRequest;
import imed.gamesservice.dto.response.GameResponse;
import imed.gamesservice.model.AnalysisStatus;
import imed.gamesservice.model.Game;
import org.springframework.stereotype.Component;

@Component
public class GameMapper {

    public Game toEntity(CreateGameRequest request, String ownerId) {
        Game game = new Game();
        game.setPgn(request.pgn());
        game.setFen(request.fen());
        game.setWhitePlayerId(request.whitePlayerId());
        game.setBlackPlayerId(request.blackPlayerId());
        game.setOwnerId(ownerId);
        game.setResult(request.result());
        game.setStatus(request.status());
        game.setMode(request.mode());
        game.setTimeControl(request.timeControl());
        game.setMetadata(request.metadata());
        if (request.submitForAnalysis() != null && request.submitForAnalysis()) {
            game.setSubmittedForAnalysis(Boolean.TRUE);
            game.setAnalysisStatus(AnalysisStatus.PENDING);
        } else {
            game.setSubmittedForAnalysis(Boolean.FALSE);
            game.setAnalysisStatus(AnalysisStatus.NOT_REQUESTED);
        }
        return game;
    }

    public GameResponse toResponse(Game game) {
        return new GameResponse(
                game.getId(),
                game.getWhitePlayerId(),
                game.getBlackPlayerId(),
                game.getOwnerId(),
                game.getPgn(),
                game.getFen(),
                game.getResult(),
                game.getStatus(),
                game.getMode(),
                game.getTimeControl(),
                game.getMetadata(),
                game.getSubmittedForAnalysis(),
                game.getAnalysisStatus(),
                game.getAnalysisRequestId(),
                game.getStartedAt(),
                game.getEndedAt(),
                game.getCreatedAt(),
                game.getUpdatedAt()
        );
    }
}
