/// Game history domain, mirroring
/// `chess-web/src/app/core/services/game-history.service.ts`.

library;

enum GameOutcome { win, loss, draw }

/// A finished game as shown in the history / dashboard list.
class GameHistoryEntry {
  GameHistoryEntry({
    required this.id,
    this.remoteId,
    required this.pgn,
    required this.result,
    required this.reason,
    required this.playerColor,
    required this.opponent,
    this.skillLevel,
    required this.timeControl,
    required this.playedAt,
    required this.plies,
    this.analysisRequestId,
    this.analysisStatus,
    required this.source,
  });

  factory GameHistoryEntry.fromJson(Map<String, dynamic> json) => GameHistoryEntry(
        id: json['id'] as String,
        remoteId: json['remoteId'] as String?,
        pgn: json['pgn'] as String? ?? '',
        result: gameOutcomeFromWire(json['result'] as String?),
        reason: json['reason'] as String? ?? '',
        playerColor: (json['playerColor'] as String?) == 'black' ? 'black' : 'white',
        opponent: json['opponent'] as String? ?? 'Stockfish',
        skillLevel: json['skillLevel'] as int?,
        timeControl: json['timeControl'] as String? ?? '',
        playedAt: json['playedAt'] as String? ?? '',
        plies: json['plies'] as int? ?? 0,
        analysisRequestId: json['analysisRequestId'] as String?,
        analysisStatus: json['analysisStatus'] as String?,
        source: (json['source'] as String?) == 'remote' ? 'remote' : 'local',
      );

  /// Stable id for local entries; remote entries use `remote-<uuid>`.
  final String id;
  final String? remoteId;
  final String pgn;
  final GameOutcome result;

  /// Why the game ended: checkmate / resignation / timeout / draw reason …
  final String reason;

  /// `white` or `black`.
  final String playerColor;
  final String opponent;
  final int? skillLevel;
  final String timeControl;
  final String playedAt;
  final int plies;
  final String? analysisRequestId;
  final String? analysisStatus;

  /// `local` or `remote`.
  final String source;

  Map<String, dynamic> toJson() => {
        'id': id,
        'remoteId': remoteId,
        'pgn': pgn,
        'result': gameOutcomeToWire(result),
        'reason': reason,
        'playerColor': playerColor,
        'opponent': opponent,
        'skillLevel': skillLevel,
        'timeControl': timeControl,
        'playedAt': playedAt,
        'plies': plies,
        'analysisRequestId': analysisRequestId,
        'analysisStatus': analysisStatus,
        'source': source,
      };

  GameHistoryEntry copyWith({String? remoteId, String? analysisRequestId, String? analysisStatus}) =>
      GameHistoryEntry(
        id: id,
        remoteId: remoteId ?? this.remoteId,
        pgn: pgn,
        result: result,
        reason: reason,
        playerColor: playerColor,
        opponent: opponent,
        skillLevel: skillLevel,
        timeControl: timeControl,
        playedAt: playedAt,
        plies: plies,
        analysisRequestId: analysisRequestId ?? this.analysisRequestId,
        analysisStatus: analysisStatus ?? this.analysisStatus,
        source: source,
      );
}

/// Input to [GameHistoryService.recordGame].
class NewGameHistory {
  const NewGameHistory({
    required this.pgn,
    required this.result,
    required this.reason,
    required this.playerColor,
    required this.opponent,
    this.skillLevel,
    required this.timeControl,
    this.playedAt,
    required this.plies,
    this.analysisRequestId,
  });

  final String pgn;
  final GameOutcome result;
  final String reason;
  final String playerColor;
  final String opponent;
  final int? skillLevel;
  final String timeControl;
  final String? playedAt;
  final int plies;
  final String? analysisRequestId;
}

/// Aggregated stats for the dashboard tiles.
class GameStats {
  const GameStats({
    required this.played,
    required this.wins,
    required this.losses,
    required this.draws,
    required this.analysed,
    required this.winRate,
  });

  final int played;
  final int wins;
  final int losses;
  final int draws;
  final int analysed;
  final int winRate;

  static const empty = GameStats(played: 0, wins: 0, losses: 0, draws: 0, analysed: 0, winRate: 0);
}

String gameOutcomeToWire(GameOutcome outcome) => switch (outcome) {
      GameOutcome.win => 'win',
      GameOutcome.loss => 'loss',
      GameOutcome.draw => 'draw',
    };

GameOutcome gameOutcomeFromWire(String? value) => switch (value) {
      'loss' => GameOutcome.loss,
      'draw' => GameOutcome.draw,
      _ => GameOutcome.win,
    };
