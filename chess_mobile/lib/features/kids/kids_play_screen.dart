import 'dart:async';
import 'dart:math' as math;

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/course.dart' show ArrowTone, BoardArrow;
import '../../core/models/engine.dart';
import '../../core/services/sound_service.dart';
import '../../core/services/stockfish_engine_service.dart';
import '../../routing/app_router.dart';
import '../../ui/board/board_theme.dart';
import '../../ui/board/chess_board_view.dart';
import '../../ui/widgets/kids_widgets.dart';
import 'kids_copy.dart';

/// Levels of the kids game, identical to `KIDS_DIFFICULTIES` in
/// `chess-web/src/app/features/home/kids-game.component.ts`.
enum KidsPlayLevel {
  easy(0, 2),
  medium(5, 4),
  hard(10, 6);

  const KidsPlayLevel(this.skill, this.depth);

  final int skill;
  final int depth;
}

enum _BuddyState {
  welcome,
  newGame,
  thinking,
  checkPraise,
  capturePraise,
  praise,
  buddyCheck,
  buddyCapture,
  yourTurn,
  hint,
  undo,
  win,
  loss,
  draw
}

enum _Outcome { none, win, loss, draw }

/// Kids game against the Chess Buddy, the mobile counterpart of
/// `KidsGameComponent`: no clock, no analysis upload, no history, a talking
/// robot and a board that only ever answers with friendly pink dots.
class KidsPlayScreen extends StatefulWidget {
  const KidsPlayScreen({super.key});

  @override
  State<KidsPlayScreen> createState() => _KidsPlayScreenState();
}

class _KidsPlayScreenState extends State<KidsPlayScreen> {
  final math.Random _random = math.Random();
  chess_lib.Chess _game = chess_lib.Chess();

  bool _playsWhite = true;
  KidsPlayLevel _level = KidsPlayLevel.easy;

  bool _buddyThinking = false;
  _BuddyState _buddyState = _BuddyState.welcome;
  int _praiseIndex = 0;
  bool _isGameOver = false;
  _Outcome _outcome = _Outcome.none;
  List<String> _moveHistory = <String>[];
  List<_Confetti> _confetti = const [];
  bool _muted = false;

  String? _selectedSquare;
  Set<String> _legalTargets = <String>{};
  String? _lastFrom;
  String? _lastTo;
  BoardArrow? _hintArrow;

  Timer? _buddyTimer;
  Timer? _hintTimer;
  Timer? _engineFallback;
  DateTime? _engineWaitDeadline;
  bool _pendingEngineMove = false;
  String _engineMoveFen = '';
  bool _engineFailed = false;
  StreamSubscription<EngineBestMove>? _bestMoveSub;
  late final StockfishEngineService _engine;
  late final SoundService _sound;

  static const List<String> _files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  chess_lib.Color get _playerColorObj =>
      _playsWhite ? chess_lib.Color.WHITE : chess_lib.Color.BLACK;

  bool get _isPlayerTurn => !_isGameOver && _game.turn == _playerColorObj;

  bool get _isBuddyTurn => !_isGameOver && _game.turn != _playerColorObj;

  bool get _inCheck => _game.in_check && _game.turn == _playerColorObj;

  @override
  void initState() {
    super.initState();
    _engine = context.read<StockfishEngineService>();
    _sound = context.read<SoundService>();
    _muted = _sound.isMuted;
    _confetti = _buildConfetti();
    _bestMoveSub = _engine.bestMoveStream.listen(_onEngineBestMove);
    WidgetsBinding.instance.addPostFrameCallback((_) => _initEngine());
  }

  @override
  void dispose() {
    _cancelTimers();
    _pendingEngineMove = false;
    _engine.stop();
    _bestMoveSub?.cancel();
    super.dispose();
  }

  /* --------------------------- engine --------------------------- */

  Future<void> _initEngine() async {
    try {
      await _engine.init();
      if (!mounted) return;
      _engineFailed = false;
      _engine.newGame();
      _applyLevelToEngine();
    } catch (_) {
      _engineFailed = true;
    }
  }

  void _applyLevelToEngine() {
    final engine = _engine;
    if (!engine.isReady()) return;
    engine.setSkillLevel(_level.skill);
  }

  void _scheduleBuddyMove({Duration? delay}) {
    if (_isGameOver || !_isBuddyTurn) return;

    _buddyTimer?.cancel();
    setState(() {
      _buddyThinking = true;
      _buddyState = _BuddyState.thinking;
    });

    final ms = (700 + _random.nextDouble() * 800).round();
    _buddyTimer = Timer(delay ?? Duration(milliseconds: ms), _makeBuddyMove);
  }

  void _makeBuddyMove() {
    if (!mounted) return;
    if (_isGameOver || !_isBuddyTurn) {
      setState(() => _buddyThinking = false);
      return;
    }

    final moves = _moves();
    if (moves.isEmpty) {
      setState(() => _buddyThinking = false);
      _checkGameOver();
      return;
    }

    final engine = _engine;

    // Give the engine a moment to finish loading on the first move.
    if (!engine.isReady() && !_engineFailed) {
      _engineWaitDeadline ??= DateTime.now().add(const Duration(milliseconds: 2500));
      if (DateTime.now().isBefore(_engineWaitDeadline!)) {
        _buddyTimer = Timer(const Duration(milliseconds: 150), _makeBuddyMove);
        return;
      }
    }

    _engineWaitDeadline = null;

    if (engine.isReady()) {
      _requestEngineMove(moves);
    } else {
      _makeRandomBuddyMove(moves);
    }
  }

  void _requestEngineMove(List<Map<String, dynamic>> moves) {
    if (moves.isEmpty) {
      setState(() => _buddyThinking = false);
      _checkGameOver();
      return;
    }

    final engine = _engine;
    final fen = _game.fen;
    _applyLevelToEngine();
    engine.setPosition(fen);
    setState(() {
      _pendingEngineMove = true;
      _engineMoveFen = fen;
    });
    _engineFallback?.cancel();
    _engineFallback = Timer(const Duration(seconds: 7), () {
      if (!mounted || !_pendingEngineMove) return;
      setState(() => _pendingEngineMove = false);
      engine.stop();
      _makeRandomBuddyMove();
    });
    engine.go(depth: _level.depth);
  }

  void _onEngineBestMove(EngineBestMove bestMove) {
    if (!_pendingEngineMove || _isGameOver || !_isBuddyTurn) return;

    // Ignore a late reply for a position that has already been undone or reset.
    if (_engineMoveFen != _game.fen) return;

    setState(() => _pendingEngineMove = false);
    _engineFallback?.cancel();

    final uci = bestMove.move;
    if (uci.isEmpty || uci == '(none)' || uci.length < 4) {
      _makeRandomBuddyMove();
      return;
    }

    final from = uci.substring(0, 2);
    final to = uci.substring(2, 4);
    final promotion = uci.length > 4 ? uci.substring(4, 5) : null;
    if (!_applyMove(from, to, promotion: promotion)) {
      _makeRandomBuddyMove();
      return;
    }
    _finishBuddyMove(from, to);
  }

  void _makeRandomBuddyMove([List<Map<String, dynamic>>? moves]) {
    if (_isGameOver || !_isBuddyTurn) {
      setState(() => _buddyThinking = false);
      return;
    }

    final legalMoves = moves ?? _moves();
    if (legalMoves.isEmpty) {
      setState(() => _buddyThinking = false);
      _checkGameOver();
      return;
    }

    final chosen = _chooseBuddyMove(legalMoves);
    final from = chosen['from'] as String;
    final to = chosen['to'] as String;
    final promotion = _isPromotion(from, to) ? 'q' : null;
    if (!_applyMove(from, to, promotion: promotion)) return;
    _finishBuddyMove(from, to);
  }

  /// Fallback when the engine cannot answer. The buddy gets a little sharper at
  /// higher levels but stays beatable by young beginners.
  Map<String, dynamic> _chooseBuddyMove(List<Map<String, dynamic>> moves) {
    final interesting = moves.where(_isCaptureOrCheck).toList();
    final chance = switch (_level) {
      KidsPlayLevel.hard => 0.75,
      KidsPlayLevel.medium => 0.45,
      KidsPlayLevel.easy => 0.2,
    };

    if (interesting.isNotEmpty && _random.nextDouble() < chance) {
      return interesting[_random.nextInt(interesting.length)];
    }
    return moves[_random.nextInt(moves.length)];
  }

  void _finishBuddyMove(String from, String to) {
    final captured = _lastMoveCaptured;
    setState(() {
      _buddyThinking = false;
      _lastFrom = from;
      _lastTo = to;
      _moveHistory = [..._moveHistory, _lastSan];
    });

    _playMoveSound(isCapture: captured, isCheck: _game.in_check);
    if (_checkGameOver()) return;

    setState(() {
      _buddyState = _game.in_check
          ? _BuddyState.buddyCheck
          : captured
              ? _BuddyState.buddyCapture
              : _BuddyState.yourTurn;
    });
  }

  /* --------------------------- moves --------------------------- */

  List<Map<String, dynamic>> _moves({String? square}) {
    final options = <String, dynamic>{'verbose': true};
    if (square != null) options['square'] = square;
    return _game.moves(options).whereType<Map<String, dynamic>>().toList(growable: false);
  }

  bool _isCaptureOrCheck(Map<String, dynamic> move) =>
      move['captured'] != null || (move['san'] as String? ?? '').contains('+');

  bool _isPromotion(String from, String to) {
    final piece = _game.get(from);
    if (piece == null || piece.type != chess_lib.PieceType.PAWN) return false;
    return to.endsWith('8') || to.endsWith('1');
  }

  bool _applyMove(String from, String to, {String? promotion}) => _game.move({
    'from': from,
    'to': to,
    'promotion': ?promotion,
  });

  chess_lib.Move? get _lastMove {
    final history = _game.history;
    return history.isNotEmpty ? history.last.move : null;
  }

  bool get _lastMoveCaptured => _lastMove?.captured != null;

  String get _lastSan {
    final sans = _game.san_moves();
    return sans.isNotEmpty ? (sans.last ?? '') : '';
  }

  void _onSquareTap(String square) {
    if (_buddyThinking || _isGameOver || !_isPlayerTurn) return;

    if (_selectedSquare != null && _legalTargets.contains(square)) {
      _makePlayerMove(_selectedSquare!, square);
      return;
    }

    final piece = _game.get(square);
    if (piece != null && piece.color == _playerColorObj) {
      setState(() {
        _selectedSquare = square;
        _legalTargets = _moves(square: square).map((move) => move['to'] as String).toSet();
      });
    } else {
      setState(() {
        _selectedSquare = null;
        _legalTargets = <String>{};
      });
    }
  }

  void _onMoveAttempt(String from, String to) {
    if (_buddyThinking || _isGameOver || !_isPlayerTurn) return;
    final piece = _game.get(from);
    if (piece == null || piece.color != _playerColorObj) return;
    if (!_moves(square: from).any((move) => move['to'] == to)) return;
    _makePlayerMove(from, to);
  }

  void _makePlayerMove(String from, String to) {
    final matches = _moves(square: from).where((move) => move['to'] == to).toList();
    if (matches.isEmpty) {
      setState(() {
        _selectedSquare = null;
        _legalTargets = <String>{};
      });
      return;
    }

    final promotion = _isPromotion(from, to) ? 'q' : null;
    if (!_applyMove(from, to, promotion: promotion)) return;
    final captured = _lastMoveCaptured;

    _clearHint();
    setState(() {
      _selectedSquare = null;
      _legalTargets = <String>{};
      _lastFrom = from;
      _lastTo = to;
      _moveHistory = [..._moveHistory, _lastSan];
    });

    _playMoveSound(isCapture: captured, isCheck: _game.in_check);
    if (_checkGameOver()) return;

    setState(() {
      if (_game.in_check) {
        _buddyState = _BuddyState.checkPraise;
      } else if (captured) {
        _buddyState = _BuddyState.capturePraise;
      } else {
        _praiseIndex = _random.nextInt(_praiseCount);
        _buddyState = _BuddyState.praise;
      }
    });

    _scheduleBuddyMove();
  }

  int get _praiseCount {
    final praise = context.read<LanguageService>().kidsList('game.buddy.praise');
    return praise.isEmpty ? 1 : praise.length;
  }

  /* --------------------------- hints --------------------------- */

  void _showHint() {
    if (!_isPlayerTurn || _buddyThinking || _isGameOver) return;

    final moves = _moves();
    if (moves.isEmpty) return;

    final goodMoves = moves.where(_isCaptureOrCheck).toList();
    final move = goodMoves.isNotEmpty && _random.nextDouble() < 0.6
        ? goodMoves[_random.nextInt(goodMoves.length)]
        : moves[_random.nextInt(moves.length)];

    _clearHint();
    setState(() {
      _hintArrow = BoardArrow(
        from: move['from'] as String,
        to: move['to'] as String,
        tone: ArrowTone.defaultTone,
      );
      _buddyState = _BuddyState.hint;
    });
    _hintTimer = Timer(const Duration(milliseconds: 3500), _clearHint);
  }

  void _clearHint() {
    _hintTimer?.cancel();
    _hintTimer = null;
    if (_hintArrow != null) setState(() => _hintArrow = null);
  }

  /* --------------------------- controls --------------------------- */

  void _chooseColor(bool white) {
    if (_playsWhite == white) return;
    setState(() => _playsWhite = white);
    _newGame();
  }

  void _setLevel(KidsPlayLevel level) {
    if (_level == level) return;
    _level = level;
    _applyLevelToEngine();

    if (_isBuddyTurn && !_isGameOver) {
      _cancelTimers();
      _pendingEngineMove = false;
      _engine.stop();
      _engineWaitDeadline = null;
      setState(() => _buddyThinking = false);
      _scheduleBuddyMove(delay: const Duration(milliseconds: 250));
    }
    setState(() {});
  }

  void _newGame() {
    _cancelTimers();
    _clearHint();
    _pendingEngineMove = false;
    _engineWaitDeadline = null;
    _engine.stop();

    _game = chess_lib.Chess();
    setState(() {
      _moveHistory = <String>[];
      _selectedSquare = null;
      _legalTargets = <String>{};
      _lastFrom = null;
      _lastTo = null;
      _buddyThinking = false;
      _isGameOver = false;
      _outcome = _Outcome.none;
      _buddyState = _BuddyState.newGame;
    });

    final engine = _engine;
    engine.newGame();
    _applyLevelToEngine();

    if (!_playsWhite) _scheduleBuddyMove(delay: const Duration(milliseconds: 500));
  }

  void _undoMove() {
    if (_moveHistory.isEmpty) return;

    _cancelTimers();
    _clearHint();
    _pendingEngineMove = false;
    _engineWaitDeadline = null;
    _engine.stop();

    // Undo the buddy reply plus the player's move, or just the player's move
    // while the buddy is still thinking.
    final plies = _isPlayerTurn ? 2 : 1;
    for (var i = 0; i < plies && _game.history.isNotEmpty; i++) {
      _game.undo();
      _moveHistory = _moveHistory.sublist(0, _moveHistory.length - 1);
    }

    setState(() {
      _buddyThinking = false;
      _isGameOver = false;
      _outcome = _Outcome.none;
      _selectedSquare = null;
      _legalTargets = <String>{};
      final last = _lastMove;
      _lastFrom = last?.fromAlgebraic;
      _lastTo = last?.toAlgebraic;
    });

    if (_isBuddyTurn) {
      _scheduleBuddyMove(delay: const Duration(milliseconds: 400));
    } else {
      setState(() => _buddyState = _BuddyState.undo);
    }
  }

  void _toggleSound() {
    setState(() => _muted = !_muted);
    _sound.setMuted(_muted);
  }

  void _cancelTimers() {
    _buddyTimer?.cancel();
    _buddyTimer = null;
    _hintTimer?.cancel();
    _hintTimer = null;
    _engineFallback?.cancel();
    _engineFallback = null;
  }

  /* --------------------------- game over --------------------------- */

  bool _checkGameOver() {
    if (!_game.game_over) return false;

    _cancelTimers();
    _pendingEngineMove = false;
    _engineWaitDeadline = null;
    _engine.stop();

    _Outcome outcome;
    if (_game.in_checkmate) {
      final winnerIsBuddy = _game.turn == _playerColorObj;
      outcome = winnerIsBuddy ? _Outcome.loss : _Outcome.win;
    } else {
      outcome = _Outcome.draw;
    }

    setState(() {
      _isGameOver = true;
      _buddyThinking = false;
      _outcome = outcome;
      _buddyState = switch (outcome) {
        _Outcome.win => _BuddyState.win,
        _Outcome.loss => _BuddyState.loss,
        _Outcome.draw => _BuddyState.draw,
        _Outcome.none => _BuddyState.welcome,
      };
      if (outcome == _Outcome.win) _confetti = _buildConfetti();
    });

    if (outcome == _Outcome.win && !_muted) {
      _sound.playGameOver(isWin: true);
    }
    return true;
  }

  List<_Confetti> _buildConfetti() {
    const palette = [
      Color(0xFFF472B6),
      Color(0xFFFACE15),
      Color(0xFF34D399),
      Color(0xFF60A5FA),
      Color(0xFFA78BFA),
      Color(0xFFFB923C),
    ];
    return [
      for (var i = 0; i < 28; i++)
        _Confetti(
          left: _random.nextDouble(),
          delay: _random.nextDouble() * 1.2,
          duration: 1.6 + _random.nextDouble() * 1.6,
          color: palette[i % palette.length],
        ),
    ];
  }

  String _buddyMessage(LanguageService language) => switch (_buddyState) {
    _BuddyState.newGame => language.kids('game.buddy.newGame'),
    _BuddyState.thinking => language.kids('game.buddy.thinking'),
    _BuddyState.checkPraise => language.kids('game.buddy.checkPraise'),
    _BuddyState.capturePraise => language.kids('game.buddy.capturePraise'),
    _BuddyState.praise => _praiseAt(language),
    _BuddyState.buddyCheck => language.kids('game.buddy.buddyCheck'),
    _BuddyState.buddyCapture => language.kids('game.buddy.buddyCapture'),
    _BuddyState.yourTurn => language.kids('game.buddy.yourTurn'),
    _BuddyState.hint => language.kids('game.buddy.hint'),
    _BuddyState.undo => language.kids('game.buddy.undo'),
    _BuddyState.win => language.kids('game.results.winMessage'),
    _BuddyState.loss => language.kids('game.results.lossMessage'),
    _BuddyState.draw => language.kids('game.results.drawMessage'),
    _BuddyState.welcome => language.kids('game.buddy.welcome'),
  };

  String _praiseAt(LanguageService language) {
    final praise = language.kidsList('game.buddy.praise');
    if (praise.isEmpty) return language.kids('game.buddy.welcome');
    return praise[_praiseIndex % praise.length];
  }

  void _playMoveSound({required bool isCapture, required bool isCheck}) {
    if (_muted) return;
    _sound.playMove(isCapture: isCapture, isCheck: isCheck);
  }

  /* --------------------------- layout --------------------------- */

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();

    return KidsWorld(
      decor: KidWorldDecor.play,
      maxWidth: 1180,
      padding: const EdgeInsets.fromLTRB(22, 18, 22, 46),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _PlayHeader(
            language: language,
            muted: _muted,
            onHome: () => context.go(AppRoutes.kids),
            onToggleSound: _toggleSound,
          ),
          const SizedBox(height: 26),
          LayoutBuilder(
            builder: (context, constraints) {
              final panel = _boardPanel(language);
              final tips = _TipsPanel(language: language);
              if (constraints.maxWidth < 940) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [panel, const SizedBox(height: 26), tips],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: panel),
                  const SizedBox(width: 26),
                  SizedBox(width: 280, child: tips),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _boardPanel(LanguageService language) {
    final buddyMessage = _buddyMessage(language);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _BuddyRow(message: buddyMessage, thinking: _buddyThinking),
            const SizedBox(height: 14),
            _GameOptions(
              language: language,
              playsWhite: _playsWhite,
              level: _level,
              onColor: _chooseColor,
              onLevel: _setLevel,
            ),
            const SizedBox(height: 14),
            _PlayBoardFrame(
              glow: _buddyThinking,
              badge: _inCheck && !_isGameOver
                  ? _CheckBadge(label: language.kids('game.check'))
                  : null,
              overlay: _isGameOver
                  ? _GameOverOverlay(
                      language: language,
                      outcome: _outcome,
                      confetti: _outcome == _Outcome.win ? _confetti : const [],
                      onPlayAgain: _newGame,
                      onHome: () => context.go(AppRoutes.kids),
                    )
                  : null,
              child: ChessBoardView(
                fen: _game.fen,
                orientationWhite: _playsWhite,
                interactive: _isPlayerTurn && !_buddyThinking,
                theme: kKidsBoardTheme,
                markers: kKidsBoardMarkers,
                pulseMarkers: true,
                hintArrowColor: kKidsArrowColor,
                selectedSquare: _selectedSquare,
                legalTargets: _legalTargets,
                lastMoveFrom: _lastFrom,
                lastMoveTo: _lastTo,
                checkSquare: _inCheck ? _kingSquare(_playerColorObj) : null,
                arrows: _hintArrow == null ? const [] : [_hintArrow!],
                onSquareTap: _onSquareTap,
                onMoveAttempt: _onMoveAttempt,
              ),
            ),
            const SizedBox(height: 14),
            _PlayerRow(
              language: language,
              colorLabel:
                  _playsWhite ? language.kids('game.white') : language.kids('game.black'),
              showTurn: _isPlayerTurn && !_isGameOver,
            ),
            const SizedBox(height: 16),
            _Controls(
              language: language,
              canUndo: _moveHistory.isNotEmpty,
              canHint: _isPlayerTurn && !_isGameOver,
              onNewGame: _newGame,
              onUndo: _undoMove,
              onHint: _showHint,
            ),
          ],
        ),
      ),
    );
  }

  String? _kingSquare(chess_lib.Color color) {
    for (var rank = 8; rank >= 1; rank--) {
      for (var file = 0; file < 8; file++) {
        final piece = _game.get('${_files[file]}$rank');
        if (piece != null && piece.type == chess_lib.PieceType.KING && piece.color == color) {
          return '${_files[file]}$rank';
        }
      }
    }
    return null;
  }
}

/* --------------------------- header --------------------------- */

class _PlayHeader extends StatelessWidget {
  const _PlayHeader({
    required this.language,
    required this.muted,
    required this.onHome,
    required this.onToggleSound,
  });

  final LanguageService language;
  final bool muted;
  final VoidCallback onHome;
  final VoidCallback onToggleSound;

  @override
  Widget build(BuildContext context) {
    final homePill = KidPill(
      label: language.kids('common.kidsHome'),
      emoji: '🏠',
      color: kKidBrown,
      background: kKidWhite,
      onTap: onHome,
    );

    final title = _TitlePill(
      prefix: language.kids('game.titlePrefix'),
      buddyName: language.kids('game.buddyName'),
    );

    final actions = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        KidPill(
          label: '',
          child: KidLanguagePicker(
            languages: language.languages,
            selected: language.code,
            onSelected: language.setLanguage,
          ),
        ),
        const SizedBox(width: 8),
        Tooltip(
          message: muted ? language.kids('game.soundOn') : language.kids('game.soundOff'),
          child: KidPill(
            label: '',
            emoji: muted ? '🔇' : '🔊',
            onTap: onToggleSound,
          ),
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
          children: [homePill, Expanded(child: Center(child: title)), actions],
        );
      },
    );
  }
}

class _TitlePill extends StatelessWidget {
  const _TitlePill({required this.prefix, required this.buddyName});

  final String prefix;
  final String buddyName;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xB3FFFFFF),
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [BoxShadow(color: Color(0x99C4B5FD), offset: Offset(0, 4))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const KidWiggle(child: Text('🤖', style: TextStyle(fontSize: 24, height: 1.2))),
          const SizedBox(width: 8),
          Text('$prefix ',
              style: const TextStyle(
                  fontSize: 19, fontWeight: FontWeight.w700, color: kKidText)),
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: [kKidPink, kKidPurple, Color(0xFF3B82F6)],
            ).createShader(bounds),
            child: Text(buddyName,
                style: const TextStyle(
                    color: kKidWhite, fontWeight: FontWeight.w800, fontSize: 19)),
          ),
        ],
      ),
    );
  }
}

class _BuddyRow extends StatelessWidget {
  const _BuddyRow({required this.message, required this.thinking});

  final String message;
  final bool thinking;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _BuddyAvatar(thinking: thinking),
        const SizedBox(width: 12),
        Expanded(child: _BuddyBubble(message: message, thinking: thinking)),
      ],
    );
  }
}

class _BuddyAvatar extends StatelessWidget {
  const _BuddyAvatar({required this.thinking});

  final bool thinking;

  @override
  Widget build(BuildContext context) {
    return KidLoop(
      period: Duration(milliseconds: thinking ? 800 : 2600),
      builder: (context, t) {
        final wave = math.sin(t * math.pi);
        return SizedBox(
          width: 62,
          height: 62,
          child: Transform.rotate(
            angle: (-2 + 4 * wave) * math.pi / 180,
            alignment: Alignment.center,
            child: Transform.translate(
              offset: Offset(0, -6 * wave),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        begin: Alignment(-0.7, -0.7),
                        end: Alignment(0.7, 0.7),
                        colors: [Color(0xFFC4B5FD), Color(0xFFA5B4FC)],
                      ),
                      boxShadow: const [
                        BoxShadow(color: kKidPurple, offset: Offset(0, 6)),
                        BoxShadow(
                            color: Color(0xB38B5CF6), offset: Offset(0, 10), blurRadius: 18),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: const Text('🤖', style: TextStyle(fontSize: 33, height: 1.2)),
                  ),
                  Positioned(
                    right: 2,
                    bottom: 0,
                    child: Container(
                      width: 13,
                      height: 13,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: kKidLearnGreen,
                        border: Border.all(color: kKidWhite, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _BuddyBubble extends StatefulWidget {
  const _BuddyBubble({required this.message, required this.thinking});

  final String message;
  final bool thinking;

  @override
  State<_BuddyBubble> createState() => _BuddyBubbleState();
}

class _BuddyBubbleState extends State<_BuddyBubble> with SingleTickerProviderStateMixin {
  late final AnimationController _pop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 400),
    value: 1,
  );

  @override
  void didUpdateWidget(covariant _BuddyBubble oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.message == widget.message) return;
    if (kidsMotionEnabled(context)) _pop.forward(from: 0);
  }

  @override
  void dispose() {
    _pop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final thinking = widget.thinking;
    return AnimatedBuilder(
      animation: _pop,
      builder: (context, child) {
        final t = _pop.value;
        return Transform.scale(
          scale: 0.94 + 0.06 * t,
          child: Opacity(opacity: (0.5 + 0.5 * t).clamp(0.0, 1.0), child: child),
        );
      },
      child: Container(
        constraints: const BoxConstraints(minHeight: 58),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: kKidWhite,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
            bottomRight: Radius.circular(20),
            bottomLeft: Radius.circular(6),
          ),
          border: Border.all(
              color: thinking ? const Color(0xFFBAE6FD) : const Color(0xFFE9D5FF), width: 3),
          boxShadow: [
            BoxShadow(
                color: thinking ? const Color(0x807BD3FC) : const Color(0x73C4B5FD),
                offset: const Offset(0, 6)),
          ],
        ),
        alignment: Alignment.centerLeft,
        child: Text(
          widget.message,
          style: TextStyle(
            fontSize: 16.5,
            height: 1.35,
            fontWeight: FontWeight.w700,
            color: thinking ? const Color(0xFF0369A1) : const Color(0xFF5B21B6),
          ),
        ),
      ),
    );
  }
}

/* --------------------------- options --------------------------- */

class _GameOptions extends StatelessWidget {
  const _GameOptions({
    required this.language,
    required this.playsWhite,
    required this.level,
    required this.onColor,
    required this.onLevel,
  });

  final LanguageService language;
  final bool playsWhite;
  final KidsPlayLevel level;
  final ValueChanged<bool> onColor;
  final ValueChanged<KidsPlayLevel> onLevel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xD1FFFFFF),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kKidWhite, width: 3),
        boxShadow: const [BoxShadow(color: Color(0x80C4B5FD), offset: Offset(0, 5))],
      ),
      child: Wrap(
        spacing: 22,
        runSpacing: 10,
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          _OptionGroup(
            label: language.kids('game.playAs'),
            children: [
              _OptionChip(
                label: language.kids('game.white'),
                glyph: '♔',
                active: playsWhite,
                onTap: () => onColor(true),
              ),
              _OptionChip(
                label: language.kids('game.black'),
                glyph: '♚',
                active: !playsWhite,
                onTap: () => onColor(false),
              ),
            ],
          ),
          _OptionGroup(
            label: language.kids('game.difficulty'),
            children: [
              _OptionChip(
                  label: language.kids('game.levelEasy'),
                  emoji: '🌱',
                  active: level == KidsPlayLevel.easy,
                  onTap: () => onLevel(KidsPlayLevel.easy)),
              _OptionChip(
                  label: language.kids('game.levelMedium'),
                  emoji: '⭐',
                  active: level == KidsPlayLevel.medium,
                  onTap: () => onLevel(KidsPlayLevel.medium)),
              _OptionChip(
                  label: language.kids('game.levelHard'),
                  emoji: '🚀',
                  active: level == KidsPlayLevel.hard,
                  onTap: () => onLevel(KidsPlayLevel.hard)),
            ],
          ),
        ],
      ),
    );
  }
}

class _OptionGroup extends StatelessWidget {
  const _OptionGroup({required this.label, required this.children});

  final String label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w800, color: kKidPurpleDeep)),
        const SizedBox(width: 8),
        ...children,
      ],
    );
  }
}

class _OptionChip extends StatelessWidget {
  const _OptionChip({
    required this.label,
    required this.active,
    required this.onTap,
    this.glyph,
    this.emoji,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;
  final String? glyph;
  final String? emoji;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
        backgroundColor: active ? Colors.transparent : kKidWhite,
        foregroundColor: active ? kKidWhite : const Color(0xFF5B21B6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
          side: active ? BorderSide.none : BorderSide(color: const Color(0xFFE9D5FF), width: 2),
        ),
        shadowColor: active ? kKidPurpleDeep : Colors.transparent,
        elevation: active ? 3 : 0,
      ),
      child: Container(
        decoration: active
            ? BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment(-1, -1),
                  end: Alignment(1, 1),
                  colors: [kKidPurple, kKidPink],
                ),
                borderRadius: BorderRadius.circular(999),
              )
            : null,
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (glyph != null)
              Text(glyph!, style: const TextStyle(fontSize: 14, height: 1.3))
            else if (emoji != null)
              Text(emoji!, style: const TextStyle(fontSize: 14, height: 1.3)),
            const SizedBox(width: 5),
            Text(label,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, height: 1.3)),
          ],
        ),
      ),
    );
  }
}

/* --------------------------- board frame --------------------------- */

class _PlayBoardFrame extends StatelessWidget {
  const _PlayBoardFrame({
    required this.child,
    required this.glow,
    this.badge,
    this.overlay,
  });

  final Widget child;
  final bool glow;
  final Widget? badge;
  final Widget? overlay;

  @override
  Widget build(BuildContext context) {
    final frame = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          begin: Alignment(-0.8, -0.8),
          end: Alignment(0.8, 0.8),
          colors: [Color(0xFFFBCFE8), Color(0xFFC4B5FD), Color(0xFF93C5FD)],
          stops: [0, 0.45, 1],
        ),
        boxShadow: [
          BoxShadow(color: glow ? const Color(0xFF67E8F9) : kKidBoardBorder, offset: const Offset(0, 12)),
          BoxShadow(
            color: (glow ? const Color(0xFF06B6D4) : kKidPurple).withValues(alpha: 0.65),
            offset: const Offset(0, 26),
            blurRadius: 45,
            spreadRadius: -18,
          ),
        ],
      ),
      child: Stack(
        children: [
          // The board is the sizing child; everything else floats on top.
          ClipRRect(borderRadius: BorderRadius.circular(16), child: child),
          Positioned.fill(child: IgnorePointer(child: _FrameDots())),
          if (badge != null)
            Positioned(top: 12, left: 0, right: 0, child: Center(child: badge!)),
          if (overlay != null)
            Positioned.fill(
              child: ClipRRect(borderRadius: BorderRadius.circular(16), child: overlay!),
            ),
        ],
      ),
    );

    if (!glow || !kidsMotionEnabled(context)) return frame;

    return KidLoop(
      period: const Duration(milliseconds: 1800),
      builder: (context, t) {
        final wave = math.sin(t * math.pi);
        return Stack(
          children: [
            frame,
            Positioned.fill(
              child: IgnorePointer(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: kKidWhite.withValues(alpha: 0.06 * wave),
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

class _FrameDots extends StatelessWidget {
  const _FrameDots();

  @override
  Widget build(BuildContext context) {
    return KidLoop(
      period: const Duration(milliseconds: 2400),
      builder: (context, t) {
        Widget dot(int index, Alignment anchor) {
          final phase = (t + index * 0.25) % 1.0;
          final wave = math.sin(phase * math.pi);
          return Positioned(
            left: anchor.x < 0 ? 20 : null,
            right: anchor.x > 0 ? 20 : null,
            top: anchor.y < 0 ? 8 : null,
            bottom: anchor.y > 0 ? 8 : null,
            child: Opacity(
              opacity: (0.35 + 0.65 * wave).clamp(0.0, 1.0),
              child: Transform.scale(
                scale: 0.8 + 0.35 * wave,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xCCFFFFFF),
                    boxShadow: [
                      BoxShadow(color: const Color(0xE6FFFFFF), blurRadius: 8, spreadRadius: 1),
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        return Stack(
          children: [
            dot(0, const Alignment(-1, -1)),
            dot(1, const Alignment(1, -1)),
            dot(2, const Alignment(-1, 1)),
            dot(3, const Alignment(1, 1)),
          ],
        );
      },
    );
  }
}

class _CheckBadge extends StatelessWidget {
  const _CheckBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return KidLoop(
      period: const Duration(milliseconds: 700),
      builder: (context, t) {
        final angle = switch (t) {
          < 0.25 => 0.0,
          < 0.5 => -2.0,
          < 0.75 => 0.0,
          _ => 2.0,
        };
        return Transform.rotate(
          angle: angle * math.pi / 180,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0xFFFECACA), width: 3),
              boxShadow: const [BoxShadow(color: Color(0xFFFCACA5), offset: Offset(0, 6))],
            ),
            child: Text('⚠️ $label',
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFFB91C1C))),
          ),
        );
      },
    );
  }
}

/* --------------------------- player + controls --------------------------- */

class _PlayerRow extends StatelessWidget {
  const _PlayerRow({
    required this.language,
    required this.colorLabel,
    required this.showTurn,
  });

  final LanguageService language;
  final String colorLabel;
  final bool showTurn;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xD1FFFFFF),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: kKidWhite, width: 3),
        boxShadow: const [BoxShadow(color: Color(0xA6A3F3D0), offset: Offset(0, 6))],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment(-0.7, -0.7),
                end: Alignment(0.7, 0.7),
                colors: [Color(0xFFBBF7D0), Color(0xFF86EFAC)],
              ),
            ),
            alignment: Alignment.center,
            child: const Text('🧒', style: TextStyle(fontSize: 24, height: 1.2)),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 4,
              children: [
                Text(language.kids('game.you'),
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF14532D))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(colorLabel,
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700, color: kKidSlate)),
                ),
              ],
            ),
          ),
          if (showTurn) const Spacer(),
          if (showTurn) _TurnPill(label: language.kids('game.yourTurn')),
        ],
      ),
    );
  }
}

class _TurnPill extends StatelessWidget {
  const _TurnPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return KidLoop(
      period: const Duration(milliseconds: 1600),
      builder: (context, t) {
        final wave = math.sin(t * math.pi);
        return Transform.translate(
          offset: Offset(0, -3 * wave),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(label,
                style: const TextStyle(
                    fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF15803D))),
          ),
        );
      },
    );
  }
}

class _Controls extends StatelessWidget {
  const _Controls({
    required this.language,
    required this.canUndo,
    required this.canHint,
    required this.onNewGame,
    required this.onUndo,
    required this.onHint,
  });

  final LanguageService language;
  final bool canUndo;
  final bool canHint;
  final VoidCallback onNewGame;
  final VoidCallback onUndo;
  final VoidCallback onHint;

  @override
  Widget build(BuildContext context) {
    final buttons = [
      _ControlButton(
        label: language.kids('game.newGame'),
        emoji: '🔄',
        colors: const [Color(0xFF22C55E), Color(0xFF16A34A)],
        base: const Color(0xFF15803D),
        onTap: onNewGame,
      ),
      _ControlButton(
        label: language.kids('game.undo'),
        emoji: '↩️',
        colors: const [Color(0xFF60A5FA), Color(0xFF3B82F6)],
        base: const Color(0xFF1D4ED8),
        onTap: canUndo ? onUndo : null,
      ),
      _ControlButton(
        label: language.kids('game.hint'),
        emoji: '💡',
        colors: const [Color(0xFFFBBF24), Color(0xFFF59E0B)],
        base: const Color(0xFFB45309),
        foreground: const Color(0xFF78350F),
        onTap: canHint ? onHint : null,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 560) {
          return Column(
            children: [
              for (final button in buttons)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: SizedBox(width: double.infinity, child: button),
                ),
            ],
          );
        }
        return Row(
          children: [
            for (var i = 0; i < buttons.length; i++) ...[
              if (i > 0) const SizedBox(width: 12),
              Expanded(child: buttons[i]),
            ],
          ],
        );
      },
    );
  }
}

class _ControlButton extends StatelessWidget {
  const _ControlButton({
    required this.label,
    required this.emoji,
    required this.colors,
    required this.base,
    required this.onTap,
    this.foreground = kKidWhite,
  });

  final String label;
  final String emoji;
  final List<Color> colors;
  final Color base;
  final Color foreground;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: onTap == null ? 0.45 : 1,
      child: TextButton(
        onPressed: onTap,
        style: TextButton.styleFrom(
          foregroundColor: foreground,
          backgroundColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          elevation: 0,
        ),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-1, -1),
              end: Alignment(1, 1),
              colors: colors,
            ),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [BoxShadow(color: base, offset: const Offset(0, 6))],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 17, height: 1.3)),
              const SizedBox(width: 6),
              Flexible(
                child: Text(label,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, height: 1.3)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/* --------------------------- game over --------------------------- */

class _GameOverOverlay extends StatelessWidget {
  const _GameOverOverlay({
    required this.language,
    required this.outcome,
    required this.confetti,
    required this.onPlayAgain,
    required this.onHome,
  });

  final LanguageService language;
  final _Outcome outcome;
  final List<_Confetti> confetti;
  final VoidCallback onPlayAgain;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    final emoji = switch (outcome) {
      _Outcome.win => '🏆',
      _Outcome.loss => '🙂',
      _Outcome.draw => '🤝',
      _Outcome.none => '',
    };
    final title = switch (outcome) {
      _Outcome.win => language.kids('game.results.winTitle'),
      _Outcome.loss => language.kids('game.results.lossTitle'),
      _Outcome.draw => language.kids('game.results.drawTitle'),
      _Outcome.none => '',
    };
    final text = switch (outcome) {
      _Outcome.win => language.kids('game.results.winText'),
      _Outcome.loss => language.kids('game.results.lossText'),
      _Outcome.draw => language.kids('game.results.drawText'),
      _Outcome.none => '',
    };

    return Stack(
      children: [
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: kKidText.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(30),
            ),
            child: const SizedBox.expand(),
          ),
        ),
        if (confetti.isNotEmpty) _ConfettiLayer(confetti: confetti),
        Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Container(
                padding: const EdgeInsets.fromLTRB(22, 26, 22, 26),
                decoration: BoxDecoration(
                  color: kKidWhite,
                  borderRadius: BorderRadius.circular(26),
                  border: Border.all(color: kKidWhite, width: 4),
                  boxShadow: const [
                    BoxShadow(color: Color(0xCCC4B5FD), offset: Offset(0, 14)),                    BoxShadow(
                        color: Color(0x800F172A), offset: Offset(0, 30), blurRadius: 50, spreadRadius: -20),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _ResultBounce(emoji: emoji),
                    const SizedBox(height: 10),
                    Text(title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 27, fontWeight: FontWeight.w800, color: kKidText)),
                    const SizedBox(height: 6),
                    Text(text,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 15.5, height: 1.45, color: kKidMuted)),
                    const SizedBox(height: 18),
                    _BigButton(
                      label: language.kids('common.playAgain'),
                      emoji: '🔄',
                      colors: const [Color(0xFF22C55E), Color(0xFF16A34A)],
                      base: const Color(0xFF15803D),
                      onTap: onPlayAgain,
                    ),
                    const SizedBox(height: 10),
                    _BigButton(
                      label: language.kids('common.backToKidsHome'),
                      emoji: '🏠',
                      colors: const [kKidPurple, kKidPink],
                      base: kKidPurpleDeep,
                      onTap: onHome,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ResultBounce extends StatelessWidget {
  const _ResultBounce({required this.emoji});

  final String emoji;

  @override
  Widget build(BuildContext context) {
    return KidLoop(
      period: const Duration(milliseconds: 1400),
      builder: (context, t) {
        final wave = math.sin(t * math.pi);
        return Transform.rotate(
          angle: (-4 + 8 * wave) * math.pi / 180,
          child: Transform.translate(
            offset: Offset(0, -8 * wave),
            child: Text(emoji, style: const TextStyle(fontSize: 58, height: 1.1)),
          ),
        );
      },
    );
  }
}

class _BigButton extends StatelessWidget {
  const _BigButton({
    required this.label,
    required this.emoji,
    required this.colors,
    required this.base,
    required this.onTap,
  });

  final String label;
  final String emoji;
  final List<Color> colors;
  final Color base;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        foregroundColor: kKidWhite,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment(-1, -1),
            end: Alignment(1, 1),
            colors: colors,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: base, offset: const Offset(0, 5))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 17, height: 1.3)),
            const SizedBox(width: 8),
            Flexible(
              child: Text(label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, height: 1.3)),
            ),
          ],
        ),
      ),
    );
  }
}

class _Confetti {
  const _Confetti({
    required this.left,
    required this.delay,
    required this.duration,
    required this.color,
  });

  final double left;
  final double delay;
  final double duration;
  final Color color;
}

class _ConfettiLayer extends StatelessWidget {
  const _ConfettiLayer({required this.confetti});

  final List<_Confetti> confetti;

  /// The CSS pieces run `infinite` with their own duration and delay; one
  /// master clock of the slowest possible cycle reproduces that.
  static const double _cycle = 4.4;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: KidLoop(
        period: const Duration(milliseconds: 4400),
        reverse: false,
        builder: (context, t) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final height = constraints.maxHeight;
              return Stack(
                clipBehavior: Clip.hardEdge,
                children: [
                  for (final piece in confetti)
                    Builder(builder: (context) {
                      final seconds = t * _cycle;
                      if (seconds < piece.delay) return const SizedBox.shrink();
                      final phase = ((seconds - piece.delay) / piece.duration) % 1.0;
                      return Positioned(
                        left: piece.left * (constraints.maxWidth - 10),
                        top: -20 + phase * (height + 40),
                        child: Transform.rotate(
                          angle: phase * 4 * math.pi,
                          child: Container(
                            width: 10,
                            height: 16,
                            decoration: BoxDecoration(
                              color: piece.color,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                      );
                    }),
                ],
              );
            },
          );
        },
      ),
    );
  }
}

/* --------------------------- tips --------------------------- */

class _TipsPanel extends StatelessWidget {
  const _TipsPanel({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xC7FFFFFF),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: kKidWhite, width: 3),
        boxShadow: const [
          BoxShadow(color: Color(0xE5E0E7FF), offset: Offset(0, 10)),
          BoxShadow(
              color: Color(0x666366F1), offset: Offset(0, 20), blurRadius: 36, spreadRadius: -20),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(language.kids('game.tipsTitle'),
              style: const TextStyle(fontSize: 18.5, fontWeight: FontWeight.w800, color: kKidText)),
          const SizedBox(height: 12),
          _TipCard(
            emoji: '👆',
            title: language.kids('game.tipTapTitle'),
            text: language.kids('game.tipTapText'),
          ),
          const SizedBox(height: 12),
          _TipCard(
            emoji: '💡',
            title: language.kids('game.tipHelpTitle'),
            text: language.kids('game.tipHelpText'),
          ),
          const SizedBox(height: 12),
          _TipCard(
            emoji: '👑',
            title: language.kids('game.tipWinTitle'),
            text: language.kids('game.tipWinText'),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: kKidCream,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Text('🌈', style: TextStyle(fontSize: 22, height: 1.2)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(language.kids('game.noTimer'),
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          height: 1.35,
                          color: Color(0xFF92400E))),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TipCard extends StatelessWidget {
  const _TipCard({required this.emoji, required this.title, required this.text});

  final String emoji;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kKidWhite,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x3394A3B8), offset: Offset(0, 4))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 24, height: 1.1)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 14.5, fontWeight: FontWeight.w800, color: kKidText)),
                const SizedBox(height: 2),
                Text(text,
                    style: const TextStyle(fontSize: 13, height: 1.4, color: kKidMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/* --------------------------- animation helper --------------------------- */

/// A looping animation, the Flutter counterpart of one CSS `@keyframes` rule.
/// Reduced-motion preferences freeze it at its first keyframe.
