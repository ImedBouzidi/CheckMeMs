package imed.moveanalysisservice.repository;

import imed.moveanalysisservice.model.GameAnalysis;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameAnalysisRepository extends JpaRepository<GameAnalysis, UUID> {

    Optional<GameAnalysis> findByGameIdAndProfile(UUID gameId, String profile);
}
