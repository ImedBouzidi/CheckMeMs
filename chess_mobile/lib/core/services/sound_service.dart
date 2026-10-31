import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

/// Game sounds, replicating the WebAudio oscillators of the web app's
/// `game-vs-bot.component.ts` as pre-synthesised WAV assets with the same
/// frequencies and envelopes:
///
///  * move   — sine 450 -> 120 Hz, short blip
///  * capture — sine 340 -> 80 Hz, heavier
///  * check  — triangle 659 -> 880 Hz, longer
///  * win    — triangle A4 -> C#5 -> E5 arpeggio
///  * lose   — sawtooth E4 -> D4 fall
class SoundService extends ChangeNotifier {
  SoundService() {
    _player.setVolume(0.5);
  }

  final AudioPlayer _player = AudioPlayer();

  /// Mute state is in-memory only, exactly like the web build.
  bool isMuted = false;

  void toggle() {
    isMuted = !isMuted;
    notifyListeners();
  }

  void setMuted(bool muted) {
    if (isMuted == muted) return;
    isMuted = muted;
    notifyListeners();
  }

  /// Move sound with capture / check variants.
  void playMove({bool isCapture = false, bool isCheck = false}) {
    if (isMuted) return;
    final asset = isCheck
        ? 'sounds/check.wav'
        : isCapture
            ? 'sounds/capture.wav'
            : 'sounds/move.wav';
    _play(asset);
  }

  /// Game-over fanfare.
  void playGameOver({required bool isWin}) {
    if (isMuted) return;
    _play(isWin ? 'sounds/win.wav' : 'sounds/lose.wav');
  }

  void _play(String asset) {
    try {
      _player.stop();
      _player.play(AssetSource(asset));
    } catch (_) {
      // Audio must never break the game.
    }
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }
}
