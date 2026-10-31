import 'dart:convert';

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/foundation.dart';

import '../models/game_history.dart';
import 'api_client.dart';
import 'auth_service.dart';
import 'storage_scope_service.dart';

/// Device history + games-service sync, mirroring
/// `chess-web/src/app/core/services/game-history.service.ts`.
class GameHistoryService extends ChangeNotifier {
  GameHistoryService(this._auth, this._storage) {
    _localGames = _readLocal();
    _storage.addListener(_onScopeChanged);
  }

  static const String _storageKey = 'checkme.games.history.v1';
  static const int _maxLocalGames = 40;

  final AuthService _auth;
  final StorageScopeService _storage;
  late final ApiClient _api = ApiClient(_auth);

  List<GameHistoryEntry> _localGames = [];
  List<GameHistoryEntry> _remoteGames = [];
  bool _loading = false;
  bool _remoteError = false;

  /// The signed-in player's games merged with the device history.
  List<GameHistoryEntry> get games => mergeGames(_localGames, _remoteGames);

  bool get loading => _loading;

  bool get remoteError => _remoteError;

  GameStats get stats {
    final list = games;
    final played = list.length;
    final wins = list.where((game) => game.result == GameOutcome.win).length;
    final losses = list.where((game) => game.result == GameOutcome.loss).length;
    final draws = list.where((game) => game.result == GameOutcome.draw).length;
    final analysed = list.where((game) => game.analysisRequestId != null).length;

    return GameStats(
      played: played,
      wins: wins,
      losses: losses,
      draws: draws,
      analysed: analysed,
      winRate: played > 0 ? ((wins / played) * 100).round() : 0,
    );
  }

  void _onScopeChanged() {
    // Switching accounts swaps the whole history.
    _localGames = _readLocal();
    loadRemote();
    notifyListeners();
  }

  @override
  void dispose() {
    _storage.removeListener(_onScopeChanged);
    super.dispose();
  }

  /// Persist a finished game on this device, then mirror it to games-service
  /// when signed in. Returns the entry id.
  String recordGame(NewGameHistory input) {
    final entry = GameHistoryEntry(
      id: _createId(),
      remoteId: null,
      pgn: input.pgn,
      result: input.result,
      reason: input.reason,
      playerColor: input.playerColor,
      opponent: input.opponent,
      skillLevel: input.skillLevel,
      timeControl: input.timeControl,
      playedAt: input.playedAt ?? DateTime.now().toUtc().toIso8601String(),
      plies: input.plies,
      analysisRequestId: input.analysisRequestId,
      analysisStatus: input.analysisRequestId != null ? 'REQUESTED' : null,
      source: 'local',
    );

    _localGames = [entry, ..._localGames].take(_maxLocalGames).toList();
    _persist();
    notifyListeners();
    _syncToServer(entry);
    return entry.id;
  }

  void attachAnalysis(String? id, String requestId) {
    if (id == null) return;
    _localGames = _localGames
        .map((game) =>
            game.id == id ? game.copyWith(analysisRequestId: requestId, analysisStatus: 'REQUESTED') : game)
        .toList();
    _remoteGames = _remoteGames
        .map((game) =>
            game.id == id ? game.copyWith(analysisRequestId: requestId, analysisStatus: 'REQUESTED') : game)
        .toList();
    _persist();
    notifyListeners();
  }

  void updateAnalysisStatus(String id, String status) {
    _localGames =
        _localGames.map((game) => game.id == id ? game.copyWith(analysisStatus: status) : game).toList();
    _remoteGames =
        _remoteGames.map((game) => game.id == id ? game.copyWith(analysisStatus: status) : game).toList();
    _persist();
    notifyListeners();
  }

  /// Merges the signed-in player's games from games-service with the device history.
  Future<void> loadRemote() async {
    if (!_auth.isAuthenticated) {
      _remoteGames = [];
      _remoteError = false;
      _loading = false;
      notifyListeners();
      return;
    }

    _loading = true;
    _remoteError = false;
    notifyListeners();

    try {
      final page = await _api.get('/games?size=20&sort=createdAt,desc') as Map<String, dynamic>;
      final content = (page['content'] as List?)?.whereType<Map<String, dynamic>>() ?? const [];
      _remoteGames = content.map(fromRemote).toList();
      _loading = false;
    } catch (_) {
      _remoteGames = [];
      _remoteError = true;
      _loading = false;
    }
    notifyListeners();
  }

  Future<void> _syncToServer(GameHistoryEntry entry) async {
    if (!_auth.isAuthenticated) return;
    final user = _auth.currentUser;
    if (user == null) return;

    final metadata = {
      'opponent': entry.opponent,
      'playerColor': entry.playerColor,
      'reason': entry.reason,
      'plies': entry.plies,
      if (entry.skillLevel != null) 'skillLevel': entry.skillLevel,
    };

    final body = {
      'pgn': entry.pgn,
      'whitePlayerId': entry.playerColor == 'white' ? user.id : 'stockfish',
      'blackPlayerId': entry.playerColor == 'black' ? user.id : 'stockfish',
      'result': remoteResult(entry),
      'status': 'COMPLETED',
      'mode': 'BOT',
      'timeControl': entry.timeControl,
      'metadata': jsonEncode(metadata),
      'submitForAnalysis': false,
    };

    try {
      final remote = await _api.post('/games', body: body) as Map<String, dynamic>;
      final remoteId = remote['id'] as String?;
      if (remoteId != null) {
        _localGames = _localGames
            .map((game) => game.id == entry.id ? game.copyWith(remoteId: remoteId) : game)
            .toList();
        _persist();
        notifyListeners();
      }
    } catch (_) {
      // A failed sync must never lose the local record.
    }
  }

  GameHistoryEntry fromRemote(Map<String, dynamic> game) {
    final metadata = parseMetadata(game['metadata'] as String?);
    final user = _auth.currentUser;
    final userIds = [user?.id, user?.username].whereType<String>().toList();

    String playerColor = metadata['playerColor'] as String? ?? 'white';
    if (metadata['playerColor'] == null && userIds.isNotEmpty) {
      final blackId = game['blackPlayerId'] as String?;
      final whiteId = game['whitePlayerId'] as String?;
      if (blackId != null && userIds.contains(blackId)) {
        playerColor = 'black';
      } else if (whiteId != null && userIds.contains(whiteId)) {
        playerColor = 'white';
      }
    }

    final opponent = metadata['opponent'] as String? ??
        (playerColor == 'white' ? game['blackPlayerId'] : game['whitePlayerId']) as String? ??
        'Stockfish';

    final pgn = game['pgn'] as String? ?? '';
    return GameHistoryEntry(
      id: 'remote-${game['id']}',
      remoteId: game['id'] as String?,
      pgn: pgn,
      result: outcome(game['result'] as String?, playerColor),
      reason: metadata['reason'] as String? ?? '',
      playerColor: playerColor,
      opponent: opponent,
      skillLevel: (metadata['skillLevel'] as num?)?.toInt(),
      timeControl: game['timeControl'] as String? ?? '',
      playedAt: (game['endedAt'] as String?) ??
          (game['createdAt'] as String?) ??
          DateTime.now().toUtc().toIso8601String(),
      plies: (metadata['plies'] as num?)?.toInt() ?? countPlies(pgn),
      analysisRequestId: game['analysisRequestId'] as String?,
      analysisStatus: game['analysisStatus'] as String?,
      source: 'remote',
    );
  }

  static GameOutcome outcome(String? result, String playerColor) {
    if (result == 'WHITE_WIN') {
      return playerColor == 'white' ? GameOutcome.win : GameOutcome.loss;
    }
    if (result == 'BLACK_WIN') {
      return playerColor == 'black' ? GameOutcome.win : GameOutcome.loss;
    }
    return GameOutcome.draw;
  }

  static String remoteResult(GameHistoryEntry entry) {
    if (entry.result == GameOutcome.draw) return 'DRAW';
    if (entry.result == GameOutcome.win) {
      return entry.playerColor == 'white' ? 'WHITE_WIN' : 'BLACK_WIN';
    }
    return entry.playerColor == 'white' ? 'BLACK_WIN' : 'WHITE_WIN';
  }

  void _persist() {
    _storage.write(_storageKey, _localGames.map((game) => game.toJson()).toList());
  }

  List<GameHistoryEntry> _readLocal() {
    final parsed = _storage.read<List<dynamic>>(_storageKey);
    if (parsed == null) return [];
    return parsed
        .whereType<Map<String, dynamic>>()
        .where(isEntry)
        .map(GameHistoryEntry.fromJson)
        .take(_maxLocalGames)
        .toList();
  }
}

/// Local games win over their remote copies so the review link is never lost.
List<GameHistoryEntry> mergeGames(List<GameHistoryEntry> local, List<GameHistoryEntry> remote) {
  final seen = <String>{};
  final merged = <GameHistoryEntry>[];

  for (final game in local) {
    final key = game.remoteId ?? game.id;
    if (!seen.add(key)) continue;
    merged.add(game);
  }

  for (final game in remote) {
    final key = game.remoteId ?? game.id;
    if (seen.contains(key)) continue;
    if (local.any((entry) => entry.pgn.isNotEmpty && entry.pgn == game.pgn)) continue;
    seen.add(key);
    merged.add(game);
  }

  merged.sort((a, b) => DateTime.parse(b.playedAt).compareTo(DateTime.parse(a.playedAt)));
  return merged;
}

bool isEntry(Map<String, dynamic> value) {
  final id = value['id'];
  final pgn = value['pgn'];
  final result = value['result'];
  final playerColor = value['playerColor'];
  final playedAt = value['playedAt'];
  return id is String &&
      pgn is String &&
      (result == 'win' || result == 'loss' || result == 'draw') &&
      (playerColor == 'white' || playerColor == 'black') &&
      playedAt is String;
}

Map<String, dynamic> parseMetadata(String? raw) {
  if (raw == null || raw.isEmpty) return {};
  try {
    final parsed = jsonDecode(raw);
    if (parsed is Map<String, dynamic>) return parsed;
  } catch (_) {}
  return {};
}

int countPlies(String pgn) {
  if (pgn.isEmpty) return 0;
  try {
    final game = chess_lib.Chess();
    game.load_pgn(pgn);
    return game.history.length;
  } catch (_) {
    return 0;
  }
}

String _createId() {
  final rand = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
  final suffix = (DateTime.now().microsecondsSinceEpoch & 0xFFFFFF).toRadixString(36);
  return 'game-$rand-$suffix';
}
