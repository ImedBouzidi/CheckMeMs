import 'dart:async';
import 'dart:math' as math;

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/course.dart' show BoardArrow;
import '../../core/services/instructor_voice_service.dart';
import '../../routing/app_router.dart';
import '../../ui/board/board_theme.dart';
import '../../ui/board/chess_board_view.dart';
import '../../ui/widgets/kids_widgets.dart';
import 'kid_pieces.dart';
import 'kids_copy.dart';

/// Kids piece trainer — the Flutter port of
/// `chess-web/src/app/features/home/kids-learn.component.ts`.
///
/// The rules, timings and copy follow the web component one-to-one: an empty
/// board, one white piece to play with forever, two black pawns as capture
/// targets, every legal square tinted, an arrow to a suggested square and the
/// Professor Hoot dialogue bubble with its voice.
class KidsLearnScreen extends StatefulWidget {
  const KidsLearnScreen({super.key});

  @override
  State<KidsLearnScreen> createState() => _KidsLearnScreenState();
}

/// Which instructor sentence the bubble shows. The web stores the resolved
/// string; storing the source instead keeps the copy in sync when the child
/// switches language mid-lesson.
enum _HintSource {
  welcome,
  emptyBoard,
  practice,
  wrongPiece,
  wrongMove,
  goodCapture,
  goodMove,
}

enum _FeedbackKind { good, wrong }

class _Feedback {
  const _Feedback({
    required this.kind,
    required this.title,
    required this.message,
  });

  final _FeedbackKind kind;
  final String title;
  final String message;
}

class _KidsLearnScreenState extends State<KidsLearnScreen> {
  static const String _emptyFen = '8/8/8/8/8/8/8/8 w - - 0 1';
  static const List<String> _files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  final chess_lib.Chess _game = chess_lib.Chess();

  KidPiece? _practicePiece;
  String? _practiceSquare;
  Set<String> _targets = const {};
  BoardArrow? _arrow;
  int _possibleSquares = 0;
  bool _selected = false;

  _HintSource _hintSource = _HintSource.welcome;
  _Feedback? _feedback;

  bool _voiceEnabled = true;

  Timer? _markerTimer;
  Timer? _feedbackTimer;
  late final InstructorVoiceService _voice;

  @override
  void initState() {
    super.initState();
    _voice = InstructorVoiceService();
    _game.load(_emptyFen, check_validity: false);
  }

  @override
  void dispose() {
    _markerTimer?.cancel();
    _feedbackTimer?.cancel();
    _voice.dispose();
    super.dispose();
  }

  /* ------------------- practice ------------------- */

  Future<void> _openPiece(KidPiece piece) async {
    _stopSpeaking();
    _dismissFeedback();
    final chosen = await showKidPiecePopup(
      context,
      piece: piece,
      showTryMe: true,
    );
    if (!mounted || chosen == null) return;
    _startPractice(chosen);
  }

  void _startPractice(KidPiece piece) {
    _cancelTimers();
    _dismissFeedback();
    _stopSpeaking();

    final setup = kidPracticeSetups[piece.name];
    if (setup == null) return;

    _game.load(_practiceFen(piece, setup), check_validity: false);
    setState(() {
      _practicePiece = piece;
      _practiceSquare = setup.start;
      _selected = false;
      _targets = const {};
      _arrow = null;
      _possibleSquares = 0;
      _hintSource = _HintSource.practice;
    });

    _speakHint();
    // The web waits for the piece animation before it paints the markers.
    _markerTimer = Timer(const Duration(milliseconds: 300), _highlight);
  }

  void _clearBoard() {
    _cancelTimers();
    _stopSpeaking();

    _game.load(_emptyFen, check_validity: false);
    setState(() {
      _practicePiece = null;
      _practiceSquare = null;
      _targets = const {};
      _arrow = null;
      _possibleSquares = 0;
      _selected = false;
      _hintSource = _HintSource.emptyBoard;
      _feedback = null;
    });
  }

  /// White piece on the setup square, a black pawn on each capture square.
  static String _practiceFen(KidPiece piece, KidPracticeSetup setup) {
    final letters = <String, String>{
      setup.start: kidPieceLetter(piece.name).toUpperCase(),
      for (final square in setup.pawns) square: 'p',
    };

    final ranks = <String>[];
    for (var rank = 8; rank >= 1; rank--) {
      final buffer = StringBuffer();
      var empty = 0;
      for (final file in _files) {
        final letter = letters['$file$rank'];
        if (letter == null) {
          empty++;
        } else {
          if (empty > 0) buffer.write(empty);
          empty = 0;
          buffer.write(letter);
        }
      }
      if (empty > 0) buffer.write(empty);
      ranks.add(buffer.isEmpty ? '8' : buffer.toString());
    }
    return '${ranks.join('/')} w - - 0 1';
  }

  /* ------------------- input ------------------- */

  List<Map<String, dynamic>> _moves({required String square}) => _game
      .moves({'verbose': true, 'square': square})
      .whereType<Map<String, dynamic>>()
      .toList(growable: false);

  bool _hasPiece(String square) => _game.get(square) != null;

  void _onSquareTap(String square) {
    final start = _practiceSquare;
    if (_practicePiece == null || start == null) return;

    if (square == start) {
      // cm-chessboard's moveInputStarted on the piece being practised.
      if (!_selected) setState(() => _selected = true);
      _highlight();
      return;
    }

    if (!_selected) {
      if (_hasPiece(square)) _wrongPiece();
      return;
    }

    _validateAndMove(start, square);
  }

  void _onMoveAttempt(String from, String to) {
    final start = _practiceSquare;
    if (_practicePiece == null || start == null) return;

    if (from != start) {
      if (_hasPiece(from)) _wrongPiece();
      return;
    }
    _validateAndMove(from, to);
  }

  void _wrongPiece() {
    setState(() {
      _hintSource = _HintSource.wrongPiece;
      _selected = false;
    });
    _showFeedback(
      _FeedbackKind.wrong,
      'wrongPieceTitle',
      'wrongPieceMessage',
      speak: true,
    );
  }

  void _wrongMove() {
    setState(() {
      _hintSource = _HintSource.wrongMove;
      _selected = false;
    });
    _showFeedback(
      _FeedbackKind.wrong,
      'wrongMoveTitle',
      'tryGlowing',
      speak: true,
    );
    _highlight();
  }

  void _validateAndMove(String from, String to) {
    final move = _moves(square: from)
        .where((candidate) => candidate['to'] == to)
        .firstOrNull;
    if (move == null) {
      _wrongMove();
      return;
    }
    _makePracticeMove(from, to, move);
  }

  /// The verbose move list collapses a promotion into four entries with the same
  /// destination, so the map lookup only succeeds when the queen is named.
  bool _isPromotion(String from, String to) =>
      _game.get(from)?.type == chess_lib.PieceType.PAWN &&
      _game.get(from)?.color == chess_lib.Color.WHITE &&
      to.endsWith('8');

  void _makePracticeMove(String from, String to, Map<String, dynamic> move) {
    final promotion = _isPromotion(from, to) ? 'q' : null;
    final played = _game.move({
      'from': from,
      'to': to,
      'promotion': ?promotion,
    });
    if (!played) {
      _wrongMove();
      return;
    }

    // Keep it White's turn forever, so kids can try as many moves as they like.
    _game.load(_asWhiteToMove(_game.fen), check_validity: false);

    final captured = move['captured'] != null;
    setState(() {
      _practiceSquare = to;
      _selected = false;
      _targets = const {};
      _arrow = null;
      _hintSource = captured ? _HintSource.goodCapture : _HintSource.goodMove;
      _feedback = null;
    });

    _showFeedback(
      _FeedbackKind.good,
      captured ? 'goodCaptureTitle' : 'goodMoveTitle',
      captured ? 'goodCaptureMessage' : 'goodMoveMessage',
      speak: true,
    );
    _markerTimer = Timer(const Duration(milliseconds: 450), _highlight);
  }

  static String _asWhiteToMove(String fen) {
    final parts = fen.split(' ');
    parts[1] = 'w';
    return parts.join(' ');
  }

  void _highlight() {
    final start = _practiceSquare;
    if (!mounted || _practicePiece == null || start == null) return;

    final moves = _moves(square: start);
    final targets = <String>{};
    String? suggested;
    for (final move in moves) {
      final to = move['to'] as String;
      targets.add(to);
      final isCapture = move['captured'] != null || _hasPiece(to);
      suggested ??= (!isCapture ? to : null);
    }
    suggested ??= moves.isEmpty ? null : moves.first['to'] as String;

    setState(() {
      _targets = targets;
      _possibleSquares = targets.length;
      _arrow = suggested == null
          ? null
          : BoardArrow(from: start, to: suggested);
    });
  }

  /* ------------------- instructor dialogue ------------------- */

  void _showFeedback(
    _FeedbackKind kind,
    String title,
    String message, {
    required bool speak,
  }) {
    final language = context.read<LanguageService>();
    setState(() {
      _feedback = _Feedback(
        kind: kind,
        title: language.instructor(title),
        message: language.instructor(message, _pieceParam(language)),
      );
    });
    _feedbackTimer?.cancel();
    _feedbackTimer = Timer(const Duration(milliseconds: 2800), () {
      if (!mounted) return;
      setState(() {
        _feedback = null;
        if (_practicePiece != null) _hintSource = _HintSource.practice;
      });
    });
    if (speak) {
      _speak(
        '${language.instructor(title)} ${language.instructor(message, _pieceParam(language))}',
      );
    }
  }

  void _dismissFeedback() {
    _feedbackTimer?.cancel();
    _feedbackTimer = null;
    if (_feedback != null && mounted) setState(() => _feedback = null);
  }

  Map<String, Object> _pieceParam(LanguageService language) => {
    'piece': language.pieceCopy(_practicePiece?.name ?? 'Pawn', 'sentenceName'),
  };

  String _hintText(LanguageService language) => switch (_hintSource) {
    _HintSource.welcome => language.instructor('welcome'),
    _HintSource.emptyBoard => language.instructor('emptyBoard'),
    _HintSource.practice => language.instructor(
      'practiceIntro',
      _pieceParam(language),
    ),
    _HintSource.wrongPiece => language.instructor(
      'wrongPieceMessage',
      _pieceParam(language),
    ),
    _HintSource.wrongMove => language.instructor('wrongMoveShort'),
    _HintSource.goodCapture => language.instructor('goodCaptureHint'),
    _HintSource.goodMove => language.instructor('goodMoveHint'),
  };

  void _toggleVoice() {
    setState(() => _voiceEnabled = !_voiceEnabled);
    if (_voiceEnabled) {
      _speakHint();
    } else {
      _stopSpeaking();
    }
  }

  void _sayHint() {
    setState(() => _voiceEnabled = true);
    _speakHint();
  }

  void _speakHint() => _speak(_hintText(context.read<LanguageService>()));

  void _speak(String text) {
    if (!_voiceEnabled) return;
    final language = context.read<LanguageService>();
    unawaited(
      _voice.speak(text, code: language.code, speechLang: language.speechLang),
    );
  }

  void _stopSpeaking() => _voice.stop();

  void _changeLanguage(String code) {
    final language = context.read<LanguageService>();
    final previous = language.code;
    if (previous == code) return;

    _stopSpeaking();
    _dismissFeedback();
    language.setLanguage(code);
    setState(() => _voiceEnabled = true);
    _speakHint();
  }

  void _cancelTimers() {
    _markerTimer?.cancel();
    _markerTimer = null;
    _feedbackTimer?.cancel();
    _feedbackTimer = null;
  }

  /* --------------------------- layout --------------------------- */

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();

    return Stack(
      children: [
        Positioned.fill(
          child: KidsWorld(
            decor: KidWorldDecor.learn,
            maxWidth: 1180,
            padding: const EdgeInsets.fromLTRB(22, 18, 22, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _LearnHeader(
                  language: language,
                  onHome: () => context.go(AppRoutes.kids),
                  onLanguage: _changeLanguage,
                  onClear: _clearBoard,
                ),
                const SizedBox(height: 26),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final board = _boardPanel(language);
                    final sidebar = _PieceSidebar(
                      language: language,
                      practicePiece: _practicePiece,
                      onTap: _openPiece,
                    );
                    if (constraints.maxWidth < 980) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [board, const SizedBox(height: 26), sidebar],
                      );
                    }
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: board),
                        const SizedBox(width: 26),
                        SizedBox(width: 300, child: sidebar),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 22),
                _LearnFooter(
                  language: language,
                  onHome: () => context.go(AppRoutes.home),
                ),
              ],
            ),
          ),
        ),
        if (_feedback != null)
          Positioned(
            left: 14,
            right: 14,
            bottom: 22,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 470),
                child: _FeedbackBanner(
                  feedback: _feedback!,
                  closeLabel: language.kids('learn.closeMessage'),
                  onDismiss: _dismissFeedback,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _boardPanel(LanguageService language) {
    final hint = _hintText(language);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 700),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _CoachRow(
              language: language,
              hint: hint,
              voiceEnabled: _voiceEnabled,
              speaking: _voice.speaking,
              onToggleVoice: _toggleVoice,
              onSpeak: _sayHint,
            ),
            if (_practicePiece != null) ...[
              _LegendRow(language: language, possibleSquares: _possibleSquares),
              const SizedBox(height: 12),
            ],
            _LearnBoardFrame(
              practising: _practicePiece != null,
              child: ChessBoardView(
                fen: _game.fen,
                interactive: _practicePiece != null,
                theme: kKidsBoardTheme,
                markers: kKidsLearnBoardMarkers,
                selectedSquare: _targets.isEmpty && !_selected
                    ? null
                    : _practiceSquare,
                legalTargets: _targets,
                arrows: _arrow == null ? const [] : [_arrow!],
                hintArrowColor: kKidsArrowColor,
                onSquareTap: _onSquareTap,
                onMoveAttempt: _onMoveAttempt,
              ),
            ),
            _PracticeBar(
              language: language,
              piece: _practicePiece,
              onTap: _openPiece,
              onClear: _clearBoard,
            ),
          ],
        ),
      ),
    );
  }
}

/* --------------------------- header --------------------------- */

class _LearnHeader extends StatelessWidget {
  const _LearnHeader({
    required this.language,
    required this.onHome,
    required this.onLanguage,
    required this.onClear,
  });

  final LanguageService language;
  final VoidCallback onHome;
  final ValueChanged<String> onLanguage;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final homePill = KidPill(
      label: language.kids('common.kidsHome'),
      emoji: '🏠',
      color: kKidBrown,
      background: kKidWhite,
      onTap: onHome,
    );

    final title = _LearnTitle(language: language);

    final actions = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        KidPill(
          label: '',
          child: KidLanguagePicker(
            languages: language.languages,
            selected: language.code,
            onSelected: onLanguage,
          ),
        ),
        const SizedBox(width: 10),
        KidPill(
          label: language.kids('learn.clearBoard'),
          emoji: '🧹',
          color: const Color(0xFF9D174D),
          background: const Color(0xFFFCE7F3),
          shadowColor: const Color(0x59FBCFE8),
          onTap: onClear,
        ),
      ],
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 620) {
          return Column(
            children: [
              Center(child: title),
              const SizedBox(height: 10),
              Row(children: [homePill, const Spacer(), actions]),
            ],
          );
        }
        return Row(
          children: [
            homePill,
            Expanded(child: Center(child: title)),
            actions,
          ],
        );
      },
    );
  }
}

class _LearnTitle extends StatelessWidget {
  const _LearnTitle({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xB8FFFFFF),
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(color: Color(0x99C4B5FD), offset: Offset(0, 4)),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const KidWiggle(
            child: Text('🧩', style: TextStyle(fontSize: 23, height: 1.2)),
          ),
          const SizedBox(width: 8),
          Text(
            '${language.kids('learn.pageTitlePrefix')} ',
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w700,
              color: kKidText,
            ),
          ),
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: [Color(0xFFEC4899), Color(0xFF8B5CF6), Color(0xFF3B82F6)],
            ).createShader(bounds),
            child: Text(
              language.kids('learn.pageTitleStrong'),
              style: const TextStyle(
                color: kKidWhite,
                fontWeight: FontWeight.w800,
                fontSize: 19,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/* --------------------------- coach --------------------------- */

class _CoachRow extends StatelessWidget {
  const _CoachRow({
    required this.language,
    required this.hint,
    required this.voiceEnabled,
    required this.speaking,
    required this.onToggleVoice,
    required this.onSpeak,
  });

  final LanguageService language;
  final String hint;
  final bool voiceEnabled;
  final ValueListenable<bool> speaking;
  final VoidCallback onToggleVoice;
  final VoidCallback onSpeak;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ValueListenableBuilder<bool>(
            valueListenable: speaking,
            builder: (context, talking, _) => _CoachAvatar(talking: talking),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: 6, bottom: 4),
                  child: Row(
                    children: [
                      Text(
                        language.instructor('coachName').toUpperCase(),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.9,
                          color: Color(0xFF0369A1),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _RoundIconButton(
                        size: 28,
                        emoji: voiceEnabled ? '🔊' : '🔇',
                        background: const Color(0xFFE0F2FE),
                        shadow: const Color(0xFFBAE6FD),
                        tooltip: voiceEnabled
                            ? language.kids('learn.voiceOnTitle')
                            : language.kids('learn.voiceOffTitle'),
                        label: voiceEnabled
                            ? language.kids('learn.voiceOnLabel')
                            : language.kids('learn.voiceOffLabel'),
                        onTap: onToggleVoice,
                      ),
                    ],
                  ),
                ),
                _CoachBubble(
                  message: hint,
                  label: language.kids('learn.sayAgain'),
                  hearLabel: language.kids('learn.hearAgain'),
                  onSpeak: onSpeak,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 🦉 with the `coach-bob` idle motion, or the faster `coach-talk` while speaking.
class _CoachAvatar extends StatelessWidget {
  const _CoachAvatar({required this.talking});

  final bool talking;

  @override
  Widget build(BuildContext context) {
    if (!kidsMotionEnabled(context)) return _avatar(0, 0, 1);

    return KidLoop(
      period: Duration(milliseconds: talking ? 340 : 2800),
      builder: (context, t) {
        final wave = math.sin(t * math.pi);
        if (talking) {
          // `coach-talk`: lift 4px, rock ±3°, grow to 1.07.
          return _avatar(
            -4 * wave,
            (-3 + 6 * wave) * math.pi / 180,
            1 + 0.07 * wave,
          );
        }
        // `coach-bob`: lift 6px, rock ±2°.
        return _avatar(-6 * wave, (-2 + 4 * wave) * math.pi / 180, 1);
      },
    );
  }

  Widget _avatar(double lift, double angle, double scale) {
    return Transform.translate(
      offset: Offset(0, lift),
      child: Transform.rotate(
        angle: angle,
        alignment: Alignment.center,
        child: Transform.scale(
          scale: scale,
          child: Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFA5F3FC), Color(0xFFBAE6FD)],
              ),
              boxShadow: const [
                BoxShadow(color: Color(0xFF38BDF8), offset: Offset(0, 6)),
                BoxShadow(
                  color: Color(0xA638BDF8),
                  blurRadius: 18,
                  offset: Offset(0, 10),
                  spreadRadius: -8,
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Text('🦉', style: TextStyle(fontSize: 32, height: 1.2)),
                Positioned(
                  right: 3,
                  bottom: 2,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF22C55E),
                      border: Border.all(color: kKidWhite, width: 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CoachBubble extends StatelessWidget {
  const _CoachBubble({
    required this.message,
    required this.label,
    required this.hearLabel,
    required this.onSpeak,
  });

  final String message;
  final String label;
  final String hearLabel;
  final VoidCallback onSpeak;

  @override
  Widget build(BuildContext context) {
    final bubble = Container(
      constraints: const BoxConstraints(minHeight: 58),
      padding: const EdgeInsets.fromLTRB(18, 12, 12, 12),
      decoration: BoxDecoration(
        color: kKidWhite,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
          bottomRight: Radius.circular(20),
          bottomLeft: Radius.circular(6),
        ),
        border: Border.all(color: const Color(0xFFBAE6FD), width: 3),
        boxShadow: const [
          BoxShadow(color: Color(0x737BD3FC), offset: Offset(0, 6)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0369A1),
                height: 1.35,
              ),
            ),
          ),
          const SizedBox(width: 10),
          _RoundIconButton(
            size: 34,
            emoji: '🔊',
            background: const Color(0xFFE0F2FE),
            shadow: const Color(0xFFBAE6FD),
            tooltip: label,
            label: hearLabel,
            onTap: onSpeak,
          ),
        ],
      ),
    );

    if (!kidsMotionEnabled(context)) return bubble;

    // `coach-bubble-pop` — replays whenever the sentence changes.
    return KeyedSubtree(
      key: ValueKey(message),
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutBack,
        builder: (context, t, child) => Opacity(
          opacity: (0.5 + 0.5 * t).clamp(0.0, 1.0),
          child: Transform.scale(scale: 0.95 + 0.05 * t, child: child),
        ),
        child: bubble,
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({
    required this.size,
    required this.emoji,
    required this.background,
    required this.shadow,
    required this.tooltip,
    required this.label,
    required this.onTap,
  });

  final double size;
  final String emoji;
  final Color background;
  final Color shadow;
  final String tooltip;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        label: label,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: background,
            shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: shadow, offset: const Offset(0, 2))],
          ),
          child: Material(
            color: Colors.transparent,
            shape: const CircleBorder(),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: onTap,
              child: SizedBox(
                width: size,
                height: size,
                child: Center(
                  child: Text(
                    emoji,
                    style: TextStyle(fontSize: size * 0.5, height: 1.2),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/* --------------------------- legend --------------------------- */

class _LegendRow extends StatelessWidget {
  const _LegendRow({required this.language, required this.possibleSquares});

  final LanguageService language;
  final int possibleSquares;

  @override
  Widget build(BuildContext context) {
    final chips = Wrap(
      spacing: 7,
      runSpacing: 7,
      children: [
        _LegendChip(
          label: language.kids('learn.moveSquares'),
          color: const Color(0xFF15803D),
          swatch: const Color(0xFF22C55E),
          swatchAlpha: 0.7,
        ),
        _LegendChip(
          label: language.kids('learn.captureSquares'),
          color: const Color(0xFFBE185D),
          swatch: const Color(0xFFEC4899),
          swatchAlpha: 0.75,
        ),
        _LegendChip(
          label: language.kids('learn.possibleSquares', {
            'count': possibleSquares,
          }),
          color: const Color(0xFF6D28D9),
          background: const Color(0xFFF5F3FF),
        ),
      ],
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        // `.legend-row { margin-left: 72px }` except on the narrow layout.
        final indent = constraints.maxWidth < 600 ? 0.0 : 72.0;
        final row = Padding(
          padding: EdgeInsets.only(left: indent),
          child: Align(alignment: Alignment.centerLeft, child: chips),
        );
        if (!kidsMotionEnabled(context)) return row;
        return KeyedSubtree(
          key: ValueKey(possibleSquares),
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 350),
            curve: Curves.easeOut,
            builder: (context, t, child) => Opacity(opacity: t, child: child),
            child: row,
          ),
        );
      },
    );
  }
}

class _LegendChip extends StatelessWidget {
  const _LegendChip({
    required this.label,
    required this.color,
    this.swatch,
    this.swatchAlpha = 1,
    this.background = const Color(0xE0FFFFFF),
  });

  final String label;
  final Color color;
  final Color? swatch;
  final double swatchAlpha;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: kKidWhite, width: 2),
        boxShadow: const [
          BoxShadow(color: Color(0x3894A3B8), offset: Offset(0, 3)),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (swatch != null) ...[
            Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: swatch!.withValues(alpha: swatchAlpha),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: color,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

/* --------------------------- board frame --------------------------- */

class _LearnBoardFrame extends StatelessWidget {
  const _LearnBoardFrame({required this.practising, required this.child});

  final bool practising;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final frame = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          begin: Alignment(-0.7, -0.7),
          end: Alignment(0.7, 0.7),
          colors: [Color(0xFFBAE6FD), Color(0xFFC4B5FD), Color(0xFFFBCFE8)],
          stops: [0, 0.48, 1],
        ),
        boxShadow: [
          BoxShadow(
            color: practising ? const Color(0xFF34D399) : kKidBoardBorder,
            offset: const Offset(0, 12),
          ),
          BoxShadow(
            color:
                (practising ? const Color(0xFF10B981) : const Color(0xFF8B5CF6))
                    .withValues(alpha: 0.65),
            offset: const Offset(0, 26),
            blurRadius: 45,
            spreadRadius: -18,
          ),
        ],
      ),
      child: Stack(
        children: [
          // The board sizes the frame; the sparkles float on top of it.
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Container(
              foregroundDecoration: BoxDecoration(
                border: Border.all(color: kKidWhite, width: 4),
                borderRadius: BorderRadius.circular(18),
              ),
              child: AspectRatio(aspectRatio: 1, child: child),
            ),
          ),
          Positioned.fill(child: IgnorePointer(child: const _FrameSparkles())),
        ],
      ),
    );

    if (!practising || !kidsMotionEnabled(context)) return frame;

    return _FrameGlow(child: frame);
  }
}

/// `frame-glow-learn`: brightness 1 → 1.05 over 2s.
class _FrameGlow extends StatelessWidget {
  const _FrameGlow({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return KidLoop(
      period: const Duration(milliseconds: 2000),
      builder: (context, t) {
        final wave = math.sin(t * math.pi);
        return Stack(
          children: [
            child,
            Positioned.fill(
              child: IgnorePointer(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: kKidWhite.withValues(alpha: 0.05 * wave),
                      borderRadius: BorderRadius.circular(30),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// The four `sparkle-twinkle` dots of `.frame-sparkles`.
class _FrameSparkles extends StatelessWidget {
  const _FrameSparkles();

  @override
  Widget build(BuildContext context) {
    Widget dot(
      int index,
      double left,
      double right,
      double top,
      double bottom,
    ) {
      Widget paint(double t) {
        final phase = (t + index * 0.25) % 1.0;
        final wave = math.sin(phase * math.pi);
        return Opacity(
          opacity: (0.35 + 0.65 * wave).clamp(0.0, 1.0),
          child: Transform.scale(
            scale: 0.8 + 0.35 * wave,
            child: Container(
              width: 11,
              height: 11,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xD9FFFFFF),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0xE6FFFFFF),
                    blurRadius: 8,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
          ),
        );
      }

      Widget positioned(double t) => Positioned(
        left: left == 0 ? null : left,
        right: right == 0 ? null : right,
        top: top == 0 ? null : top,
        bottom: bottom == 0 ? null : bottom,
        child: paint(t),
      );

      if (!kidsMotionEnabled(context)) return positioned(0);

      return KidLoop(
        period: const Duration(milliseconds: 2400),
        builder: (context, t) => positioned(t),
      );
    }

    return Stack(
      children: [
        dot(0, 20, 0, 8, 0),
        dot(1, 0, 20, 8, 0),
        dot(2, 20, 0, 0, 8),
        dot(3, 0, 20, 0, 8),
      ],
    );
  }
}

/* --------------------------- practice bar --------------------------- */

class _PracticeBar extends StatelessWidget {
  const _PracticeBar({
    required this.language,
    required this.piece,
    required this.onTap,
    required this.onClear,
  });

  final LanguageService language;
  final KidPiece? piece;
  final ValueChanged<KidPiece> onTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final current = piece;

    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 50),
      child: Padding(
        padding: const EdgeInsets.only(top: 14),
        child: Row(
          children: [
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xD9FFFFFF),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: kKidWhite, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: current == null
                          ? const Color(0xE6E2E8F0)
                          : const Color(0xB3A7F3D0),
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (current != null) ...[
                      SvgPicture.asset(
                        kidPieceAsset(current.image),
                        width: 30,
                        height: 30,
                      ),
                      const SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Text(
                        current == null
                            ? language.kids('learn.emptyPick')
                            : language.kids('learn.practicing', {
                                'piece': language.pieceLabel(current.name),
                              }),
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: current == null
                              ? FontWeight.w700
                              : FontWeight.w800,
                          color: current == null
                              ? const Color(0xFF64748B)
                              : const Color(0xFF14532D),
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (current != null) ...[
              const Spacer(),
              const SizedBox(width: 10),
              KidPill(
                label: language.kids('learn.clear'),
                color: const Color(0xFF9D174D),
                background: const Color(0xFFFCE7F3),
                shadowColor: const Color(0xFFFBCFE8),
                onTap: onClear,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/* --------------------------- sidebar --------------------------- */

class _PieceSidebar extends StatelessWidget {
  const _PieceSidebar({
    required this.language,
    required this.practicePiece,
    required this.onTap,
  });

  final LanguageService language;
  final KidPiece? practicePiece;
  final ValueChanged<KidPiece> onTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth < 560 ? 1 : 2;
        final wide = constraints.maxWidth > 320 && columns == 2;

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xCCFFFFFF),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: kKidWhite, width: 3),
            boxShadow: [
              const BoxShadow(color: Color(0xE6E0E7FF), offset: Offset(0, 10)),
              BoxShadow(
                color: const Color(0xFF6366F1).withValues(alpha: 0.45),
                blurRadius: 40,
                offset: const Offset(0, 22),
                spreadRadius: -22,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                language.kids('learn.allPieces'),
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: kKidText,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                language.kids('learn.allPiecesSub'),
                style: const TextStyle(
                  fontSize: 13.5,
                  color: Color(0xFF64748B),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 10),
              for (var index = 0; index < kidPieces.length; index++)
                Padding(
                  padding: EdgeInsets.only(
                    bottom: index == kidPieces.length - 1 ? 0 : 9,
                  ),
                  child: _SlideIn(
                    delay: Duration(milliseconds: index * 70),
                    child: _SidebarPiece(
                      language: language,
                      piece: kidPieces[index],
                      active: practicePiece?.name == kidPieces[index].name,
                      onTap: () => onTap(kidPieces[index]),
                    ),
                  ),
                ),
              if (wide) const SizedBox(height: 4),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '💡',
                      style: TextStyle(fontSize: 19, height: 1.2),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        language.kids('learn.sidebarNote', {
                          'coachName': language.instructor('coachName'),
                        }),
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF92400E),
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SidebarPiece extends StatelessWidget {
  const _SidebarPiece({
    required this.language,
    required this.piece,
    required this.active,
    required this.onTap,
  });

  final LanguageService language;
  final KidPiece piece;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = language.pieceLabel(piece.name);

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [kKidWhite, piece.tint],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: active ? const Color(0xFF34D399) : kKidWhite,
          width: 3,
        ),
        boxShadow: [
          BoxShadow(
            color: active ? const Color(0xFF34D399) : const Color(0x4D94A3B8),
            offset: Offset(0, active ? 6 : 5),
          ),
          if (active)
            BoxShadow(
              color: const Color(0xFF34D399).withValues(alpha: 0.22),
              blurRadius: 0,
              spreadRadius: 3,
            ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(9, 9, 12, 9),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: kKidWhite.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: SvgPicture.asset(
                    kidPieceAsset(piece.image),
                    width: 38,
                    height: 38,
                    alignment: Alignment.center,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: kKidText,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        '${piece.emoji} ${language.kids('learn.tapToLearn')}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  '›',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `piece-slide-in` with a per-row delay: fade in and slide 20px from the right.
class _SlideIn extends StatelessWidget {
  const _SlideIn({required this.delay, required this.child});

  final Duration delay;
  final Widget child;

  static const int _durationMs = 450;

  @override
  Widget build(BuildContext context) {
    if (!kidsMotionEnabled(context)) return child;

    final totalMs = delay.inMilliseconds + _durationMs;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: totalMs),
      builder: (context, value, child) {
        final p = ((value * totalMs) - delay.inMilliseconds) / _durationMs;
        final eased = Curves.easeOut.transform(p.clamp(0.0, 1.0));
        return Opacity(
          opacity: eased,
          child: Transform.translate(
            offset: Offset(20 * (1 - eased), 0),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

/* --------------------------- feedback --------------------------- */

class _FeedbackBanner extends StatelessWidget {
  const _FeedbackBanner({
    required this.feedback,
    required this.closeLabel,
    required this.onDismiss,
  });

  final _Feedback feedback;
  final String closeLabel;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final good = feedback.kind == _FeedbackKind.good;

    final card = Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: good
              ? const [Color(0xFFDCFCE7), Color(0xFFBBF7D0)]
              : const [Color(0xFFFFE4E6), Color(0xFFFECDD3)],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: kKidWhite, width: 3),
        boxShadow: [
          BoxShadow(
            color: good ? const Color(0xFF86EFAC) : const Color(0xFFFDA4AF),
            offset: const Offset(0, 7),
          ),
          BoxShadow(
            color: (good ? const Color(0xFF16A34A) : const Color(0xFFE11D48))
                .withValues(alpha: 0.5),
            blurRadius: 35,
            offset: const Offset(0, 20),
            spreadRadius: -15,
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            good ? '🌟' : '🙈',
            style: const TextStyle(fontSize: 28, height: 1.15),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  feedback.title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  feedback.message,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Semantics(
            button: true,
            label: closeLabel,
            child: DecoratedBox(
              decoration: const BoxDecoration(
                color: Color(0xB3FFFFFF),
                shape: BoxShape.circle,
              ),
              child: Material(
                color: Colors.transparent,
                shape: const CircleBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: onDismiss,
                  child: const SizedBox(
                    width: 30,
                    height: 30,
                    child: Center(
                      child: Text(
                        '✕',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          height: 1.2,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );

    return DefaultTextStyle(
      style: TextStyle(
        color: good ? const Color(0xFF14532D) : const Color(0xFF881337),
        fontWeight: FontWeight.w700,
      ),
      child: kidsMotionEnabled(context)
          ? KeyedSubtree(
              key: ValueKey('${feedback.title}${feedback.message}'),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 380),
                curve: Curves.easeOutBack,
                builder: (context, t, child) => Opacity(
                  opacity: t.clamp(0.0, 1.0),
                  child: Transform.translate(
                    offset: Offset(0, 22 * (1 - t)),
                    child: Transform.scale(scale: 0.9 + 0.1 * t, child: child),
                  ),
                ),
                child: card,
              ),
            )
          : card,
    );
  }
}

/* --------------------------- footer --------------------------- */

class _LearnFooter extends StatelessWidget {
  const _LearnFooter({required this.language, required this.onHome});

  final LanguageService language;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 12,
        runSpacing: 8,
        children: [
          Text(
            language.kids('learn.footer'),
            style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
          ),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onHome,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                child: Text(
                  language.kids('common.backToNormalHome'),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF7C3AED),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
