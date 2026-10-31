import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../models/user.dart';
import '../storage/app_storage.dart';
import 'api_client.dart';

/// Hybrid session handling, mirroring
/// `chess-web/src/app/core/services/auth.service.ts`:
///
///  * login/register hit the user-profile-service through the gateway
///    (`POST /api/auth/login`), which hands back Keycloak-issued tokens;
///  * refresh goes directly to Keycloak's token endpoint;
///  * the session owner (`sub` claim) scopes device-local progress.
class AuthService extends ChangeNotifier {
  AuthService() {
    restoreSession();
  }

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _expiresAtKey = 'token_expires_at';
  static const String _userKey = 'current_user';
  static const String _guestScope = 'guest';

  late final ApiClient _api = ApiClient(this);

  bool isAuthenticated = false;
  User? currentUser;

  /// Stable identifier for the session owner; local progress is stored per scope.
  String accountScope = _guestScope;

  Future<bool> _pendingRefresh = Future.value(false);
  bool _refreshInFlight = false;

  /// Called when the session is cleared (expired Keycloak refresh, logout).
  /// Wired by the router to land on the login page.
  void Function()? onSessionCleared;

  String? get userDisplayName => currentUser?.displayName;

  /// Only a signed JWT counts: earlier demo builds stored mock values.
  String? accessToken() {
    final token = AppStorage.instance.getString(_accessTokenKey);
    return (token != null && token.split('.').length == 3) ? token : null;
  }

  bool get canRefresh => AppStorage.instance.getString(_refreshTokenKey) != null;

  /// Auth traffic must never be retried or refreshed by the client.
  bool isAuthEndpoint(String url) =>
      url.contains('/api/auth/') || url.contains('/protocol/openid-connect/');

  /// Returns the token to send, having refreshed it first when it is about to lapse.
  Future<String?> ensureFreshToken([int withinSeconds = 20]) async {
    final token = accessToken();
    if (token == null) return null;

    final expiresAt = int.tryParse(AppStorage.instance.getString(_expiresAtKey) ?? '') ?? 0;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    if (!canRefresh || expiresAt - now > withinSeconds) {
      return token;
    }

    await refreshSession();
    return accessToken();
  }

  /// De-duplicates concurrent refresh attempts.
  Future<bool> refreshSession() {
    if (!_refreshInFlight) {
      _refreshInFlight = true;
      _pendingRefresh = _performRefresh().whenComplete(() {
        _refreshInFlight = false;
      });
    }
    return _pendingRefresh;
  }

  Future<bool> login(LoginCredentials credentials) async {
    if (credentials.email.isEmpty || credentials.password.isEmpty) return false;

    try {
      final session = await _api.post(
        '/auth/login',
        body: credentials.toJson(),
      ) as Map<String, dynamic>;
      startSession(
        session['accessToken'] as String,
        session['refreshToken'] as String,
        (session['expiresIn'] as num?)?.toInt() ?? 0,
        credentials.email,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> register(RegisterData data) async {
    if (data.email.isEmpty || data.password.isEmpty || data.username.isEmpty) return false;

    try {
      await _api.post('/auth/register', body: data.toJson());
    } catch (_) {
      return false;
    }

    // Registration hands back no tokens, so sign the new account straight in.
    return login(LoginCredentials(email: data.email, password: data.password));
  }

  /// Mock Google sign-in, exactly like the web build: a placeholder user is
  /// stored but the session is not authenticated.
  void loginWithGoogle() {
    final mockUser = User(
      id: 'google_${DateTime.now().millisecondsSinceEpoch}',
      email: 'user@gmail.com',
      firstName: 'Google',
      lastName: 'User',
      username: 'googleuser',
      provider: 'google',
      avatar: 'https://lh3.googleusercontent.com/a/default-user',
    );
    AppStorage.instance.setString(_accessTokenKey, 'mock_google_token_${DateTime.now().millisecondsSinceEpoch}');
    AppStorage.instance.setString(_userKey, jsonEncode(mockUser.toJson()));
    isAuthenticated = false;
    currentUser = mockUser;
    notifyListeners();
  }

  void logout() {
    clearSession();
    onSessionCleared?.call();
  }

  Future<bool> _performRefresh() async {
    final refreshToken = AppStorage.instance.getString(_refreshTokenKey);
    if (refreshToken == null) return false;

    try {
      final tokens = await _api.postForm(
        '${AppConfig.instance.keycloakIssuer}/protocol/openid-connect/token',
        {
          'grant_type': 'refresh_token',
          'client_id': AppConfig.instance.keycloakClientId,
          'refresh_token': refreshToken,
        },
      ) as Map<String, dynamic>;

      final email = currentUser?.email ?? '';
      startSession(
        tokens['access_token'] as String,
        (tokens['refresh_token'] as String?) ?? refreshToken,
        (tokens['expires_in'] as num?)?.toInt() ?? 0,
        email,
      );
      return true;
    } catch (_) {
      // The Keycloak session is gone (idle timeout or logout), so a retry can
      // never succeed. Land on the login page instead of a dead session.
      clearSession();
      onSessionCleared?.call();
      return false;
    }
  }

  @visibleForTesting
  void startSession(String accessToken, String refreshToken, int expiresIn, String email) {
    AppStorage.instance.setString(_accessTokenKey, accessToken);
    AppStorage.instance.setString(_refreshTokenKey, refreshToken);
    final expiresAt = DateTime.now().millisecondsSinceEpoch ~/ 1000 + expiresIn;
    AppStorage.instance.setString(_expiresAtKey, '$expiresAt');

    final existing = currentUser;
    final parts = email.split('@');
    final first = parts.isNotEmpty ? parts[0] : '';
    final handle = first.isEmpty ? 'player' : first;
    final user = existing != null && existing.email == email
        ? existing
        : User(id: handle, email: email, firstName: handle, lastName: '', username: handle);

    AppStorage.instance.setString(_userKey, jsonEncode(user.toJson()));
    currentUser = user;
    isAuthenticated = true;
    accountScope = scopeOf(accessToken);
    notifyListeners();
  }

  void clearSession() {
    AppStorage.instance.remove(_accessTokenKey);
    AppStorage.instance.remove(_refreshTokenKey);
    AppStorage.instance.remove(_expiresAtKey);
    AppStorage.instance.remove(_userKey);
    isAuthenticated = false;
    currentUser = null;
    accountScope = _guestScope;
    notifyListeners();
  }

  void restoreSession() {
    final token = accessToken();
    final userData = AppStorage.instance.getString(_userKey);

    if (token == null) {
      if (AppStorage.instance.containsKey(_accessTokenKey)) clearSession();
      return;
    }

    isAuthenticated = true;
    accountScope = scopeOf(token);
    if (userData != null) {
      try {
        currentUser = User.fromJson(jsonDecode(userData) as Map<String, dynamic>);
      } catch (_) {
        currentUser = null;
      }
    }
  }

  /// Stable identifier of the session owner from the JWT payload.
  static String scopeOf(String? token) {
    if (token == null) return _guestScope;
    try {
      final payload = token.split('.')[1];
      final normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
      final padded = normalized + '=' * ((4 - normalized.length % 4) % 4);
      final decoded = jsonDecode(utf8.decode(base64Url.decode(padded))) as Map<String, dynamic>;
      final sub = decoded['sub'] as String?;
      final username = decoded['preferred_username'] as String?;
      return (sub ?? username) ?? _guestScope;
    } catch (_) {
      return _guestScope;
    }
  }
}
