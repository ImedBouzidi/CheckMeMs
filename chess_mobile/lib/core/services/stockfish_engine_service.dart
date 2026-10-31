import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:stockfish/stockfish.dart';

import '../models/engine.dart';

/// Stockfish UCI engine, the mobile counterpart of the web app's WASM worker
/// (`stockfish-engine.service.ts`). The protocol is identical: `uci`/`isready`
/// handshake, `position fen …`, `go depth …`, `info`/`bestmove` parsing, and
/// the Skill Level -> UCI_Elo mapping (`1320 + skill * 60`).
class StockfishEngineService extends ChangeNotifier {
  StockfishEngineService() {
    _status = EngineStatus.uninitialized;
  }

  Stockfish? _engine;
  StreamSubscription<String>? _stdoutSub;
  late EngineStatus _status;
  bool _ready = false;
  bool _isThinking = false;

  EngineEvaluation? _evaluation;
  EngineBestMove? _lastBestMove;

  final StreamController<EngineEvaluation> _evaluationController =
      StreamController<EngineEvaluation>.broadcast();
  final StreamController<EngineBestMove> _bestMoveController =
      StreamController<EngineBestMove>.broadcast();

  EngineStatus get status => _status;

  /// Latest evaluation line received from the engine.
  EngineEvaluation? get evaluation => _evaluation;

  EngineBestMove? get lastBestMove => _lastBestMove;

  /// Broadcast of every evaluation update (mirrors `evaluation$`).
  Stream<EngineEvaluation> get evaluationStream => _evaluationController.stream;

  /// Broadcast of every best move (mirrors `bestMove$`).
  Stream<EngineBestMove> get bestMoveStream => _bestMoveController.stream;

  bool isReady() => _ready;

  /// Starts the native engine and waits for the UCI handshake.
  Future<void> init() async {
    if (_engine != null) return;

    _setStatus(EngineStatus.initializing);

    try {
      final engine = Stockfish();
      _engine = engine;

      _stdoutSub = engine.stdout.listen(_handleLine);

      // Wait for the engine binary itself to boot before issuing UCI commands.
      await _waitForState(engine, timeout: const Duration(seconds: 15));

      _send('uci');
      await _waitUntil(() => _ready, const Duration(seconds: 15));
    } catch (error) {
      debugPrint('Stockfish engine error: $error');
      _setStatus(EngineStatus.error);
      rethrow;
    }
  }

  Future<void> _waitForState(Stockfish engine, {required Duration timeout}) async {
    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      final state = engine.state.value;
      if (state == StockfishState.ready) return;
      if (state == StockfishState.error || state == StockfishState.disposed) {
        throw StateError('Stockfish failed to start: $state');
      }
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
  }

  Future<void> _waitUntil(bool Function() condition, Duration timeout) {
    final deadline = DateTime.now().add(timeout);
    final completer = Completer<void>();

    void check() {
      if (condition() && !completer.isCompleted) {
        completer.complete();
      } else if (DateTime.now().isAfter(deadline) && !completer.isCompleted) {
        completer.completeError(StateError('Stockfish initialization timeout'));
      } else if (!completer.isCompleted) {
        Future<void>.delayed(const Duration(milliseconds: 50), check);
      }
    }

    check();
    return completer.future;
  }

  void _handleLine(String line) {
    if (line.startsWith('info')) {
      _parseInfo(line);
    } else if (line.startsWith('bestmove')) {
      _parseBestMove(line);
      _isThinking = false;
      if (_status == EngineStatus.thinking) _setStatus(EngineStatus.ready);
    } else if (line.contains('uciok')) {
      _send('isready');
    } else if (line.contains('readyok')) {
      _ready = true;
      _setStatus(EngineStatus.ready);
    }
  }

  void _parseInfo(String line) {
    try {
      int? depth;
      EngineEvaluation? evaluation;

      final depthMatch = RegExp(r'depth (\d+)').firstMatch(line);
      if (depthMatch != null) depth = int.tryParse(depthMatch.group(1)!);

      String? type;
      int? value;

      final cpMatch = RegExp(r'score cp (-?\d+)').firstMatch(line);
      if (cpMatch != null) {
        type = 'cp';
        value = int.tryParse(cpMatch.group(1)!);
      }
      final mateMatch = RegExp(r'score mate (-?\d+)').firstMatch(line);
      if (mateMatch != null) {
        type = 'mate';
        value = int.tryParse(mateMatch.group(1)!);
      }

      List<String>? pv;
      final pvIndex = line.indexOf(' pv ');
      if (pvIndex >= 0) {
        pv = line
            .substring(pvIndex + 4)
            .trim()
            .split(RegExp(r'\s+'))
            .where((move) => move.isNotEmpty && move != '(none)')
            .toList();
      }

      int? nodes;
      final nodesMatch = RegExp(r'nodes (\d+)').firstMatch(line);
      if (nodesMatch != null) nodes = int.tryParse(nodesMatch.group(1)!);

      int? nps;
      final npsMatch = RegExp(r'nps (\d+)').firstMatch(line);
      if (npsMatch != null) nps = int.tryParse(npsMatch.group(1)!);

      int? time;
      final timeMatch = RegExp(r'time (\d+)').firstMatch(line);
      if (timeMatch != null) time = int.tryParse(timeMatch.group(1)!);

      int? multipv;
      final multipvMatch = RegExp(r'multipv (\d+)').firstMatch(line);
      if (multipvMatch != null) multipv = int.tryParse(multipvMatch.group(1)!);

      if (depth != null && type != null && value != null) {
        evaluation = EngineEvaluation(
          depth: depth,
          type: type,
          value: value,
          pv: pv ?? const [],
          nodes: nodes,
          nps: nps,
          time: time,
          multipv: multipv,
        );
      }

      if (evaluation != null) {
        _evaluation = evaluation;
        _evaluationController.add(evaluation);
        notifyListeners();
      }
    } catch (_) {
      // ignore parse errors
    }
  }

  void _parseBestMove(String line) {
    try {
      final parts = line.trim().split(RegExp(r'\s+'));
      final move = parts.length > 1 ? parts[1] : '';

      if (move.isEmpty || move == '(none)') {
        _emitBestMove(const EngineBestMove(move: ''));
        return;
      }

      String? ponder;
      if (parts.length > 3 && parts[2] == 'ponder' && parts[3] != '(none)') {
        ponder = parts[3];
      }
      _emitBestMove(EngineBestMove(move: move, ponder: ponder));
    } catch (_) {
      _emitBestMove(const EngineBestMove(move: ''));
    }
  }

  void _emitBestMove(EngineBestMove bestMove) {
    _lastBestMove = bestMove;
    _bestMoveController.add(bestMove);
  }

  void setPosition(String fen) => _send('position fen $fen');

  void setStartPosition() => _send('position startpos');

  void go({int? depth, int? movetime, int? multiPV}) {
    if (!_ready || _engine == null) return;

    _isThinking = true;
    _setStatus(EngineStatus.thinking);

    var command = 'go';
    if (depth != null) {
      command += ' depth $depth';
    } else if (movetime != null) {
      command += ' movetime $movetime';
    } else {
      command += ' depth 15';
    }

    if (multiPV != null) {
      _send('setoption name MultiPV value $multiPV');
    }

    _send(command);
  }

  void goInfinite() {
    if (!_ready || _engine == null) return;
    _isThinking = true;
    _setStatus(EngineStatus.thinking);
    _send('go infinite');
  }

  void stop() {
    if (_engine == null) return;
    _send('stop');
  }

  bool get isThinking => _isThinking;

  void setSkillLevel(int level) {
    final clamped = level.clamp(0, 20);
    _send('setoption name Skill Level value $clamped');
    if (clamped < 20) {
      _send('setoption name UCI_LimitStrength value true');
      _send('setoption name UCI_Elo value ${skillToElo(clamped)}');
    } else {
      _send('setoption name UCI_LimitStrength value false');
    }
  }

  void setThreads(int threads) => _send('setoption name Threads value $threads');

  void setHash(int sizeMB) => _send('setoption name Hash value $sizeMB');

  void newGame() {
    _send('ucinewgame');
    _send('isready');
  }

  /// Tears the engine down; a later [init] starts a fresh one.
  void quit() {
    final engine = _engine;
    if (engine == null) return;
    try {
      engine.stdin = 'quit';
    } catch (_) {
      // engine may already be disposed
    }
    _stdoutSub?.cancel();
    _stdoutSub = null;
    engine.dispose();
    _engine = null;
    _ready = false;
    _isThinking = false;
    _setStatus(EngineStatus.uninitialized);
  }

  @override
  void dispose() {
    quit();
    _evaluationController.close();
    _bestMoveController.close();
    super.dispose();
  }

  void _setStatus(EngineStatus status) {
    if (_status == status) return;
    _status = status;
    notifyListeners();
  }

  void _send(String command) {
    final engine = _engine;
    if (engine == null) return;
    try {
      engine.stdin = command;
    } catch (_) {
      // ignore
    }
  }
}
