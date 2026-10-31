import 'package:flutter/material.dart';

import '../storage/app_storage.dart';

/// `light` or `dark`, mirroring the web app's ThemeService.
enum ThemeModeOption { light, dark }

/// Theme state, mirroring `chess-web/src/app/core/services/theme.service.ts`:
/// follows the system setting until the user picks a mode explicitly.
class ThemeService extends ChangeNotifier {
  ThemeService() {
    final initial = _readStoredTheme();
    _explicit = initial.explicit;
    _mode = initial.mode;
  }

  static const String _storageKey = 'checkme-theme';

  late ThemeModeOption _mode;
  late bool _explicit;

  ThemeModeOption get mode => _mode;

  bool get isDark => _mode == ThemeModeOption.dark;

  /// True once the user picked a mode (the system setting no longer applies).
  bool get isExplicit => _explicit;

  void toggle() => setTheme(isDark ? ThemeModeOption.light : ThemeModeOption.dark);

  void setTheme(ThemeModeOption mode) {
    _explicit = true;
    _mode = mode;
    AppStorage.instance.setString(_storageKey, mode == ThemeModeOption.dark ? 'dark' : 'light');
    notifyListeners();
  }

  /// Applies the system theme while the choice is still implicit.
  void followSystemBrightness(Brightness brightness) {
    if (_explicit) return;
    final systemMode =
        brightness == Brightness.dark ? ThemeModeOption.dark : ThemeModeOption.light;
    if (_mode != systemMode) {
      _mode = systemMode;
      notifyListeners();
    }
  }

  ({ThemeModeOption mode, bool explicit}) _readStoredTheme() {
    final stored = AppStorage.instance.getString(_storageKey);
    if (stored == 'light' || stored == 'dark') {
      return (
        mode: stored == 'dark' ? ThemeModeOption.dark : ThemeModeOption.light,
        explicit: true,
      );
    }
    return (mode: ThemeModeOption.light, explicit: false);
  }
}
