import 'dart:io' show Platform;

/// Application configuration — the mobile counterpart of
/// `chess-web/src/app/core/config/app-config.ts`.
///
/// The web app points the browser at `http://localhost:8081/api` (the API
/// gateway). On a device `localhost` is the device itself, so the default host
/// is platform-aware:
///   * Android emulator -> `10.0.2.2` (the emulator's alias for the host loopback)
///   * everything else  -> `localhost`
///
/// Real devices and custom deployments can override every URL at build time:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8081/api \
///               --dart-define=KEYCLOAK_ISSUER=http://192.168.1.10:8080/realms/chess-platform
class AppConfig {
  const AppConfig._({
    required this.apiBaseUrl,
    required this.wsUrl,
    required this.keycloakIssuer,
    required this.keycloakRealm,
    required this.keycloakClientId,
    required this.features,
  });

  /// Host that resolves to the development machine (see class docs).
  static String get _defaultHost {
    try {
      return Platform.isAndroid ? '10.0.2.2' : 'localhost';
    } catch (_) {
      return 'localhost';
    }
  }

  static const String _apiOverride = String.fromEnvironment('API_BASE_URL');
  static const String _issuerOverride = String.fromEnvironment('KEYCLOAK_ISSUER');

  /// API gateway base URL.
  final String apiBaseUrl;

  /// Declared for parity with the web config; real-time uses HTTP polling.
  final String wsUrl;

  /// Keycloak realm endpoints, used for token refresh.
  final String keycloakIssuer;
  final String keycloakRealm;
  final String keycloakClientId;

  /// Feature switches, mirroring the web `features` block.
  final AppFeatures features;

  static final AppConfig instance = AppConfig._(
    apiBaseUrl: _apiOverride.isNotEmpty
        ? _apiOverride
        : 'http://$_defaultHost:8081/api',
    wsUrl: 'ws://$_defaultHost:8081/ws',
    keycloakIssuer: _issuerOverride.isNotEmpty
        ? _issuerOverride
        : 'http://$_defaultHost:8085/realms/chess-platform',
    keycloakRealm: 'chess-platform',
    keycloakClientId: 'chess-web',
    features: const AppFeatures(
      enableEngine: true,
      enablePuzzles: true,
      enableOpenings: true,
      enableLearning: true,
    ),
  );
}

class AppFeatures {
  const AppFeatures({
    required this.enableEngine,
    required this.enablePuzzles,
    required this.enableOpenings,
    required this.enableLearning,
  });

  final bool enableEngine;
  final bool enablePuzzles;
  final bool enableOpenings;
  final bool enableLearning;
}
