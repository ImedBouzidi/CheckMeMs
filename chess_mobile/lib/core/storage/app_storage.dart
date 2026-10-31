import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Device-local key/value storage — the counterpart of the web app's
/// `window.localStorage`, backed by SharedPreferences.
///
/// Initialise once from `main()` before running the app:
/// ```dart
/// await AppStorage.instance.init();
/// ```
class AppStorage {
  AppStorage._();

  static final AppStorage instance = AppStorage._();

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  SharedPreferences get _require {
    final prefs = _prefs;
    if (prefs == null) {
      throw StateError('AppStorage.init() must be awaited before use (see main()).');
    }
    return prefs;
  }

  String? getString(String key) => _require.getString(key);

  Future<bool> setString(String key, String value) => _require.setString(key, value);

  bool? getBool(String key) => _require.getBool(key);

  Future<bool> setBool(String key, bool value) => _require.setBool(key, value);

  /// Parses a JSON value stored under [key]; returns `null` when absent or corrupt.
  T? readJson<T>(String key) {
    final raw = _require.getString(key);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as T;
    } catch (_) {
      return null;
    }
  }

  Future<bool> writeJson(String key, Object? value) {
    try {
      return _require.setString(key, jsonEncode(value));
    } catch (_) {
      // Storage can be unavailable; the in-memory state still applies.
      return Future.value(false);
    }
  }

  Future<bool> remove(String key) => _require.remove(key);

  bool containsKey(String key) => _require.containsKey(key);
}
