import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/engine.dart';
import 'stockfish_engine_stub.dart'
    if (dart.library.io) 'stockfish_engine_impl.dart' as stockfish_platform;

class StockfishEngineService extends ChangeNotifier {
  StockfishEngineService() {
    _status = EngineStatus.uninitialized;
  }

  stockfish_platform.Stockfish? _engine;
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
  EngineEvaluation? get evaluation => _evaluation;
  EngineBestMove? get lastBestMove => _lastBestMove;
  Stream<EngineEvaluation> get evaluationStream => _evaluationController.stream;
  Stream<EngineBestMove> get bestMoveStream => _bestMoveController.stream;
  bool isReady() => _ready;
  bool get isThinking => _isThinking;

  Future<void> init() async {
    if (_engine != null) return;
    _setStatus(EngineStatus.initializing);
    try {
      final engine = await stockfish_platform.StockfishFactory.create();
      _engine = engine;
      _stdoutSub = engine.stdout.listen(_handleLine);
      await _waitForState(engine, timeout: const Duration(seconds: 15));
      _send('uci');
      await _waitUntil(() => _ready, const Duration(seconds: 15));
    } catch (error) {
      debugPrint('Stockfish engine error: $error');
      _setStatus(EngineStatus.error);
      rethrow;
    }
  }

  Future<void> _waitForState(
    stockfish_platform.Stockfish engine, {
    required Duration timeout,
  }) async {
    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      final state = engine.state.value;
      if (state == stockfish_platform.StockfishState.ready) return;
      if (state == stockfish_platform.StockfishState.error ||
          state == stockfish_platform.StockfishState.disposed) {
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
    } catch (_) {}
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
    } catch (_) {}
  }

  void _emitBestMove(EngineBestMove bestMove) {
    _lastBestMove = bestMove;
    _bestMoveController.add(bestMove);
    notifyListeners();
  }

  void _setStatus(EngineStatus status) {
    _status = status;
    notifyListeners();
  }

  void _send(String command) {
    _engine?.stdin = command;
  }

  // Public API used by UI
  void newGame() {
    _engine?.stdin = 'ucinewgame';
    _engine?.stdin = 'isready';
    _setStatus(EngineStatus.ready);
  }

  void setSkillLevel(int skill) {
    final clamped = skill.clamp(0, 20);
    _engine?.stdin = 'setoption name Skill Level value $clamped';
    if (clamped < 20) {
      _engine?.stdin = 'setoption name UCI_LimitStrength value true';
      _engine?.stdin =
          'setoption name UCI_Elo value ${skillToElo(clamped)}';
    } else {
      _engine?.stdin = 'setoption name UCI_LimitStrength value false';
    }
  }

  void setPosition(String fen) => _send('position fen $fen');
  void setStartPosition() => _send('position startpos');
  void go({required int depth}) => _send('go depth $depth');
  void goInfinite() => _send('go infinite');
  void stop() => _send('stop');

  void setThreads(int threads) => _send('setoption name Threads value $threads');
  void setHash(int sizeMB) => _send('setoption name Hash value $sizeMB');

  void disposeEngine() {
    _engine?.stdin = 'quit';
    _engine?.dispose();
    _stdoutSub?.cancel();
    _engine = null;
  }
}
