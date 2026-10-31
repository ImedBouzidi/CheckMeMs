import 'dart:math' as math;

import '../models/analysis.dart';

/// Move classification + evaluation presentation, mirroring
/// `chess-web/src/app/core/services/analysis.service.ts`.
class AnalysisMath {
  const AnalysisMath._();

  /// Classifies a move from the centipawn swing.
  static ({MoveGrade classification, int cpLoss}) classifyMove(
    int? cpBefore,
    int? cpAfter, {
    required bool isBestMove,
  }) {
    if (cpBefore == null || cpAfter == null) {
      return (classification: MoveGrade.book, cpLoss: 0);
    }

    if (isBestMove) {
      return (classification: MoveGrade.good, cpLoss: 0);
    }

    final cpLoss = math.max(0, cpBefore - cpAfter);

    if (cpLoss < 10) return (classification: MoveGrade.good, cpLoss: cpLoss);
    if (cpLoss < 30) return (classification: MoveGrade.inaccuracy, cpLoss: cpLoss);
    if (cpLoss < 100) return (classification: MoveGrade.mistake, cpLoss: cpLoss);
    return (classification: MoveGrade.blunder, cpLoss: cpLoss);
  }

  /// Centipawns -> win percentage using the Lichess formula.
  static double winChance(int cp) {
    final value = 50 + 50 * (2 / (1 + math.exp(-0.00368208 * cp)) - 1);
    return value.clamp(0.0, 100.0);
  }

  /// `+1.23`, `-0.45` or `M3` / `M-2`.
  static String formatEvaluation(int? cp, {int? mate}) {
    if (mate != null) return 'M$mate';
    if (cp == null) return '0.00';
    final score = cp / 100;
    return score >= 0 ? '+${score.toStringAsFixed(2)}' : score.toStringAsFixed(2);
  }

  /// Eval-bar fill percentage (0–100, White's share).
  static double evaluationBarPercentage(int? cp, {int? mate}) {
    if (mate != null) {
      if (mate > 0) return 95;
      if (mate < 0) return 5;
    }
    if (cp == null) return 50;
    return winChance(cp);
  }
}
