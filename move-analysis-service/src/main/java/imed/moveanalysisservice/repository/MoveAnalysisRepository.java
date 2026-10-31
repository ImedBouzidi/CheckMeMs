package imed.moveanalysisservice.repository;

import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.model.MoveAnalysisStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface MoveAnalysisRepository extends JpaRepository<MoveAnalysis, UUID> {

    List<MoveAnalysis> findByGameAnalysisIdOrderByPlyAsc(UUID gameAnalysisId);

    List<MoveAnalysis> findByGameIdOrderByPlyAsc(UUID gameId);

    Optional<MoveAnalysis> findByGameAnalysisIdAndPly(UUID gameAnalysisId, Integer ply);

    long countByGameAnalysisIdAndStatus(UUID gameAnalysisId, MoveAnalysisStatus status);

    /** Finalize polls this while the tail of the live stream settles; each call sees fresh commits. */
    long countByGameAnalysisId(UUID gameAnalysisId);

    /** A retry replaces the whole result set, so a bulk delete keeps the restart cheap. */
    @Modifying
    @Transactional
    @Query("delete from MoveAnalysis m where m.gameAnalysisId = :gameAnalysisId")
    void deleteByGameAnalysisId(@Param("gameAnalysisId") UUID gameAnalysisId);
}
