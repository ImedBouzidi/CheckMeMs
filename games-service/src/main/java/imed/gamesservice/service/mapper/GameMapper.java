package imed.gamesservice.service.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import imed.gamesservice.dto.request.CreateGameRequest;
import imed.gamesservice.dto.response.GameResponse;
import imed.gamesservice.model.AnalysisStatus;
import imed.gamesservice.model.Game;
import org.springframework.stereotype.Component;

@Component
public class GameMapper {

    private final ObjectMapper objectMapper;

    public GameMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

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
        game.setTimeControl(toJson(request.timeControl()));
        game.setMetadata(toJson(request.metadata()));
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
                fromJson(game.getTimeControl()),
                fromJson(game.getMetadata()),
                game.getSubmittedForAnalysis(),
                game.getAnalysisStatus(),
                game.getAnalysisRequestId(),
                game.getStartedAt(),
                game.getEndedAt(),
                game.getCreatedAt(),
                game.getUpdatedAt()
        );
    }

    private String toJson(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            objectMapper.readTree(value);
            return value;
        } catch (JsonProcessingException exception) {
            try {
                return objectMapper.writeValueAsString(value);
            } catch (JsonProcessingException serializationException) {
                throw new IllegalArgumentException("Invalid JSON field", serializationException);
            }
        }
    }

    private String fromJson(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        try {
            JsonNode node = objectMapper.readTree(value);
            return node.isTextual() ? node.textValue() : value;
        } catch (JsonProcessingException exception) {
            return value;
        }
    }
}
