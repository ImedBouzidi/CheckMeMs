package imed.moveanalysisservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "move_analyses")
public class MoveAnalysis {

    @Id
    private UUID id;

    @Column(name = "analysis_request_id")
    private UUID analysisRequestId;

    @Column(name = "game_id")
    private UUID gameId;

    @Column(name = "move_number")
    private Integer moveNumber;

    private Integer ply;

    private String color;

    private String san;

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

    @Column(name = "best_move_uci")
    private String bestMoveUci;

    @Column(name = "best_move_san")
    private String bestMoveSan;

    @Column(name = "best_move_eval_cp")
    private Integer bestMoveEvalCp;

    @Column(name = "best_move_eval_mate")
    private Integer bestMoveEvalMate;

    @Column(name = "difference_cp")
    private Integer differenceCp;

    @Column(name = "cp_loss")
    private Integer cpLoss;

    @Enumerated(EnumType.STRING)
    private MoveClassification classification;

    @Column(columnDefinition = "TEXT")
    private String pv;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

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
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getAnalysisRequestId() {
        return analysisRequestId;
    }

    public void setAnalysisRequestId(UUID analysisRequestId) {
        this.analysisRequestId = analysisRequestId;
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
