/// Engine data shapes, mirroring `chess-web/src/app/core/models/engine.models.ts`.

library;

/// One evaluation line from the engine.
class EngineEvaluation {
  const EngineEvaluation({
    required this.depth,
    required this.type,
    required this.value,
    required this.pv,
    this.nodes,
    this.nps,
    this.time,
    this.multipv,
  });

  final int depth;

  /// `cp` (centipawns) or `mate` (mate in N).
  final String type;

  /// Centipawns (positive = White better) or signed mate distance.
  final int value;

  /// Principal variation in UCI notation.
  final List<String> pv;
  final int? nodes;
  final int? nps;
  final int? time;
  final int? multipv;

  bool get isMate => type == 'mate';
}

class EngineBestMove {
  const EngineBestMove({required this.move, this.ponder});

  /// UCI move, e.g. `e2e4`.
  final String move;
  final String? ponder;
}

class EngineConfig {
  const EngineConfig({this.skillLevel, this.depth, this.movetime, this.multiPV, this.threads});

  /// 0-20 Stockfish skill level.
  final int? skillLevel;
  final int? depth;
  final int? movetime;
  final int? multiPV;
  final int? threads;
}

enum EngineStatus { uninitialized, initializing, ready, thinking, error }

/// Bot strength: the web app maps skill to ELO with `1320 + skill * 60`.
int skillToElo(int skill) => 1320 + skill * 60;
