package imed.moveanalysisservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "game_analyses")
public class GameAnalysis {

    @Id
    private UUID id;

    @Column(name = "game_id", nullable = false)
    private UUID gameId;

    @Column(nullable = false)
    private String profile = "STANDARD";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisStatus status;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String pgn;

    @Column(columnDefinition = "TEXT")
    private String fen;

    @Column(name = "expected_plies", nullable = false)
    private Integer expectedPlies = 0;

    @Column(name = "completed_plies", nullable = false)
    private Integer completedPlies = 0;

    @Column(name = "engine_name")
    private String engineName;

    @Column(name = "engine_version")
    private String engineVersion;

    @Column(name = "config_version")
    private String configVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "analysis_config", columnDefinition = "jsonb")
    private String analysisConfig;

    @Column(name = "accuracy_white", precision = 5, scale = 2)
    private BigDecimal accuracyWhite;

    @Column(name = "accuracy_black", precision = 5, scale = 2)
    private BigDecimal accuracyBlack;

    @Column(name = "acpl_white")
    private Integer acplWhite;

    @Column(name = "acpl_black")
    private Integer acplBlack;

    @Column(name = "requested_by")
    private String requestedBy;

    @Column(name = "white_player_id")
    private String whitePlayerId;

    @Column(name = "black_player_id")
    private String blackPlayerId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String summary;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "finalized_at")
    private OffsetDateTime finalizedAt;

    @Version
    @Column(nullable = false)
    private long version;

    public GameAnalysis() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
        if (status == null) {
            status = AnalysisStatus.PENDING;
        }
        if (profile == null || profile.isBlank()) {
            profile = "STANDARD";
        }
        if (expectedPlies == null) {
            expectedPlies = 0;
        }
        if (completedPlies == null) {
            completedPlies = 0;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public int progressPct() {
        if (expectedPlies == null || expectedPlies <= 0) {
            return status == AnalysisStatus.COMPLETED ? 100 : 0;
        }
        int done = completedPlies == null ? 0 : completedPlies;
        return Math.min(100, (int) Math.round(done * 100.0 / expectedPlies));
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getGameId() {
        return gameId;
    }

    public void setGameId(UUID gameId) {
        this.gameId = gameId;
    }

    public String getProfile() {
        return profile;
    }

    public void setProfile(String profile) {
        this.profile = profile;
    }

    public AnalysisStatus getStatus() {
        return status;
    }

    public void setStatus(AnalysisStatus status) {
        this.status = status;
    }

    public String getPgn() {
        return pgn;
    }

    public void setPgn(String pgn) {
        this.pgn = pgn;
    }

    public String getFen() {
        return fen;
    }

    public void setFen(String fen) {
        this.fen = fen;
    }

    public Integer getExpectedPlies() {
        return expectedPlies;
    }

    public void setExpectedPlies(Integer expectedPlies) {
        this.expectedPlies = expectedPlies;
    }

    public Integer getCompletedPlies() {
        return completedPlies;
    }

    public void setCompletedPlies(Integer completedPlies) {
        this.completedPlies = completedPlies;
    }

    public String getEngineName() {
        return engineName;
    }

    public void setEngineName(String engineName) {
        this.engineName = engineName;
    }

    public String getEngineVersion() {
        return engineVersion;
    }

    public void setEngineVersion(String engineVersion) {
        this.engineVersion = engineVersion;
    }

    public String getConfigVersion() {
        return configVersion;
    }

    public void setConfigVersion(String configVersion) {
        this.configVersion = configVersion;
    }

    public String getAnalysisConfig() {
        return analysisConfig;
    }

    public void setAnalysisConfig(String analysisConfig) {
        this.analysisConfig = analysisConfig;
    }

    public BigDecimal getAccuracyWhite() {
        return accuracyWhite;
    }

    public void setAccuracyWhite(BigDecimal accuracyWhite) {
        this.accuracyWhite = accuracyWhite;
    }

    public BigDecimal getAccuracyBlack() {
        return accuracyBlack;
    }

    public void setAccuracyBlack(BigDecimal accuracyBlack) {
        this.accuracyBlack = accuracyBlack;
    }

    public Integer getAcplWhite() {
        return acplWhite;
    }

    public void setAcplWhite(Integer acplWhite) {
        this.acplWhite = acplWhite;
    }

    public Integer getAcplBlack() {
        return acplBlack;
    }

    public void setAcplBlack(Integer acplBlack) {
        this.acplBlack = acplBlack;
    }

    public String getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy) {
        this.requestedBy = requestedBy;
    }

    public String getWhitePlayerId() {
        return whitePlayerId;
    }

    public void setWhitePlayerId(String whitePlayerId) {
        this.whitePlayerId = whitePlayerId;
    }

    public String getBlackPlayerId() {
        return blackPlayerId;
    }

    public void setBlackPlayerId(String blackPlayerId) {
        this.blackPlayerId = blackPlayerId;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public OffsetDateTime getFinalizedAt() {
        return finalizedAt;
    }

    public void setFinalizedAt(OffsetDateTime finalizedAt) {
        this.finalizedAt = finalizedAt;
    }

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }
}
