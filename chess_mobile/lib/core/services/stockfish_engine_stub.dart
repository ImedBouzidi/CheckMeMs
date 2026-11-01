// lib/core/services/stockfish_engine_stub.dart
// Stub implementation used when compiling to Web. The real `stockfish` package
// depends on `dart:ffi`, which is unavailable on the web platform, causing compile errors.
// This stub provides the minimal API surface used by `StockfishEngineService` so the app
// can run (with engine disabled) in a browser.

import 'dart:async';
import 'package:flutter/foundation.dart';

// Minimal representation of the StockfishState enum used by the real package.
enum StockfishState { ready, error, disposed }

class Stockfish {
  // The real Stockfish class exposes a broadcast stream of stdout lines.
  // Here we provide only the protocol responses needed during initialization.
  final StreamController<String> _stdoutController = StreamController<String>.broadcast();
  Stream<String> get stdout => _stdoutController.stream;

  // The real class has a `state` ValueNotifier indicating readiness.
  final ValueNotifier<StockfishState> state = ValueNotifier(StockfishState.ready);

  set stdin(String command) {
    if (command == 'uci') {
      _stdoutController.add('uciok');
    } else if (command == 'isready') {
      _stdoutController.add('readyok');
    }
  }

  void dispose() {
    _stdoutController.close();
    state.dispose();
  }
}

class StockfishFactory {
  // Creates a dummy engine instance. The `init` method in StockfishEngineService will
  // treat the engine as ready immediately.
  static Future<Stockfish> create() async => Stockfish();
}

// The stub does not implement any UCI command methods because they are never called
// on the web – the UI will simply not display engine analysis.
