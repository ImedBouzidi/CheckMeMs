package imed.gamesservice.repository;

import imed.gamesservice.model.Game;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, UUID> {
    Page<Game> findByOwnerId(String ownerId, Pageable pageable);

    Page<Game> findByWhitePlayerIdOrBlackPlayerId(String whitePlayerId, String blackPlayerId, Pageable pageable);

    Optional<Game> findByIdAndOwnerId(UUID id, String ownerId);
}
