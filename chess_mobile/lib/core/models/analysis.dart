/// Move-analysis domain, mirroring the wire shapes of
/// `chess-web/src/app/core/services/move-analysis-api.service.ts`.
///
/// Evaluations are already mirrored to White by the engine service.

library;

/// Job lifecycle of an analysis request.
enum AnalysisJobStatus { pending, processing, partial, completed, failed }

/// Move quality labels used by the review screen.
enum MoveGrade { brilliant, great, good, inaccuracy, mistake, blunder, book, forced }

const List<MoveGrade> kMoveGrades = [
  MoveGrade.brilliant,
  MoveGrade.great,
  MoveGrade.good,
  MoveGrade.inaccuracy,
  MoveGrade.mistake,
  MoveGrade.blunder,
  MoveGrade.book,
  MoveGrade.forced,
];

MoveGrade gradeFromWire(String? value) {
  final candidate = (value ?? 'good').toLowerCase();
  for (final grade in kMoveGrades) {
    if (grade.name == candidate) return grade;
  }
  return MoveGrade.good;
}

AnalysisJobStatus analysisStatusFromWire(String? value) => switch (value) {
      'PROCESSING' => AnalysisJobStatus.processing,
      'PARTIAL' => AnalysisJobStatus.partial,
      'COMPLETED' => AnalysisJobStatus.completed,
      'FAILED' => AnalysisJobStatus.failed,
      _ => AnalysisJobStatus.pending,
    };

bool isTerminalStatus(AnalysisJobStatus status) =>
    status == AnalysisJobStatus.completed || status == AnalysisJobStatus.failed;

/// One engine-reviewed move.
class ReviewedMove {
  ReviewedMove({
    required this.ply,
    required this.moveNumber,
    required this.color,
    required this.san,
    required this.uci,
    required this.fenBefore,
    required this.fenAfter,
    this.evalBeforeCp,
    this.evalAfterCp,
    this.evalBeforeMate,
    this.evalAfterMate,
    this.bestMoveUci,
    this.bestMoveSan,
    required this.cpLoss,
    required this.grade,
    this.pv,
  });

  int ply;
  int moveNumber;

  /// `white` or `black`.
  final String color;
  final String san;
  final String uci;
  String fenBefore;
  String fenAfter;
  final int? evalBeforeCp;
  final int? evalAfterCp;
  final int? evalBeforeMate;
  final int? evalAfterMate;
  final String? bestMoveUci;
  final String? bestMoveSan;
  final int cpLoss;
  final MoveGrade grade;
  final String? pv;
}

class PlayerSummary {
  const PlayerSummary({required this.moves, required this.totalCpLoss, required this.averageCpLoss});

  final int moves;
  final int totalCpLoss;
  final double averageCpLoss;
}

class AnalysisSummary {
  const AnalysisSummary({
    required this.moves,
    required this.depth,
    required this.averageCpLoss,
    required this.classifications,
    required this.white,
    required this.black,
  });

  final int moves;
  final int depth;
  final double averageCpLoss;

  /// Count per grade.
  final Map<MoveGrade, int> classifications;
  final PlayerSummary white;
  final PlayerSummary black;
}

/// The ECO line detected for a game.
class Opening {
  const Opening({required this.eco, required this.name});

  final String eco;
  final String name;
}

/// A game carries a single ECO classification, but the two sides read it
/// differently: White steered the opening (full line name), while Black adopted
/// a defense (deep sub-lines after a comma are dropped).
class PlayerOpening {
  const PlayerOpening({required this.kind, required this.labelKey, required this.eco, required this.name});

  final String kind;

  /// `opening` or `defense`.
  final String labelKey;
  final String eco;
  final String name;
}

PlayerOpening? playerOpening(Opening? opening, String side) {
  if (opening == null) return null;
  if (side == 'white') {
    return PlayerOpening(kind: 'opening', labelKey: 'analysis.opening', eco: opening.eco, name: opening.name);
  }
  final name = opening.name.split(',').first.trim();
  return PlayerOpening(kind: 'defense', labelKey: 'analysis.defense', eco: opening.eco, name: name);
}

/// The full report of one analysis job.
class AnalysisReport {
  AnalysisReport({
    required this.requestId,
    this.gameId,
    required this.status,
    required this.moveCount,
    required this.moves,
    this.summary,
    this.opening,
  });

  final String requestId;
  final String? gameId;
  final AnalysisJobStatus status;
  final int moveCount;
  final List<ReviewedMove> moves;
  final AnalysisSummary? summary;
  final Opening? opening;
}

class LiveFinalizeResponse {
  const LiveFinalizeResponse({
    required this.requestId,
    required this.gameId,
    required this.status,
    required this.expectedPlies,
    required this.completedPlies,
  });

  final String requestId;
  final String gameId;
  final AnalysisJobStatus status;
  final int expectedPlies;
  final int completedPlies;
}

/// A move streamed to the engine service while the game is being played.
class LiveMoveAnalysisRequest {
  const LiveMoveAnalysisRequest({
    required this.gameId,
    required this.ply,
    required this.moveNumber,
    required this.color,
    required this.san,
    required this.uci,
    required this.fenBefore,
    required this.fenAfter,
  });

  final String gameId;
  final int ply;
  final int moveNumber;
  final String color;
  final String san;
  final String uci;
  final String fenBefore;
  final String fenAfter;

  Map<String, dynamic> toJson() => {
        'gameId': gameId,
        'ply': ply,
        'moveNumber': moveNumber,
        'color': color,
        'san': san,
        'uci': uci,
        'fenBefore': fenBefore,
        'fenAfter': fenAfter,
      };
}

/// A locally computed move analysis (used by the on-device fallback).
class MoveAnalysis {
  const MoveAnalysis({
    required this.moveNumber,
    required this.color,
    required this.move,
    required this.san,
    this.evalBefore,
    this.evalAfter,
    this.bestMove,
    this.bestMoveSan,
    this.difference,
    required this.classification,
    required this.cpLoss,
  });

  final int moveNumber;
  final String color;
  final String move;
  final String san;
  final int? evalBefore;
  final int? evalAfter;
  final String? bestMove;
  final String? bestMoveSan;
  final int? difference;
  final MoveGrade classification;
  final int cpLoss;
}
