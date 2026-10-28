package imed.moveanalysisservice.repository;

import imed.moveanalysisservice.model.MoveAnalysis;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MoveAnalysisRepository extends JpaRepository<MoveAnalysis, UUID> {
    List<MoveAnalysis> findByAnalysisRequestIdOrderByPlyAsc(UUID analysisRequestId);

    List<MoveAnalysis> findByGameIdOrderByPlyAsc(UUID gameId);
}
