import 'dart:async';
import 'dart:convert';

import 'package:chess/chess.dart' as chess_lib;

import '../models/analysis.dart';
import 'api_client.dart';
import 'auth_service.dart';

/// REST client for the move-analysis-service through the gateway, mirroring
/// `chess-web/src/app/core/services/move-analysis-api.service.ts`.
class MoveAnalysisApiService {
  MoveAnalysisApiService(this._auth);

  final AuthService _auth;
  late final ApiClient _api = ApiClient(_auth);

  /// Hand a finished game to the engine service; the job answers with its
  /// request id. [gameId] identifies the game for idempotency and must be a UUID.
  Future<({String requestId, AnalysisJobStatus status})> submit(String pgn, String gameId) async {
    final json = await _api.post('/analysis/submit', body: {'pgn': pgn, 'gameId': gameId})
        as Map<String, dynamic>;
    return (
      requestId: json['requestId'] as String,
      status: analysisStatusFromWire(json['status'] as String?),
    );
  }

  /// Stream one move to the engine service while the game is being played.
  Future<void> submitLiveMove(LiveMoveAnalysisRequest request) async {
    await _api.post('/analysis/live-moves', body: request.toJson());
  }

  /// Tell the engine service that no more moves will stream in for this game.
  Future<LiveFinalizeResponse> finalizeLive(String gameId, int expectedPlies, String pgn) async {
    final json = await _api.post(
      '/analysis/games/$gameId/live-moves/finalize',
      body: {'expectedPlies': expectedPlies, 'pgn': pgn},
    ) as Map<String, dynamic>;
    return LiveFinalizeResponse(
      requestId: json['requestId'] as String? ?? '',
      gameId: json['gameId'] as String? ?? gameId,
      status: analysisStatusFromWire(json['status'] as String?),
      expectedPlies: (json['expectedPlies'] as num?)?.toInt() ?? expectedPlies,
      completedPlies: (json['completedPlies'] as num?)?.toInt() ?? 0,
    );
  }

  Future<AnalysisReport> fetch(String requestId) async {
    final raw = await _api.get('/analysis/$requestId') as Map<String, dynamic>;
    return toReport(raw);
  }

  Future<AnalysisReport> fetchByGameId(String gameId) async {
    Object? lastError;
    for (var attempt = 0; attempt < 10; attempt++) {
      try {
        final raw = await _api.get('/analysis/games/$gameId') as Map<String, dynamic>;
        return toReport(raw);
      } catch (error) {
        lastError = error;
        await Future<void>.delayed(const Duration(milliseconds: 500));
      }
    }
    throw lastError ?? Exception('analysis unavailable');
  }

  /// Emits on every poll and completes once the job reaches a terminal status,
  /// so callers can show live progress without wiring their own timer.
  Stream<AnalysisReport> watch(String requestId, {int intervalMs = 2000}) =>
      _pollUntilTerminal(() => fetch(requestId), intervalMs);

  /// Same as [watch], but for a game that was analysed ply by ply while played.
  Stream<AnalysisReport> watchByGameId(String gameId, {int intervalMs = 2000}) =>
      _pollUntilTerminal(() => fetchByGameId(gameId), intervalMs);

  Stream<AnalysisReport> _pollUntilTerminal(
    Future<AnalysisReport> Function() read,
    int intervalMs,
  ) async* {
    while (true) {
      final report = await read();
      yield report;
      if (isTerminalStatus(report.status)) return;
      await Future<void>.delayed(Duration(milliseconds: intervalMs));
    }
  }

  AnalysisReport toReport(Map<String, dynamic> raw) {
    final moves = ((raw['moves'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(toReviewedMove)
        .toList();
    ensurePositions(moves);

    final eco = raw['openingEco'] as String?;
    final name = raw['openingName'] as String?;
    return AnalysisReport(
      requestId: raw['requestId'] as String? ?? '',
      gameId: raw['gameId'] as String?,
      status: analysisStatusFromWire(raw['status'] as String?),
      moveCount: (raw['moveCount'] as num?)?.toInt() ?? 0,
      moves: moves,
      summary: parseSummary(raw['summary']),
      opening: (eco != null && eco.isNotEmpty) || (name != null && name.isNotEmpty)
          ? Opening(eco: eco ?? '', name: name ?? '')
          : null,
    );
  }

  /// Some deployments only return the engine fields. Rebuild the missing plies
  /// and FENs from the move list so the board can always be rendered.
  void ensurePositions(List<ReviewedMove> moves) {
    if (moves.isEmpty) return;

    final game = chess_lib.Chess();
    for (var index = 0; index < moves.length; index++) {
      final move = moves[index];
      if (move.ply == 0) move.ply = index + 1;

      if (move.fenBefore.isNotEmpty) {
        try {
          game.load(move.fenBefore);
        } catch (_) {
          /* keep the replay position */
        }
      } else {
        move.fenBefore = game.fen;
      }

      var applied = false;
      try {
        if (move.uci.length >= 4) {
          applied = game.move({
            'from': move.uci.substring(0, 2),
            'to': move.uci.substring(2, 4),
            if (move.uci.length > 4) 'promotion': move.uci[4],
          });
        } else if (move.san.isNotEmpty) {
          applied = game.move(move.san);
        }
      } catch (_) {
        applied = false;
      }

      if (move.fenAfter.isEmpty) {
        move.fenAfter = applied ? game.fen : move.fenBefore;
      }
    }
  }

  ReviewedMove toReviewedMove(Map<String, dynamic> move) => ReviewedMove(
        ply: (move['ply'] as num?)?.toInt() ?? 0,
        moveNumber: (move['moveNumber'] as num?)?.toInt() ?? 0,
        color: move['color'] == 'black' ? 'black' : 'white',
        san: move['san'] as String? ?? '',
        uci: move['uci'] as String? ?? '',
        fenBefore: move['fenBefore'] as String? ?? '',
        fenAfter: move['fenAfter'] as String? ?? '',
        evalBeforeCp: (move['evalBeforeCp'] as num?)?.toInt(),
        evalAfterCp: (move['evalAfterCp'] as num?)?.toInt(),
        evalBeforeMate: (move['evalBeforeMate'] as num?)?.toInt(),
        evalAfterMate: (move['evalAfterMate'] as num?)?.toInt(),
        bestMoveUci: move['bestMoveUci'] as String?,
        bestMoveSan: move['bestMoveSan'] as String?,
        cpLoss: (move['cpLoss'] as num?)?.toInt() ?? 0,
        grade: gradeFromWire(move['classification'] as String?),
        pv: move['pv'] as String?,
      );

  AnalysisSummary? parseSummary(Object? summary) {
    if (summary == null) return null;

    try {
      final Object? parsed;
      if (summary is String) {
        final decoded = jsonDecode(summary);
        parsed = decoded is Map<String, dynamic> ? decoded : null;
      } else {
        parsed = summary;
      }
      if (parsed is! Map) return null;

      final players = parsed['players'];
      final white = players is Map ? (players['white'] as Map? ?? const {}) : const {};
      final black = players is Map ? (players['black'] as Map? ?? const {}) : const {};
      final classifications = parsed['classifications'];

      return AnalysisSummary(
        moves: (parsed['moves'] as num?)?.toInt() ?? 0,
        depth: (parsed['depth'] as num?)?.toInt() ?? 0,
        averageCpLoss: (parsed['averageCpLoss'] as num?)?.toDouble() ?? 0,
        classifications: toClassifications(classifications),
        white: PlayerSummary(
          moves: (white['moves'] as num?)?.toInt() ?? 0,
          totalCpLoss: (white['totalCpLoss'] as num?)?.toInt() ?? 0,
          averageCpLoss: (white['averageCpLoss'] as num?)?.toDouble() ?? 0,
        ),
        black: PlayerSummary(
          moves: (black['moves'] as num?)?.toInt() ?? 0,
          totalCpLoss: (black['totalCpLoss'] as num?)?.toInt() ?? 0,
          averageCpLoss: (black['averageCpLoss'] as num?)?.toDouble() ?? 0,
        ),
      );
    } catch (_) {
      return null;
    }
  }

  Map<MoveGrade, int> toClassifications(Object? raw) {
    final counts = <MoveGrade, int>{};
    if (raw is! Map) return counts;

    raw.forEach((key, value) {
      counts[gradeFromWire(key.toString())] = value is num ? value.toInt() : 0;
    });
    return counts;
  }
}
