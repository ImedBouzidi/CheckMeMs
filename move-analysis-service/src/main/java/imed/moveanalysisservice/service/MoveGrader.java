package imed.moveanalysisservice.service;

import imed.moveanalysisservice.engine.StockfishEngine.EngineScore;
import imed.moveanalysisservice.model.MoveClassification;

/**
 * Turns the two engine scores around a played move into the numbers the API exposes. Stockfish
 * speaks from the point of view of the side to move, so every value is mirrored to White's
 * perspective before it is stored.
 */
final class MoveGrader {

    record Grade(Integer evalBeforeCp, Integer evalBeforeMate, Integer evalAfterCp, Integer evalAfterMate,
                 int cpLoss, int differenceCp, MoveClassification classification) {
    }

    /** A mate score outranks any material count, so it is pushed past every plausible cp value. */
    private static final int MATE_VALUE = 100_000;

    private MoveGrader() {
    }

    static Grade grade(boolean moverIsWhite, EngineScore before, EngineScore after) {
        int beforeWhite = whiteValue(before, moverIsWhite);
        int afterWhite = whiteValue(after, !moverIsWhite);
        boolean doomedBefore = isMateLoss(before, moverIsWhite);
        boolean doomedAfter = isMateLoss(after, !moverIsWhite);
        int cpLoss = Math.max(0, moverIsWhite ? beforeWhite - afterWhite : afterWhite - beforeWhite);
        MoveClassification classification = doomedBefore && doomedAfter
                ? MoveClassification.FORCED
                : classify(cpLoss);
        return new Grade(whiteCp(before, moverIsWhite), whiteMate(before, moverIsWhite),
                whiteCp(after, !moverIsWhite), whiteMate(after, !moverIsWhite),
                cpLoss, afterWhite - beforeWhite, classification);
    }

    private static MoveClassification classify(int cpLoss) {
        if (cpLoss <= 25) {
            return MoveClassification.GOOD;
        }
        if (cpLoss <= 50) {
            return MoveClassification.INACCURACY;
        }
        return cpLoss <= 100 ? MoveClassification.MISTAKE : MoveClassification.BLUNDER;
    }

    private static int whiteValue(EngineScore score, boolean whiteToMove) {
        if (score == null) {
            return 0;
        }
        int value = score.mate == null
                ? (score.cp == null ? 0 : score.cp)
                : (score.mate > 0 ? MATE_VALUE - Math.abs(score.mate) : -(MATE_VALUE - Math.abs(score.mate)));
        return whiteToMove ? value : -value;
    }

    static Integer whiteCp(EngineScore score, boolean whiteToMove) {
        if (score == null || score.cp == null) {
            return null;
        }
        return whiteToMove ? score.cp : -score.cp;
    }

    static Integer whiteMate(EngineScore score, boolean whiteToMove) {
        if (score == null || score.mate == null) {
            return null;
        }
        return whiteToMove ? score.mate : -score.mate;
    }

    private static boolean isMateLoss(EngineScore score, boolean whiteToMove) {
        if (score == null || score.mate == null) {
            return false;
        }
        return whiteToMove ? score.mate < 0 : score.mate > 0;
    }
}
