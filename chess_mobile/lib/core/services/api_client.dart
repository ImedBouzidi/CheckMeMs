import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

/// Thrown for non-2xx gateway responses.
class ApiException implements Exception {
  const ApiException(this.statusCode, this.message);

  final int? statusCode;
  final String message;

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// HTTP client reproducing the web app's `auth.interceptor.ts`:
///  * adds `Authorization: Bearer <jwt>` after `ensureFreshToken(20)`,
///  * never touches auth endpoints (`/api/auth/`, `/protocol/openid-connect/`),
///  * retries once after a session refresh on 401, then gives up.
class ApiClient {
  ApiClient(this._auth, {http.Client? client}) : _client = client ?? http.Client();

  final AuthService _auth;
  final http.Client _client;

  AppConfig get _config => AppConfig.instance;

  /// `GET` against the gateway; [path] may be a full URL.
  Future<dynamic> get(String path, {Map<String, String>? headers}) =>
      _send('GET', path, headers: headers);

  /// `POST` JSON against the gateway; [path] may be a full URL.
  Future<dynamic> post(String path, {Object? body, Map<String, String>? headers}) =>
      _send('POST', path, body: body, headers: headers);

  /// `POST` form-encoded (used by the Keycloak token endpoint).
  Future<dynamic> postForm(String url, Map<String, String> fields) async {
    final response = await _client.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: fields,
    );
    return _decode(response);
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    Map<String, String>? headers,
  }) async {
    final url = path.startsWith('http') ? path : '${_config.apiBaseUrl}$path';
    final skipAuth = _auth.isAuthEndpoint(url);

    var response = await _attempt(method, url, body, headers, skipAuth);

    // A single retry after refreshing the session, like the web interceptor.
    if (response.statusCode == 401 && !skipAuth) {
      final refreshed = await _auth.refreshSession();
      if (refreshed) {
        response = await _attempt(method, url, body, headers, skipAuth);
      }
    }

    return _decode(response);
  }

  Future<http.Response> _attempt(
    String method,
    String url,
    Object? body,
    Map<String, String>? headers,
    bool skipAuth,
  ) async {
    final merged = <String, String>{'Accept': 'application/json', ...?headers};

    if (!skipAuth) {
      final token = await _auth.ensureFreshToken(20);
      if (token != null) merged['Authorization'] = 'Bearer $token';
    }

    final uri = Uri.parse(url);
    switch (method) {
      case 'GET':
        return _client.get(uri, headers: merged);
      case 'POST':
        return _client.post(
          uri,
          headers: {...merged, 'Content-Type': 'application/json'},
          body: body == null ? null : jsonEncode(body),
        );
      default:
        throw UnsupportedError('Unsupported method $method');
    }
  }

  dynamic _decode(http.Response response) {
    final text = utf8.decode(response.bodyBytes, allowMalformed: true);
    dynamic json;
    if (text.isNotEmpty) {
      try {
        json = jsonDecode(text);
      } catch (_) {
        json = null;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json ?? (text.isEmpty ? null : text);
    }

    final message = json is Map && json['message'] is String
        ? json['message'] as String
        : (text.isEmpty ? 'Request failed' : text);
    throw ApiException(response.statusCode, message);
  }
}
