import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// Reads the instructor's hints out loud — the mobile counterpart of the
/// `speechSynthesis` calls in `chess-web/src/app/features/home/kids-learn.component.ts`.
///
/// Rates and pitches match the web utterances so the owl sounds the same in
/// both apps. The web also falls back to an online TTS endpoint when the device
/// has no voice for the selected language; that request sends the child's text
/// to a third party, so it is deliberately not ported — the button simply stays
/// silent where no engine exists (Linux desktop, for example).
class InstructorVoiceService {
  InstructorVoiceService() {
    try {
      _tts = FlutterTts();
      _supported = true;
    } catch (_) {
      _tts = null;
      _supported = false;
    }
  }

  FlutterTts? _tts;
  bool _supported = false;

  /// Bumped by every new utterance so a late callback from an older one is ignored.
  int _token = 0;

  /// Drives the `coach-avatar.talking` animation.
  final ValueNotifier<bool> speaking = ValueNotifier<bool>(false);

  bool get isSupported => _supported;

  /// Strips emoji and pictographs the way the web does before speaking, then
  /// collapses the whitespace so the voice never spells out decoration.
  static final RegExp _emoji =
      RegExp(r'[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]', unicode: true);

  static String cleanText(String text) =>
      text.replaceAll(_emoji, '').replaceAll(RegExp(r'\s+'), ' ').trim();

  Future<void> speak(String text, {required String code, required String speechLang}) async {
    if (!_supported) return;
    final clean = cleanText(text);
    if (clean.isEmpty) {
      stop();
      return;
    }

    final token = ++_token;
    final tts = _tts;
    if (tts == null) return;

    try {
      await tts.stop();
      await tts.setLanguage(speechLang);
      // Arabic is the only language the web tunes differently.
      await tts.setSpeechRate(code == 'ar' ? 0.45 : 0.46);
      await tts.setPitch(code == 'ar' ? 1.0 : 1.25);
      speaking.value = true;
      await tts.speak(clean);
    } catch (_) {
      // No engine installed for this language: stay quiet instead of crashing.
      _supported = false;
    }
    if (token == _token) speaking.value = false;
  }

  void stop() {
    _token++;
    speaking.value = false;
    try {
      unawaited(_tts?.stop());
    } catch (_) {
      _supported = false;
    }
  }

  void dispose() {
    stop();
    speaking.dispose();
    try {
      unawaited(_tts?.stop());
    } catch (_) {
      // The platform has nothing to shut down.
    }
  }
}
