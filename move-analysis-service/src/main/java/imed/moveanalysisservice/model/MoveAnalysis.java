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
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "move_analyses")
public class MoveAnalysis {

    @Id
    private UUID id;

    @Column(name = "game_analysis_id", nullable = false)
    private UUID gameAnalysisId;

    @Column(name = "game_id")
    private UUID gameId;

    @Column(name = "move_number")
    private Integer moveNumber;

    @Column(nullable = false)
    private Integer ply;

    @Column(length = 16)
    private String color;

    @Column(length = 32)
    private String san;

    @Column(length = 16)
    private String uci;

    @Column(name = "fen_before", columnDefinition = "TEXT")
    private String fenBefore;

    @Column(name = "fen_after", columnDefinition = "TEXT")
    private String fenAfter;

    @Column(name = "eval_before_cp")
    private Integer evalBeforeCp;

    @Column(name = "eval_after_cp")
    private Integer evalAfterCp;

    @Column(name = "eval_before_mate")
    private Integer evalBeforeMate;

    @Column(name = "eval_after_mate")
    private Integer evalAfterMate;

    @Column(name = "best_move_uci", length = 16)
    private String bestMoveUci;

    @Column(name = "best_move_san", length = 32)
    private String bestMoveSan;

    @Column(name = "best_move_eval_cp")
    private Integer bestMoveEvalCp;

    @Column(name = "best_move_eval_mate")
    private Integer bestMoveEvalMate;

    @Column(name = "difference_cp")
    private Integer differenceCp;

    @Column(name = "cp_loss")
    private Integer cpLoss;

    @Column(name = "win_prob_loss")
    private Double winProbLoss;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private MoveClassification classification;

    @Column(columnDefinition = "TEXT")
    private String pv;

    private Integer depth;

    private Integer seldepth;

    private Integer multipv;

    private Long nodes;

    @Column(name = "elapsed_ms")
    private Long elapsedMs;

    @Column(name = "engine_version")
    private String engineVersion;

    @Column(name = "config_version")
    private String configVersion;

    @Column(name = "is_preliminary", nullable = false)
    private Boolean isPreliminary = Boolean.TRUE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private MoveAnalysisStatus status;

    @Column(columnDefinition = "TEXT")
    private String error;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    public MoveAnalysis() {
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
        if (isPreliminary == null) {
            isPreliminary = Boolean.TRUE;
        }
        if (status == null) {
            status = MoveAnalysisStatus.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getGameAnalysisId() {
        return gameAnalysisId;
    }

    public void setGameAnalysisId(UUID gameAnalysisId) {
        this.gameAnalysisId = gameAnalysisId;
    }

    public UUID getGameId() {
        return gameId;
    }

    public void setGameId(UUID gameId) {
        this.gameId = gameId;
    }

    public Integer getMoveNumber() {
        return moveNumber;
    }

    public void setMoveNumber(Integer moveNumber) {
        this.moveNumber = moveNumber;
    }

    public Integer getPly() {
        return ply;
    }

    public void setPly(Integer ply) {
        this.ply = ply;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getSan() {
        return san;
    }

    public void setSan(String san) {
        this.san = san;
    }

    public String getUci() {
        return uci;
    }

    public void setUci(String uci) {
        this.uci = uci;
    }

    public String getFenBefore() {
        return fenBefore;
    }

    public void setFenBefore(String fenBefore) {
        this.fenBefore = fenBefore;
    }

    public String getFenAfter() {
        return fenAfter;
    }

    public void setFenAfter(String fenAfter) {
        this.fenAfter = fenAfter;
    }

    public Integer getEvalBeforeCp() {
        return evalBeforeCp;
    }

    public void setEvalBeforeCp(Integer evalBeforeCp) {
        this.evalBeforeCp = evalBeforeCp;
    }

    public Integer getEvalAfterCp() {
        return evalAfterCp;
    }

    public void setEvalAfterCp(Integer evalAfterCp) {
        this.evalAfterCp = evalAfterCp;
    }

    public Integer getEvalBeforeMate() {
        return evalBeforeMate;
    }

    public void setEvalBeforeMate(Integer evalBeforeMate) {
        this.evalBeforeMate = evalBeforeMate;
    }

    public Integer getEvalAfterMate() {
        return evalAfterMate;
    }

    public void setEvalAfterMate(Integer evalAfterMate) {
        this.evalAfterMate = evalAfterMate;
    }

    public String getBestMoveUci() {
        return bestMoveUci;
    }

    public void setBestMoveUci(String bestMoveUci) {
        this.bestMoveUci = bestMoveUci;
    }

    public String getBestMoveSan() {
        return bestMoveSan;
    }

    public void setBestMoveSan(String bestMoveSan) {
        this.bestMoveSan = bestMoveSan;
    }

    public Integer getBestMoveEvalCp() {
        return bestMoveEvalCp;
    }

    public void setBestMoveEvalCp(Integer bestMoveEvalCp) {
        this.bestMoveEvalCp = bestMoveEvalCp;
    }

    public Integer getBestMoveEvalMate() {
        return bestMoveEvalMate;
    }

    public void setBestMoveEvalMate(Integer bestMoveEvalMate) {
        this.bestMoveEvalMate = bestMoveEvalMate;
    }

    public Integer getDifferenceCp() {
        return differenceCp;
    }

    public void setDifferenceCp(Integer differenceCp) {
        this.differenceCp = differenceCp;
    }

    public Integer getCpLoss() {
        return cpLoss;
    }

    public void setCpLoss(Integer cpLoss) {
        this.cpLoss = cpLoss;
    }

    public Double getWinProbLoss() {
        return winProbLoss;
    }

    public void setWinProbLoss(Double winProbLoss) {
        this.winProbLoss = winProbLoss;
    }

    public MoveClassification getClassification() {
        return classification;
    }

    public void setClassification(MoveClassification classification) {
        this.classification = classification;
    }

    public String getPv() {
        return pv;
    }

    public void setPv(String pv) {
        this.pv = pv;
    }

    public Integer getDepth() {
        return depth;
    }

    public void setDepth(Integer depth) {
        this.depth = depth;
    }

    public Integer getSeldepth() {
        return seldepth;
    }

    public void setSeldepth(Integer seldepth) {
        this.seldepth = seldepth;
    }

    public Integer getMultipv() {
        return multipv;
    }

    public void setMultipv(Integer multipv) {
        this.multipv = multipv;
    }

    public Long getNodes() {
        return nodes;
    }

    public void setNodes(Long nodes) {
        this.nodes = nodes;
    }

    public Long getElapsedMs() {
        return elapsedMs;
    }

    public void setElapsedMs(Long elapsedMs) {
        this.elapsedMs = elapsedMs;
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

    public Boolean getIsPreliminary() {
        return isPreliminary;
    }

    public void setIsPreliminary(Boolean isPreliminary) {
        this.isPreliminary = isPreliminary;
    }

    public MoveAnalysisStatus getStatus() {
        return status;
    }

    public void setStatus(MoveAnalysisStatus status) {
        this.status = status;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
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

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }
}
