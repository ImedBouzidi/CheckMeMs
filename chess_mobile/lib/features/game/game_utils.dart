import 'package:chess/chess.dart' as chess_lib;

/// Shared helpers for the play screens, mirroring the pure functions of the web
/// `game-vs-bot.component.ts`.

class TimeControlSpec {
  const TimeControlSpec({required this.baseMs, required this.incMs});

  final int baseMs;
  final int incMs;

  /// `unlimited` or malformed input yields null (no clock).
  static TimeControlSpec? parse(String tc) {
    if (tc.isEmpty || tc == 'unlimited') return null;
    final parts = tc.split('+');
    final base = int.tryParse(parts[0].trim());
    if (base == null || base <= 0) return null;
    final inc = parts.length > 1 ? (int.tryParse(parts[1].trim()) ?? 0) : 0;
    return TimeControlSpec(baseMs: base * 60 * 1000, incMs: inc * 1000);
  }
}

/// Game-type chip: bullet / blitz / rapid / classical by base minutes.
String gameTypeLabelKey(String timeControl) {
  final spec = TimeControlSpec.parse(timeControl);
  if (spec == null) return 'bot.type.unlimited';
  final minutes = spec.baseMs / 60000;
  if (minutes <= 2) return 'bot.type.bullet';
  if (minutes <= 5) return 'bot.type.blitz';
  if (minutes <= 15) return 'bot.type.rapid';
  return 'bot.type.classical';
}

String gameTypeIconName(String timeControl) {
  final spec = TimeControlSpec.parse(timeControl);
  if (spec == null) return 'all_inclusive';
  final minutes = spec.baseMs / 60000;
  if (minutes <= 2) return 'flash_on';
  if (minutes <= 5) return 'bolt';
  if (minutes <= 15) return 'speed';
  return 'hourglass_empty';
}

/// Formats a millisecond clock the way the web app does: tenths below a minute.
String formatGameClock(int ms) {
  if (ms <= 0) return '0:00';
  final totalSec = (ms / 1000).ceil();
  final mins = totalSec ~/ 60;
  final secs = totalSec % 60;
  if (mins < 1) {
    final tenths = (ms % 1000) ~/ 100;
    return '0:${secs.toString().padLeft(2, '0')}.$tenths';
  }
  return '$mins:${secs.toString().padLeft(2, '0')}';
}

/// Low on time: under 10% of base or under 30 s.
bool isTimeLow(int ms, String timeControl) {
  final spec = TimeControlSpec.parse(timeControl);
  if (spec == null) return false;
  return ms < [spec.baseMs * 0.1, 30000].reduce((a, b) => a < b ? a : b);
}

class CapturedPieces {
  const CapturedPieces({
    required this.userCaptured,
    required this.botCaptured,
    required this.userMaterialAdvantage,
    required this.botMaterialAdvantage,
  });

  /// Assets of the pieces the user took (e.g. `bq`, `bp`), biggest first.
  final List<String> userCaptured;
  final List<String> botCaptured;
  final int userMaterialAdvantage;
  final int botMaterialAdvantage;

  static const Map<String, int> _pieceValues = {'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9};
  static const Map<String, int> _initialCounts = {'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1};
  static const Map<String, int> _sortOrder = {'q': 5, 'r': 4, 'b': 3, 'n': 2, 'p': 1};

  /// [playerColor] is `white` or `black`.
  factory CapturedPieces.fromGame(chess_lib.Chess game, String playerColor) {
    final currentWhite = <String, int>{'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0};
    final currentBlack = <String, int>{'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0};

    for (final rank in '12345678'.split('')) {
      for (final file in 'abcdefgh'.split('')) {
        final piece = game.get('$file$rank');
        if (piece == null) continue;
        final type = piece.type.name; // already lowercase: p/n/b/r/q
        if (!_initialCounts.containsKey(type)) continue;
        if (piece.color == chess_lib.Color.WHITE) {
          currentWhite[type] = (currentWhite[type] ?? 0) + 1;
        } else {
          currentBlack[type] = (currentBlack[type] ?? 0) + 1;
        }
      }
    }

    final whiteCaptured = <String>[];
    final blackCaptured = <String>[];
    var whiteScore = 0;
    var blackScore = 0;

    _initialCounts.forEach((type, count) {
      final missingBlack = count - (currentBlack[type] ?? 0);
      for (var i = 0; i < missingBlack; i++) {
        whiteCaptured.add('b${type.toUpperCase()}');
      }
      final missingWhite = count - (currentWhite[type] ?? 0);
      for (var i = 0; i < missingWhite; i++) {
        blackCaptured.add('w${type.toUpperCase()}');
      }
      whiteScore += (currentWhite[type] ?? 0) * (_pieceValues[type] ?? 0);
      blackScore += (currentBlack[type] ?? 0) * (_pieceValues[type] ?? 0);
    });

    int cmp(String a, String b) =>
        (_sortOrder[b[1].toLowerCase()] ?? 0) - (_sortOrder[a[1].toLowerCase()] ?? 0);
    whiteCaptured.sort(cmp);
    blackCaptured.sort(cmp);

    final whiteIsUser = playerColor == 'white';
    return CapturedPieces(
      userCaptured: whiteIsUser ? whiteCaptured : blackCaptured,
      botCaptured: whiteIsUser ? blackCaptured : whiteCaptured,
      userMaterialAdvantage: whiteIsUser
          ? (whiteScore - blackScore).clamp(0, 1 << 30)
          : (blackScore - whiteScore).clamp(0, 1 << 30),
      botMaterialAdvantage: whiteIsUser
          ? (blackScore - whiteScore).clamp(0, 1 << 30)
          : (whiteScore - blackScore).clamp(0, 1 << 30),
    );
  }
}

/// UCI depth for a bot skill level, mirroring the web `searchDepth`.
int botSearchDepth(int skill) {
  final depth = 10 + skill ~/ 2;
  return depth < 22 ? depth : 22;
}
