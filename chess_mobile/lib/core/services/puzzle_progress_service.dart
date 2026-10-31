import 'package:flutter/foundation.dart';

import 'storage_scope_service.dart';

/// A themed puzzle track shown on the dashboard / puzzles screens.
class PuzzleTrack {
  const PuzzleTrack({
    required this.id,
    required this.icon,
    required this.labelKey,
    required this.total,
    required this.accent,
  });

  final String id;
  final String icon;

  /// Translation key of the track label.
  final String labelKey;
  final int total;

  /// Accent tile color: blue | gold | green | slate.
  final String accent;
}

/// The five puzzle tracks of the product (labels come from the i18n table).
const List<PuzzleTrack> puzzleTracks = [
  PuzzleTrack(id: 'fork', icon: 'call_split', labelKey: 'puzzles.fork', total: 12, accent: 'blue'),
  PuzzleTrack(id: 'pin', icon: 'push_pin', labelKey: 'puzzles.pin', total: 10, accent: 'gold'),
  PuzzleTrack(
      id: 'back-rank',
      icon: 'vertical_align_top',
      labelKey: 'puzzles.backRank',
      total: 8,
      accent: 'green'),
  PuzzleTrack(
      id: 'discovered', icon: 'flare', labelKey: 'puzzles.discovered', total: 10, accent: 'slate'),
  PuzzleTrack(id: 'endgame', icon: 'flag', labelKey: 'puzzles.endgame', total: 12, accent: 'blue'),
];

/// Puzzle progress, mirroring
/// `chess-web/src/app/core/services/puzzle-progress.service.ts`.
class PuzzleProgressService extends ChangeNotifier {
  PuzzleProgressService(this._storage) {
    _state = _readState();
    _storage.addListener(_onScopeChanged);
  }

  static const String _storageKey = 'checkme.puzzles.progress.v1';

  final StorageScopeService _storage;
  late _PuzzleState _state;

  Map<String, int> get solved => Map.unmodifiable(_state.solved);
  int get attempts => _state.attempts;
  int get correct => _state.correct;
  int get streak => _state.streak;
  int get bestStreak => _state.bestStreak;
  String? get lastPlayedAt => _state.lastPlayedAt;

  int get totalSolved => _state.solved.values.fold(0, (sum, count) => sum + count);

  static const int totalPuzzles = 52; // 12 + 10 + 8 + 10 + 12

  /// Solved percentage across every attempt.
  int get accuracy => _state.attempts > 0 ? ((_state.correct / _state.attempts) * 100).round() : 0;

  void _onScopeChanged() {
    _state = _readState();
    notifyListeners();
  }

  @override
  void dispose() {
    _storage.removeListener(_onScopeChanged);
    super.dispose();
  }

  int solvedCount(String trackId) => _state.solved[trackId] ?? 0;

  int trackPercent(PuzzleTrack track) {
    if (track.total <= 0) return 0;
    return ((solvedCount(track.id) / track.total) * 100).round();
  }

  void recordAttempt(String trackId, bool success) {
    final solved = {..._state.solved};
    if (success) {
      final total = puzzleTracks
          .where((track) => track.id == trackId)
          .map((track) => track.total)
          .firstOrNull;
      solved[trackId] = ((solved[trackId] ?? 0) + 1).clamp(0, total ?? 9999);
    }

    final streak = success ? _state.streak + 1 : 0;
    _write(_PuzzleState(
      solved: solved,
      attempts: _state.attempts + 1,
      correct: _state.correct + (success ? 1 : 0),
      streak: streak,
      bestStreak: _state.bestStreak > streak ? _state.bestStreak : streak,
      lastPlayedAt: DateTime.now().toUtc().toIso8601String(),
    ));
  }

  void reset() => _write(_PuzzleState.empty());

  void _write(_PuzzleState next) {
    _state = next;
    _storage.write(_storageKey, {
      'solved': next.solved,
      'attempts': next.attempts,
      'correct': next.correct,
      'streak': next.streak,
      'bestStreak': next.bestStreak,
      'lastPlayedAt': next.lastPlayedAt,
    });
    notifyListeners();
  }

  _PuzzleState _readState() {
    final parsed = _storage.read<Map<String, dynamic>>(_storageKey);
    if (parsed == null) return _PuzzleState.empty();

    final solvedRaw = parsed['solved'];
    return _PuzzleState(
      solved: solvedRaw is Map
          ? solvedRaw.map((key, value) => MapEntry(key.toString(), (value as num?)?.toInt() ?? 0))
          : <String, int>{},
      attempts: _numberOrZero(parsed['attempts']),
      correct: _numberOrZero(parsed['correct']),
      streak: _numberOrZero(parsed['streak']),
      bestStreak: _numberOrZero(parsed['bestStreak']),
      lastPlayedAt: parsed['lastPlayedAt'] is String ? parsed['lastPlayedAt'] as String : null,
    );
  }

  static int _numberOrZero(Object? value) =>
      value is num && value.isFinite && value >= 0 ? value.toInt() : 0;
}

class _PuzzleState {
  _PuzzleState({
    required this.solved,
    required this.attempts,
    required this.correct,
    required this.streak,
    required this.bestStreak,
    required this.lastPlayedAt,
  });

  factory _PuzzleState.empty() => _PuzzleState(
        solved: <String, int>{},
        attempts: 0,
        correct: 0,
        streak: 0,
        bestStreak: 0,
        lastPlayedAt: null,
      );

  final Map<String, int> solved;
  final int attempts;
  final int correct;
  final int streak;
  final int bestStreak;
  final String? lastPlayedAt;
}
