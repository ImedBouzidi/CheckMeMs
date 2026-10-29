package imed.moveanalysisservice.service;

import static org.assertj.core.api.Assertions.assertThat;

import imed.moveanalysisservice.engine.StockfishEngine.EngineScore;
import imed.moveanalysisservice.model.MoveClassification;
import org.junit.jupiter.api.Test;

/** Engine scores are side-to-move relative; grades have to be White relative with the loss counted for the mover. */
class MoveGraderTest {

    @Test
    void mirrorsBlackScoresToWhitesPerspective() {
        MoveGrader.Grade grade = MoveGrader.grade(false, cp(200), cp(180));
        assertThat(grade.evalBeforeCp()).isEqualTo(-200);
        assertThat(grade.evalAfterCp()).isEqualTo(180);
        assertThat(grade.differenceCp()).isEqualTo(380);
        assertThat(grade.cpLoss()).isEqualTo(380);
        assertThat(grade.classification()).isEqualTo(MoveClassification.BLUNDER);
    }

    @Test
    void gradesLossesByThreshold() {
        assertThat(MoveGrader.grade(true, cp(0), cp(25)).cpLoss()).isEqualTo(25);
        assertThat(MoveGrader.grade(true, cp(0), cp(25)).classification()).isEqualTo(MoveClassification.GOOD);
        assertThat(MoveGrader.grade(true, cp(0), cp(26)).classification()).isEqualTo(MoveClassification.INACCURACY);
        assertThat(MoveGrader.grade(true, cp(0), cp(51)).classification()).isEqualTo(MoveClassification.MISTAKE);
        assertThat(MoveGrader.grade(true, cp(0), cp(101)).classification()).isEqualTo(MoveClassification.BLUNDER);
    }

    @Test
    void keepsAnImprovingMoveAtZeroLoss() {
        MoveGrader.Grade grade = MoveGrader.grade(true, cp(-40), cp(-10));
        assertThat(grade.cpLoss()).isZero();
        assertThat(grade.differenceCp()).isEqualTo(50);
        assertThat(grade.classification()).isEqualTo(MoveClassification.GOOD);
    }

    @Test
    void marksWalkingIntoMateAsABlunder() {
        MoveGrader.Grade grade = MoveGrader.grade(true, cp(0), mate(2));
        assertThat(grade.evalAfterMate()).isEqualTo(-2);
        assertThat(grade.cpLoss()).isGreaterThan(1000);
        assertThat(grade.classification()).isEqualTo(MoveClassification.BLUNDER);
    }

    @Test
    void callsAnUnavoidableMateForced() {
        MoveGrader.Grade grade = MoveGrader.grade(true, mate(-3), mate(2));
        assertThat(grade.evalBeforeMate()).isEqualTo(-3);
        assertThat(grade.classification()).isEqualTo(MoveClassification.FORCED);
    }

    @Test
    void leavesCpNullWhenTheEngineOnlyReportedMate() {
        MoveGrader.Grade grade = MoveGrader.grade(true, mate(3), cp(50));
        assertThat(grade.evalBeforeCp()).isNull();
        assertThat(grade.evalBeforeMate()).isEqualTo(3);
        assertThat(grade.evalAfterCp()).isEqualTo(-50);
        assertThat(grade.cpLoss()).isGreaterThan(1000);
        assertThat(grade.classification()).isEqualTo(MoveClassification.BLUNDER);
    }

    private static EngineScore cp(int sideToMoveCp) {
        EngineScore score = new EngineScore();
        score.cp = sideToMoveCp;
        return score;
    }

    private static EngineScore mate(int sideToMoveMate) {
        EngineScore score = new EngineScore();
        score.mate = sideToMoveMate;
        return score;
    }
}
