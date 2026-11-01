// lib/core/services/stockfish_engine_impl.dart
// Real implementation for native platforms (Android, iOS, macOS, Windows, Linux).
// Wraps the `stockfish` package, exposing a factory that returns the engine.

import 'package:stockfish/stockfish.dart';

// `StockfishEngineService` reaches these through the conditional-import prefix,
// so the library has to re-export them.
export 'package:stockfish/stockfish.dart' show Stockfish, StockfishState;

class StockfishFactory {
  static Future<Stockfish> create() async {
    // The Stockfish constructor loads the native binary appropriate for the platform.
    // It may throw if the binary cannot be found; let the caller handle the error.
    return Stockfish();
  }
}
