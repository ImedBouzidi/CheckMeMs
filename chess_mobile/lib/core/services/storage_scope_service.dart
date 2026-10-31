import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../storage/app_storage.dart';
import 'auth_service.dart';

/// Namespaces device-local progress by account, so a shared device does not
/// show another player's games, puzzles or lessons.
///
/// Mirrors `chess-web/src/app/core/services/storage-scope.service.ts`.
class StorageScopeService extends ChangeNotifier {
  StorageScopeService(this._auth) {
    _lastScope = _auth.accountScope;
    _auth.addListener(_onAuthChanged);
  }

  final AuthService _auth;
  late String _lastScope;

  /// Stable identifier of the session owner; `guest` when signed out.
  String get scope => _auth.accountScope;

  void _onAuthChanged() {
    if (_lastScope != _auth.accountScope) {
      _lastScope = _auth.accountScope;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  String key(String baseKey) => '$baseKey.$scope';

  /// Reads a JSON blob, falling back to a pre-scope legacy key: history written
  /// before accounts were separated belongs to whoever claims it first.
  T? read<T>(String baseKey) {
    final scoped = key(baseKey);
    final storage = AppStorage.instance;
    final raw = storage.getString(scoped);
    if (raw != null) {
      final decoded = _tryDecode(raw);
      if (decoded is T) return decoded;
      return null;
    }

    final legacy = storage.getString(baseKey);
    if (legacy != null) {
      storage.setString(scoped, legacy);
      final decoded = _tryDecode(legacy);
      if (decoded is T) return decoded;
    }
    return null;
  }

  void write(String baseKey, Object? value) {
    AppStorage.instance.writeJson(key(baseKey), value);
  }

  void remove(String baseKey) {
    AppStorage.instance.remove(key(baseKey));
  }

  static Object? _tryDecode(String raw) {
    try {
      return jsonDecode(raw);
    } catch (_) {
      return null;
    }
  }
}
