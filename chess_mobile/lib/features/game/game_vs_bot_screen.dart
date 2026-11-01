import 'dart:async';

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/analysis.dart';
import '../../core/models/engine.dart';
import '../../core/models/game_history.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/game_history_service.dart';
import '../../core/services/move_analysis_api_service.dart';
import '../../core/services/sound_service.dart';
import '../../core/services/stockfish_engine_service.dart';
import '../../core/theme/app_theme.dart';
import '../../routing/app_router.dart';
import '../../ui/board/board_theme.dart';
import '../../ui/board/chess_board_view.dart';
import '../../ui/widgets/cm.dart';
import '../../core/models/course.dart' show ArrowTone, BoardArrow;
import 'game_utils.dart';
import '../play/play_screen.dart' show showBotSetupDialog;


/// Play against Stockfish, mirroring the web `game-vs-bot.component.ts`:
/// clocks, captured material, eval bar, move list, promotion, resign / takeback
/// / hint / flip / board themes, sounds and the post-game engine review.
class GameVsBotScreen extends StatefulWidget {
  const GameVsBotScreen({
    super.key,
    this.skill = 5,
    this.timeControl = 'unlimited',
    this.playerColor = 'white',
    this.kidsMode = false,
  });

  final int skill;
  final String timeControl;
  final String playerColor;
  final bool kidsMode;

  @override
  State<GameVsBotScreen> createState() => _GameVsBotScreenState();
}

class _GameVsBotScreenState extends State<GameVsBotScreen> {
  late chess_lib.Chess _game;
  late String _playerColor;
  late int _skill;
  late String _timeControl;

  String? _selectedSquare;
  Set<String> _legalTargets = {};
  String? _lastMoveFrom;
  String? _lastMoveTo;
  bool _botThinking = false;
  bool _botMoveInProgress = false;

  final List<Map<String, dynamic>> _moveHistory = [];

  // Promotion.
  ({String from, String to})? _pendingPromotion;

  // Clocks.
  int _whiteTimeMs = 0;
  int _blackTimeMs = 0;
  int _incrementMs = 0;
  bool _timerActive = false;
  DateTime? _lastTick;
  Timer? _clockTimer;

  // Hints.
  bool _hintActive = false;
  String? _hintFrom;
  String? _hintTo;
  StreamSubscription<EngineBestMove>? _bestMoveSub;
  StreamSubscription<EngineEvaluation>? _evalSub;
  EngineEvaluation? _evaluation;

  // Board appearance.
  final BoardTheme _boardTheme = boardThemes.first;
  bool _orientationWhite = true;

  // Game over.
  bool _isGameOver = false;
  String _gameOverResult = ''; // win | loss | draw
  String _gameOverReason = '';

  // Analysis.
  String _analysisStatus = ''; // '' | submitting | running | completed | failed
  int _analysisProgress = 0;
  int _analysisExpectedPlies = 0;
  String _analysisRequestId = '';
  String? _currentGameId;
  final String _liveAnalysisGameId = _uuid();

  static String _uuid() {
    return 'game-${DateTime.now().millisecondsSinceEpoch}';
  }

  @override
  void initState() {
    super.initState();
    _playerColor = widget.playerColor == 'black' ? 'black' : 'white';
    _skill = widget.skill.clamp(0, 20);
    _timeControl = widget.timeControl;
    _orientationWhite = _playerColor == 'white';
    _game = chess_lib.Chess();
    _initClocks();
    _bootstrapEngine();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _bestMoveSub?.cancel();
    _evalSub?.cancel();
    super.dispose();
  }

  /* ------------------------------ setup ------------------------------ */

  TimeControlSpec? get _spec => TimeControlSpec.parse(_timeControl);

  bool get _isTimed => _spec != null;

  void _initClocks() {
    final spec = _spec;
    if (spec == null) {
      _whiteTimeMs = 0;
      _blackTimeMs = 0;
      _incrementMs = 0;
      _timerActive = false;
      return;
    }
    _whiteTimeMs = spec.baseMs;
    _blackTimeMs = spec.baseMs;
    _incrementMs = spec.incMs;
    _timerActive = false;
  }

  bool get _isUserTurn =>
      !_isGameOver &&
      !_botThinking &&
      ((_playerColor == 'white' && _game.turn == chess_lib.Color.WHITE) ||
          (_playerColor == 'black' && _game.turn == chess_lib.Color.BLACK));

  bool get _isBotTurn =>
      !_isGameOver &&
      ((_playerColor == 'white' && _game.turn == chess_lib.Color.BLACK) ||
          (_playerColor == 'black' && _game.turn == chess_lib.Color.WHITE));

  Future<void> _bootstrapEngine() async {
    final engine = context.read<StockfishEngineService>();
    _evalSub = engine.evaluationStream.listen((evaluation) {
      if (!mounted) return;
      setState(() => _evaluation = evaluation);
    });
    _bestMoveSub = engine.bestMoveStream.listen((bestMove) {
      if (!mounted) return;
      if (_hintActive && bestMove.move.length >= 4) {
        setState(() {
          _hintFrom = bestMove.move.substring(0, 2);
          _hintTo = bestMove.move.substring(2, 4);
        });
      }
    });
    try {
      if (!engine.isReady()) await engine.init();
      engine.setSkillLevel(_skill);
      if (_isBotTurn) _requestBotMove();
    } catch (_) {
      if (mounted) setState(() {});
    }
  }

  void _startClock() {
    if (!_isTimed || _timerActive || _isGameOver) return;
    _timerActive = true;
    _lastTick = DateTime.now();
    _clockTimer = Timer.periodic(const Duration(milliseconds: 100), (_) => _tickClock());
  }

  void _tickClock() {
    if (!_timerActive || _isGameOver) return;
    final now = DateTime.now();
    final delta = now.difference(_lastTick!).inMilliseconds;
    _lastTick = now;
    if (_isBotTurn) {
      _blackTimeMs -= delta;
      if (_blackTimeMs <= 0) return _onTimeOut('black');
    } else {
      _whiteTimeMs -= delta;
      if (_whiteTimeMs <= 0) return _onTimeOut('white');
    }
    if (mounted) setState(() {});
  }

  void _onTimeOut(String color) {
    _clockTimer?.cancel();
    _timerActive = false;
    setState(() {
      _isGameOver = true;
      if (color == _playerColor) {
        _gameOverResult = 'loss';
        _gameOverReason = context.read<LanguageService>().t('bot.reason.timeUp');
      } else {
        _gameOverResult = 'win';
        _gameOverReason = context.read<LanguageService>().t('bot.reason.botTimeUp');
      }
    });
    context.read<SoundService>().playGameOver(isWin: _gameOverResult == 'win');
    _beginAnalysis();
  }

  void _applyIncrement(chess_lib.Color movedColor) {
    if (!_isTimed || _incrementMs == 0) return;
    if (movedColor == chess_lib.Color.WHITE) {
      _whiteTimeMs += _incrementMs;
    } else {
      _blackTimeMs += _incrementMs;
    }
  }

  /* ------------------------------ moves ------------------------------ */

  void _onSquareTap(String square) {
    if (_isGameOver || _botThinking || _botMoveInProgress) return;

    // Completing a pending promotion is handled by the picker, not the board.
    if (_pendingPromotion != null) return;

    if (_selectedSquare != null && _legalTargets.contains(square)) {
      final promotion = _needsPromotion(_selectedSquare!, square);
      if (promotion) {
        setState(() => _pendingPromotion = (from: _selectedSquare!, to: square));
        return;
      }
      _playMove(_selectedSquare!, square);
      return;
    }

    final piece = _game.get(square);
    if (piece != null && piece.color.name.toLowerCase() == (_playerColor == 'white' ? 'white' : 'black')) {
      final targets = _game
          .moves({'square': square, 'verbose': true})
          .map((move) => move['to'] as String)
          .toSet();
      setState(() {
        _selectedSquare = square;
        _legalTargets = targets;
        _hintFrom = null;
        _hintTo = null;
      });
    } else {
      setState(() {
        _selectedSquare = null;
        _legalTargets = {};
      });
    }
  }

  void _onMoveAttempt(String from, String to) {
    if (_isGameOver || _botThinking || _botMoveInProgress || _pendingPromotion != null) return;
    final piece = _game.get(from);
    if (piece == null || piece.color.name.toLowerCase() != (_playerColor == 'white' ? 'white' : 'black')) {
      return;
    }
    final legal = _game.moves({'square': from, 'verbose': true}).any((move) => move['to'] == to);
    if (!legal) return;
    if (_needsPromotion(from, to)) {
      setState(() => _pendingPromotion = (from: from, to: to));
      return;
    }
    _playMove(from, to);
  }

  bool _needsPromotion(String from, String to) {
    final piece = _game.get(from);
    if (piece == null || piece.type != chess_lib.PieceType.PAWN) return false;
    return to.endsWith('8') || to.endsWith('1');
  }

  void _playMove(String from, String to, {String? promotion}) {
    final fenBefore = _game.fen;
    final ok = _game.move({
      'from': from,
      'to': to,
      'promotion': ?promotion,
    });
    if (!ok) return;

    final history = _game.history;
    final sanMoves = _game.san_moves();
    final san = sanMoves.isNotEmpty ? (sanMoves.last ?? '') : '';
    final last = history.isNotEmpty ? history.last.move : null;
    final moveColor = _game.turn == chess_lib.Color.WHITE ? 'black' : 'white';

    setState(() {
      _selectedSquare = null;
      _legalTargets = {};
      _lastMoveFrom = from;
      _lastMoveTo = to;
      _pendingPromotion = null;
    });

    _applyIncrement(moveColor == 'white' ? chess_lib.Color.WHITE : chess_lib.Color.BLACK);
    _startClock();

    final isCapture = last != null && last.captured != null;
    context.read<SoundService>().playMove(
          isCapture: isCapture,
          isCheck: _game.in_check,
        );

    _submitLiveMove(moveColor, san, from, to, promotion, fenBefore, _game.fen);

    if (!_checkGameOver()) _requestBotMove();
  }

  void _submitLiveMove(
    String color,
    String san,
    String from,
    String to,
    String? promotion,
    String fenBefore,
    String fenAfter,
  ) {
    if (!context.read<AuthService>().isAuthenticated) return;
    final moveNumber = (_moveHistory.length ~/ 2) + 1;
    _moveHistory.add({
      'san': san,
      'from': from,
      'to': to,
      'color': color,
    });
    context.read<MoveAnalysisApiService>().submitLiveMove(
          LiveMoveAnalysisRequest(
            gameId: _liveAnalysisGameId,
            ply: _moveHistory.length,
            moveNumber: moveNumber,
            color: color,
            san: san,
            uci: '$from$to${promotion ?? ''}',
            fenBefore: fenBefore,
            fenAfter: fenAfter,
          ),
        );
  }

  /* ------------------------------ bot ------------------------------ */

  void _requestBotMove() {
    final engine = context.read<StockfishEngineService>();
    if (!engine.isReady() || _botMoveInProgress || _isGameOver) {
      if (!engine.isReady()) {
        // Retry once the engine finishes booting.
        engine.init().then((_) {
          if (mounted && !_isGameOver && _isBotTurn) _requestBotMove();
        }).catchError((_) {});
      }
      return;
    }
    setState(() => _botThinking = true);
    engine.newGame();
    engine.setSkillLevel(_skill);
    engine.setPosition(_game.fen);
    engine.go(depth: botSearchDepth(_skill));
    _botMoveInProgress = true;
    _startClock();

    Timer(const Duration(milliseconds: 250), () {
      if (!mounted || _botThinking) _onBotBestMove(engine.lastBestMove);
    });
  }

  void _onBotBestMove(EngineBestMove? bestMove) {
    if (!mounted || !_botThinking) return;
    final move = bestMove?.move ?? '';
    _botMoveInProgress = false;

    if (move.length < 4 || _isGameOver) {
      setState(() => _botThinking = false);
      return;
    }

    final from = move.substring(0, 2);
    final to = move.substring(2, 4);
    final promotion = move.length > 4 ? move.substring(4, 5) : null;
    final fenBefore = _game.fen;

    final ok = _game.move({
      'from': from,
      'to': to,
      'promotion': ?promotion,
    });
    if (!ok) {
      setState(() => _botThinking = false);
      return;
    }

    final history = _game.history;
    final sanMoves = _game.san_moves();
    final san = sanMoves.isNotEmpty ? (sanMoves.last ?? '') : '';
    final last = history.isNotEmpty ? history.last.move : null;
    final isCapture = last != null && last.captured != null;

    setState(() {
      _botThinking = false;
      _lastMoveFrom = from;
      _lastMoveTo = to;
      _hintActive = false;
      _hintFrom = null;
      _hintTo = null;
      _moveHistory.add({'san': san, 'from': from, 'to': to, 'color': 'black'});
    });

    _applyIncrement(chess_lib.Color.BLACK);
    context.read<SoundService>().playMove(isCapture: isCapture, isCheck: _game.in_check);
    _submitLiveMove('black', san, from, to, promotion, fenBefore, _game.fen);

    if (!_checkGameOver() && _isUserTurn) _startClock();
  }

  /* ------------------------------ game over ------------------------------ */

  bool _checkGameOver() {
    if (!_game.game_over) return false;
    final language = context.read<LanguageService>();
    setState(() {
      _isGameOver = true;
      _timerActive = false;
      if (_game.in_checkmate) {
        final userWon = _game.turn != chess_lib.Color.WHITE
            ? _playerColor == 'white'
            : _playerColor == 'black';
        if (userWon) {
          _gameOverResult = 'win';
          _gameOverReason = language.t('bot.reason.checkmateWin', {'level': _skill});
        } else {
          _gameOverResult = 'loss';
          _gameOverReason = language.t('bot.reason.checkmateLoss');
        }
      } else if (_game.in_stalemate) {
        _gameOverResult = 'draw';
        _gameOverReason = language.t('bot.reason.stalemate');
      } else if (_game.in_threefold_repetition) {
        _gameOverResult = 'draw';
        _gameOverReason = language.t('bot.reason.repetition');
      } else if (_game.insufficient_material) {
        _gameOverResult = 'draw';
        _gameOverReason = language.t('bot.reason.insufficient');
      } else {
        _gameOverResult = 'draw';
        _gameOverReason = language.t('bot.reason.fiftyMove');
      }
    });
    _clockTimer?.cancel();
    context.read<SoundService>().playGameOver(isWin: _gameOverResult == 'win');
    _recordFinishedGame();
    _beginAnalysis();
    return true;
  }

  void _recordFinishedGame() {
    final pgn = _game.pgn();
    final outcome = switch (_gameOverResult) {
      'win' => GameOutcome.win,
      'loss' => GameOutcome.loss,
      _ => GameOutcome.draw,
    };
    final history = context.read<GameHistoryService>();
    _currentGameId = history.recordGame(
      NewGameHistory(
        pgn: pgn,
        result: outcome,
        reason: _gameOverReason,
        playerColor: _playerColor,
        opponent: widget.kidsMode ? 'Chess Buddy' : 'Stockfish',
        skillLevel: _skill,
        timeControl: _timeControl,
        plies: _moveHistory.length,
      ),
    );
  }

  /* ------------------------------ analysis ------------------------------ */

  Future<void> _beginAnalysis() async {
    if (widget.kidsMode || _moveHistory.length < 2) return;
    if (_analysisStatus == 'submitting') return;

    final api = context.read<MoveAnalysisApiService>();
    final history = context.read<GameHistoryService>();
    final pgn = _game.pgn();

    setState(() {
      _analysisStatus = 'submitting';
      _analysisExpectedPlies = _moveHistory.length;
      _analysisProgress = 0;
    });

    try {
      try {
        await api.finalizeLive(_liveAnalysisGameId, _moveHistory.length, pgn);
      } catch (_) {
        // No live job (played signed out): submit the whole PGN instead.
        final submitted = await api.submit(pgn, _liveAnalysisGameId);
        _analysisRequestId = submitted.requestId;
      }

      await for (final report in api.watchByGameId(_liveAnalysisGameId)) {
        if (!mounted) break;
        setState(() {
          _analysisStatus = report.status.name.toLowerCase();
          _analysisProgress = report.moveCount;
          _analysisExpectedPlies = [_analysisExpectedPlies, report.moveCount].reduce((a, b) => a > b ? a : b);
        });
        if (_currentGameId != null) {
          history.attachAnalysis(_currentGameId, report.requestId);
        }
        _analysisRequestId = report.requestId;
        if (report.status == AnalysisJobStatus.completed ||
            report.status == AnalysisJobStatus.failed) {
          break;
        }
      }
    } catch (_) {
      if (mounted) setState(() => _analysisStatus = 'failed');
    }
  }

  void _openReview() {
    if (_analysisRequestId.isEmpty) return;
    final uri = Uri(
      path: AppRoutes.analysis,
      queryParameters: {
        'requestId': _analysisRequestId,
        'side': _playerColor,
        'plies': '${_moveHistory.length}',
      },
    );
    context.go(uri.toString());
  }

  /* ------------------------------ controls ------------------------------ */

  void _takeback() {
    if (_moveHistory.isEmpty || _botThinking || _botMoveInProgress) return;
    // Undo the bot's move and the user's move so it is the user's turn again.
    var undone = 0;
    while (undone < 2 && _game.history.isNotEmpty) {
      _game.undo_move();
      undone += 1;
    }
    for (var i = 0; i < undone && _moveHistory.isNotEmpty; i++) {
      _moveHistory.removeLast();
    }
    final last = _game.history.isNotEmpty ? _game.history.last.move : null;
    setState(() {
      _selectedSquare = null;
      _legalTargets = {};
      _lastMoveFrom = last?.fromAlgebraic;
      _lastMoveTo = last?.toAlgebraic;
      _hintActive = false;
      _hintFrom = null;
      _hintTo = null;
    });
    context.read<LanguageService>().t('bot.msg.moveUndone');
    cmSnackBar(context, context.read<LanguageService>().t('bot.msg.moveUndone'));
  }

  void _toggleHint() {
    if (_isGameOver || _botThinking) return;
    final engine = context.read<StockfishEngineService>();
    if (!engine.isReady()) return;
    if (_hintActive) {
      setState(() {
        _hintActive = false;
        _hintFrom = null;
        _hintTo = null;
      });
      return;
    }
    setState(() => _hintActive = true);
    engine.setPosition(_game.fen);
    engine.go(depth: 15);
  }

  void _flipBoard() => setState(() => _orientationWhite = !_orientationWhite);

  Future<void> _resign() async {
    if (_isGameOver) return;
    final language = context.read<LanguageService>();
    final ok = await showCmConfirmDialog(
      context,
      title: language.t('bot.resign.title'),
      message: language.t('bot.resign.message'),
      confirmLabel: language.t('bot.resign.confirm'),
      cancelLabel: language.t('bot.resign.keepPlaying'),
      icon: Icons.flag_rounded,
      tone: 'danger',
    );
    if (!ok || !mounted) return;
    setState(() {
      _isGameOver = true;
      _timerActive = false;
      _gameOverResult = 'loss';
      _gameOverReason = language.t('bot.reason.resigned');
    });
    _clockTimer?.cancel();
    context.read<SoundService>().playGameOver(isWin: false);
    _recordFinishedGame();
    _beginAnalysis();
  }

  void _newGame() {
    setState(() {
      _game = chess_lib.Chess();
      _moveHistory.clear();
      _selectedSquare = null;
      _legalTargets = {};
      _lastMoveFrom = null;
      _lastMoveTo = null;
      _isGameOver = false;
      _gameOverResult = '';
      _gameOverReason = '';
      _analysisStatus = '';
      _analysisProgress = 0;
      _analysisRequestId = '';
      _hintActive = false;
      _hintFrom = null;
      _hintTo = null;
      _botThinking = false;
      _botMoveInProgress = false;
      _evaluation = null;
      _currentGameId = null;
      _initClocks();
    });
    final engine = context.read<StockfishEngineService>();
    engine.newGame();
    engine.setSkillLevel(_skill);
    if (_isBotTurn) _requestBotMove();
  }

  Future<void> _changeStrength() async {
    final setup = await showBotSetupDialog(context);
    if (setup == null || !mounted) return;
    setState(() {
      _skill = setup.skillLevel;
      _timeControl = setup.timeControl;
      _playerColor = setup.color;
      _orientationWhite = _playerColor == 'white';
      _initClocks();
    });
    context.read<StockfishEngineService>().setSkillLevel(_skill);
    _newGame();
  }

  Future<void> _copy(String value, String message) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (mounted) cmSnackBar(context, message);
  }

  /* ------------------------------ build ------------------------------ */

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final sound = context.watch<SoundService>();
    final engine = context.watch<StockfishEngineService>();
    final cm = context.cm;
    final tt = context.tt;

    final captured = CapturedPieces.fromGame(_game, _playerColor);
    final userIsWhite = _playerColor == 'white';
    final boardFen = _game.fen;

    final arrows = <BoardArrow>[
      if (_hintFrom != null && _hintTo != null)
        BoardArrow(from: _hintFrom!, to: _hintTo!, tone: ArrowTone.info),
    ];

    final checkSquare = _game.in_check ? _kingSquare(_game.turn) : null;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _header(language, engine, cm, tt, sound),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final wide = constraints.maxWidth >= 980;
                  final boardColumn = _boardColumn(
                    language,
                    cm,
                    tt,
                    boardFen,
                    captured,
                    arrows,
                    checkSquare,
                    userIsWhite,
                  );
                  if (wide) {
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: boardColumn),
                        SizedBox(
                          width: 360,
                          child: _sidePanel(language, cm, tt, captured),
                        ),
                      ],
                    );
                  }
                  return SingleChildScrollView(
                    child: Column(
                      children: [
                        boardColumn,
                        _sidePanel(language, cm, tt, captured),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      bottomSheet: _pendingPromotion == null
          ? null
          : _promotionSheet(language, cm, tt),
    );
  }

  String? _kingSquare(chess_lib.Color color) {
    for (final rank in '12345678'.split('')) {
      for (final file in 'abcdefgh'.split('')) {
        final piece = _game.get('$file$rank');
        if (piece != null && piece.type == chess_lib.PieceType.KING && piece.color == color) {
          return '$file$rank';
        }
      }
    }
    return null;
  }

  Widget _header(
    LanguageService language,
    StockfishEngineService engine,
    dynamic cm,
    TextTheme tt,
    SoundService sound,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: cm.toolbar,
        border: Border(bottom: BorderSide(color: cm.line)),
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: language.t('bot.tooltip.back'),
            icon: Icon(Icons.arrow_back_rounded, color: cm.toolbarInk),
            onPressed: () => context.go(AppRoutes.play),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.kidsMode ? language.t('bot.kidsMode') : language.t('bot.challenge'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: tt.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: cm.toolbarInk,
                  ),
                ),
                const SizedBox(height: 2),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _headerChip(
                        Icons.bolt_rounded,
                        widget.kidsMode
                            ? language.t('bot.funPractice')
                            : language.t('bot.difficulty.label', {
                                'band': language.t('bot.difficulty.${_band(_skill)}'),
                                'level': _skill,
                              }),
                        cm,
                        tt,
                      ),
                      _dot(cm),
                      _headerChip(
                        _playerColor == 'white' ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                        language.t('bot.playingAs', {
                          'color': language.t('bot.$_playerColor'),
                        }),
                        cm,
                        tt,
                      ),
                      _dot(cm),
                      _headerChip(
                        engine.isThinking
                            ? Icons.psychology_rounded
                            : Icons.check_circle_outline_rounded,
                        engine.isThinking ? language.t('bot.thinking') : language.t('bot.ready'),
                        cm,
                        tt,
                      ),
                      _dot(cm),
                      _headerChip(
                        _timeControl == 'unlimited'
                            ? Icons.all_inclusive_rounded
                            : Icons.speed_rounded,
                        _timeControl == 'unlimited'
                            ? language.t('bot.type.unlimited')
                            : '$_timeControl ${language.t(gameTypeLabelKey(_timeControl))}',
                        cm,
                        tt,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (!widget.kidsMode)
            TextButton.icon(
              onPressed: _changeStrength,
              icon: Icon(Icons.tune_rounded, size: 18, color: cm.toolbarInk),
              label: Text(
                language.t('bot.changeStrength'),
                style: TextStyle(color: cm.toolbarInk),
              ),
            ),
          CmPrimaryButton(
            small: true,
            label: language.t('bot.newGame'),
            icon: Icons.refresh_rounded,
            onPressed: _newGame,
          ),
        ],
      ),
    );
  }

  String _band(int skill) => switch (skill) {
        <= 3 => 'beginner',
        <= 8 => 'casual',
        <= 13 => 'intermediate',
        <= 17 => 'advanced',
        _ => 'master',
      };

  Widget _headerChip(IconData icon, String label, dynamic cm, TextTheme tt) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: cm.toolbarInk.withValues(alpha: 0.8)),
        const SizedBox(width: 4),
        Text(
          label,
          style: tt.labelSmall?.copyWith(
            color: cm.toolbarInk.withValues(alpha: 0.9),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _dot(dynamic cm) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Text('•', style: TextStyle(color: cm.toolbarInk.withValues(alpha: 0.5))),
      );

  Widget _boardColumn(
    LanguageService language,
    dynamic cm,
    TextTheme tt,
    String fen,
    CapturedPieces captured,
    List<BoardArrow> arrows,
    String? checkSquare,
    bool userIsWhite,
  ) {
    final botIsWhite = !userIsWhite;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          _playerBar(
            language,
            cm,
            tt,
            isBot: true,
            captured: captured.botCaptured,
            material: captured.botMaterialAdvantage,
            timeMs: botIsWhite ? _whiteTimeMs : _blackTimeMs,
            active: _isBotTurn,
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_isTimed)
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 8),
                  child: _evalBar(cm),
                ),
              Expanded(
                child: AspectRatio(
                  aspectRatio: 1,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: cm.boardFrame,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: cm.line),
                      boxShadow: CmShadow.md(cm),
                    ),
                    child: ChessBoardView(
                      fen: fen,
                      orientationWhite: _orientationWhite,
                      interactive: true,
                      theme: _boardTheme,
                      selectedSquare: _selectedSquare,
                      legalTargets: _legalTargets,
                      lastMoveFrom: _lastMoveFrom,
                      lastMoveTo: _lastMoveTo,
                      checkSquare: checkSquare,
                      arrows: arrows,
                      onSquareTap: _onSquareTap,
                      onMoveAttempt: _onMoveAttempt,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _playerBar(
            language,
            cm,
            tt,
            isBot: false,
            captured: captured.userCaptured,
            material: captured.userMaterialAdvantage,
            timeMs: botIsWhite ? _blackTimeMs : _whiteTimeMs,
            active: _isUserTurn,
          ),
        ],
      ),
    );
  }

  Widget _evalBar(dynamic cm) {
    final evaluation = _evaluation;
    double factor = 0.5;
    String label = '';
    if (evaluation != null) {
      if (evaluation.isMate) {
        factor = evaluation.value > 0 ? 1.0 : 0.0;
        label = 'M${evaluation.value.abs()}';
      } else {
        final clamped = evaluation.value.clamp(-1000, 1000);
        factor = 0.5 + (clamped / 2000);
        label = (evaluation.value / 100).toStringAsFixed(1);
      }
    }
    return Container(
      width: 26,
      height: 300,
      decoration: BoxDecoration(
        color: cm.surfaceMuted,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: cm.line),
      ),
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          FractionallySizedBox(
            heightFactor: factor.clamp(0.02, 1.0),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          Center(
            child: RotatedBox(
              quarterTurns: 1,
              child: Text(
                label,
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _playerBar(
    LanguageService language,
    dynamic cm,
    TextTheme tt, {
    required bool isBot,
    required List<String> captured,
    required int material,
    required int timeMs,
    required bool active,
  }) {
    final name = isBot
        ? (widget.kidsMode ? 'Chess Buddy' : 'Stockfish 19')
        : (context.read<AuthService>().userDisplayName ?? language.t('bot.you'));
    final lowTime = _isTimed && isTimeLow(timeMs, _timeControl);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: active ? cm.primarySoft : cm.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: active ? cm.primary.withValues(alpha: 0.4) : cm.line),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: isBot ? cm.primarySoft : cm.goldSoft,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isBot
                  ? (widget.kidsMode ? Icons.emoji_emotions_rounded : Icons.smart_toy_rounded)
                  : Icons.person_rounded,
              size: 18,
              color: isBot ? cm.primary : cm.gold,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: tt.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    if (isBot && !widget.kidsMode) ...[
                      const SizedBox(width: 6),
                      CmTag(language.t('bot.botLevel', {'level': _skill}), dense: true),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Wrap(
                  spacing: 4,
                  runSpacing: 2,
                  children: [
                    for (final asset in captured)
                      SvgPicture.asset('assets/pieces/$asset.svg', width: 14, height: 14),
                    if (material > 0)
                      Text(
                        '+$material',
                        style: tt.labelSmall?.copyWith(
                          color: cm.success,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          if (_isTimed)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: lowTime ? cm.dangerSoft : cm.surfaceMuted,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: lowTime ? cm.danger.withValues(alpha: 0.5) : cm.line),
              ),
              child: Text(
                formatGameClock(timeMs),
                style: tt.labelLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  fontFeatures: const [FontFeature.tabularFigures()],
                  color: lowTime ? cm.danger : cm.inkSoft,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _sidePanel(LanguageService language, dynamic cm, TextTheme tt, CapturedPieces captured) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Status / turn.
          if (_isGameOver)
            _gameOverCard(language, cm, tt)
          else if (_botThinking)
            _pill(cm, tt, Icons.psychology_rounded, language.t('bot.thinking'), 'blue')
          else if (_game.in_check)
            _pill(cm, tt, Icons.warning_amber_rounded, language.t('bot.check'), 'danger')
          else if (_isUserTurn)
            _pill(cm, tt, Icons.person_rounded, language.t('bot.yourTurn'), 'green'),
          const SizedBox(height: 10),

          // Engine evaluation.
          if (!widget.kidsMode) ...[
            _engineCard(language, cm, tt),
            const SizedBox(height: 10),
          ],

          // Controls.
          _controls(language, cm, tt),
          const SizedBox(height: 10),

          // Move history.
          _moveList(language, cm, tt),
        ],
      ),
    );
  }

  Widget _pill(dynamic cm, TextTheme tt, IconData icon, String label, String tone) {
    final color = cm.accent(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: cm.accentSoft(tone),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: tt.labelLarge?.copyWith(color: color, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _engineCard(LanguageService language, dynamic cm, TextTheme tt) {
    final evaluation = _evaluation;
    String evalLabel = '—';
    double factor = 0.5;
    if (evaluation != null) {
      if (evaluation.isMate) {
        evalLabel = 'M${evaluation.value.abs()}';
        factor = evaluation.value > 0 ? 1 : 0;
      } else {
        evalLabel = (evaluation.value / 100).toStringAsFixed(1);
        factor = 0.5 + (evaluation.value.clamp(-1000, 1000) / 2000);
      }
    }
    final line = evaluation?.pv ?? const [];
    final lineSan = _pvToSan(line);

    return CmPanel(
      padding: const EdgeInsets.all(14),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.insights_rounded, size: 16, color: cm.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  language.t('bot.engineEvaluation'),
                  style: tt.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                evalLabel,
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: factor.clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: Colors.black.withValues(alpha: 0.6),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ),
          const SizedBox(height: 10),
          if (evaluation != null)
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                _kv(cm, tt, language.t('bot.depth'), '${evaluation.depth}'),
                if (evaluation.nps != null)
                  _kv(cm, tt, language.t('bot.nodes'), '${evaluation.nps}'),
              ],
            ),
          if (lineSan.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '${language.t('bot.bestLine')} $lineSan',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: tt.labelSmall?.copyWith(color: cm.muted),
            ),
          ],
        ],
      ),
    );
  }

  String _pvToSan(List<String> pv) {
    if (pv.isEmpty) return '';
    final scratch = chess_lib.Chess();
    final sans = <String>[];
    for (final uci in pv) {
      if (uci.length < 4) break;
      final ok = scratch.move({
        'from': uci.substring(0, 2),
        'to': uci.substring(2, 4),
        if (uci.length > 4) 'promotion': uci.substring(4, 5),
      });
      if (!ok) break;
      final history = scratch.history;
      if (history.isNotEmpty) sans.add(scratch.move_to_san(history.last.move));
    }
    return sans.join(' ');
  }

  Widget _kv(dynamic cm, TextTheme tt, String label, String value) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: tt.labelSmall?.copyWith(color: cm.muted)),
        const SizedBox(width: 4),
        Text(value, style: tt.labelSmall?.copyWith(fontWeight: FontWeight.w700)),
      ],
    );
  }

  Widget _controls(LanguageService language, dynamic cm, TextTheme tt) {
    Widget btn({
      required IconData icon,
      required String label,
      required VoidCallback onTap,
      bool enabled = true,
      bool active = false,
      String tooltip = '',
    }) {
      return Expanded(
        child: Tooltip(
          message: tooltip.isEmpty ? label : tooltip,
          child: InkWell(
            onTap: enabled ? onTap : null,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: active ? cm.primarySoft : (enabled ? cm.surface : cm.surfaceMuted),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: active ? cm.primary.withValues(alpha: 0.5) : cm.lineStrong,
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    icon,
                    size: 17,
                    color: enabled ? (active ? cm.primary : cm.inkSoft) : cm.mutedLight,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: tt.labelSmall?.copyWith(
                      color: enabled ? (active ? cm.primary : cm.inkSoft) : cm.mutedLight,
                      fontWeight: FontWeight.w600,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final canAct = !_isGameOver && !_botThinking && !_botMoveInProgress;
    return Row(
      children: [
        btn(
          icon: Icons.undo_rounded,
          label: language.t('bot.takeback'),
          tooltip: language.t('bot.tooltip.takeback'),
          enabled: canAct && _moveHistory.isNotEmpty,
          onTap: _takeback,
        ),
        const SizedBox(width: 8),
        btn(
          icon: Icons.lightbulb_rounded,
          label: _hintActive ? language.t('bot.hideHint') : language.t('bot.hint'),
          tooltip: language.t('bot.tooltip.hint'),
          enabled: canAct && !widget.kidsMode,
          active: _hintActive,
          onTap: _toggleHint,
        ),
        const SizedBox(width: 8),
        btn(
          icon: Icons.flip_rounded,
          label: language.t('bot.flipBoard'),
          tooltip: language.t('bot.tooltip.flip'),
          enabled: true,
          onTap: _flipBoard,
        ),
        const SizedBox(width: 8),
        btn(
          icon: Icons.flag_rounded,
          label: language.t('bot.resign'),
          tooltip: language.t('bot.tooltip.resign'),
          enabled: canAct,
          onTap: _resign,
        ),
      ],
    );
  }

  Widget _moveList(LanguageService language, dynamic cm, TextTheme tt) {
    final pairs = <Widget>[];
    for (var i = 0; i < _moveHistory.length; i += 2) {
      final number = (i ~/ 2) + 1;
      final white = _moveHistory[i]['san'] as String? ?? '';
      final black = i + 1 < _moveHistory.length ? _moveHistory[i + 1]['san'] as String? ?? '' : '';
      pairs.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(
            children: [
              SizedBox(
                width: 26,
                child: Text(
                  '$number.',
                  style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                ),
              ),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _isLastPly(i) ? cm.primarySoft : Colors.transparent,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    white,
                    style: tt.labelMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _isLastPly(i + 1) ? cm.primarySoft : Colors.transparent,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    black,
                    style: tt.labelMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return CmPanel(
      padding: const EdgeInsets.all(14),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.list_alt_rounded, size: 16, color: cm.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  language.t('bot.moveHistory'),
                  style: tt.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                language.t('bot.movesCount', {'count': _moveHistory.length}),
                style: tt.labelSmall?.copyWith(color: cm.muted),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_moveHistory.isEmpty)
            Text(
              language.t('bot.emptyMoves'),
              style: tt.bodySmall?.copyWith(color: cm.muted),
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 220),
              child: SingleChildScrollView(child: Column(children: pairs)),
            ),
        ],
      ),
    );
  }

  bool _isLastPly(int index) => index == _moveHistory.length - 1;

  Widget _gameOverCard(LanguageService language, dynamic cm, TextTheme tt) {
    final isWin = _gameOverResult == 'win';
    final tone = _gameOverResult == 'win' ? 'green' : _gameOverResult == 'loss' ? 'danger' : 'slate';
    final color = cm.accent(tone);
    final title = isWin
        ? language.t('bot.victory')
        : _gameOverResult == 'loss'
            ? language.t('bot.gameOver')
            : language.t('bot.drawGame');

    return CmPanel(
      padding: const EdgeInsets.all(18),
      color: cm.accentSoft(tone),
      border: color.withValues(alpha: 0.35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  isWin
                      ? Icons.emoji_events_rounded
                      : _gameOverResult == 'loss'
                          ? Icons.sentiment_dissatisfied_rounded
                          : Icons.handshake_rounded,
                  color: color,
                  size: 26,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w800, color: color),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _gameOverReason,
                      style: tt.bodySmall?.copyWith(color: cm.inkSoft, height: 1.4),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (_analysisStatus == 'submitting' || _analysisStatus == 'running') ...[
            CmNote(
              language.t('bot.analysis.running'),
              tone: 'blue',
              icon: Icons.hourglass_top_rounded,
            ),
            const SizedBox(height: 10),
          ] else if (_analysisStatus == 'completed' && _analysisRequestId.isNotEmpty) ...[
            Row(
              children: [
                Icon(Icons.check_circle_rounded, size: 16, color: cm.success),
                const SizedBox(width: 6),
                Text(
                  language.t('bot.analysis.graded', {
                    'done': _analysisProgress,
                    'total': _analysisExpectedPlies,
                  }),
                  style: tt.labelMedium?.copyWith(color: cm.success, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ] else if (_analysisStatus == 'failed') ...[
            CmNote(
              language.t('bot.analysis.failed'),
              tone: 'danger',
              icon: Icons.error_outline_rounded,
            ),
            const SizedBox(height: 10),
          ],
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              CmPrimaryButton(
                small: true,
                label: language.t('bot.playAgain'),
                icon: Icons.refresh_rounded,
                onPressed: _newGame,
              ),
              if (_analysisRequestId.isNotEmpty)
                CmSecondaryButton(
                  small: true,
                  label: language.t('bot.analysis.review'),
                  icon: Icons.insights_rounded,
                  onPressed: _openReview,
                ),
              CmSecondaryButton(
                small: true,
                label: language.t('bot.reviewBoard'),
                icon: Icons.grid_view_rounded,
                onPressed: () => setState(() => _isGameOver = false),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              TextButton.icon(
                onPressed: () => _copy(_game.fen, language.t('bot.msg.fenCopied')),
                icon: const Icon(Icons.copy_rounded, size: 15),
                label: Text(language.t('bot.copyFen')),
              ),
              TextButton.icon(
                onPressed: () => _copy(_game.pgn(), language.t('bot.msg.pgnCopied')),
                icon: const Icon(Icons.copy_rounded, size: 15),
                label: Text(language.t('bot.copyPgn')),
              ),
              TextButton.icon(
                onPressed: () => setState(() => _isGameOver = false),
                icon: const Icon(Icons.visibility_rounded, size: 15),
                label: Text(language.t('bot.tooltip.inspect')),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _promotionSheet(LanguageService language, dynamic cm, TextTheme tt) {
    const pieces = [
      ('q', 'bot.queen', 'q'),
      ('r', 'bot.rook', 'r'),
      ('b', 'bot.bishop', 'b'),
      ('n', 'bot.knight', 'n'),
    ];
    final colorAsset = _playerColor == 'white' ? 'w' : 'b';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cm.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(color: cm.line),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            language.t('bot.promotePawn'),
            textAlign: TextAlign.center,
            style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (final entry in pieces) ...[
                InkWell(
                  onTap: () {
                    final pending = _pendingPromotion;
                    if (pending == null) return;
                    _playMove(pending.from, pending.to, promotion: entry.$1);
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 62,
                    height: 62,
                    decoration: BoxDecoration(
                      color: cm.surfaceMuted,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cm.lineStrong),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SvgPicture.asset(
                          'assets/pieces/$colorAsset${entry.$1}.svg',
                          width: 34,
                          height: 34,
                        ),
                        Text(
                          language.t(entry.$2),
                          style: tt.labelSmall?.copyWith(fontSize: 9),
                        ),
                      ],
                    ),
                  ),
                ),
                if (entry != pieces.last) const SizedBox(width: 10),
              ],
            ],
          ),
          const SizedBox(height: 10),
          CmSecondaryButton(
            label: language.t('common.cancel'),
            onPressed: () => setState(() => _pendingPromotion = null),
          ),
        ],
      ),
    );
  }
}
