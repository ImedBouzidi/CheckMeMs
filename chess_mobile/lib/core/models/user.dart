/// The signed-in account, mirroring `chess-web/src/app/core/models/user.model.ts`.
class User {
  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.username,
    this.avatar,
    this.provider,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String? ?? '',
        email: json['email'] as String? ?? '',
        firstName: json['firstName'] as String? ?? '',
        lastName: json['lastName'] as String? ?? '',
        username: json['username'] as String? ?? '',
        avatar: json['avatar'] as String?,
        provider: json['provider'] as String?,
      );

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String username;
  final String? avatar;
  final String? provider;

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'username': username,
        if (avatar != null) 'avatar': avatar,
        if (provider != null) 'provider': provider,
      };

  /// Display name: full name when known, otherwise the username.
  String get displayName =>
      firstName.isNotEmpty && lastName.isNotEmpty ? '$firstName $lastName' : username;

  /// Up to two initials for the avatar chip.
  String get initials {
    if (firstName.isNotEmpty && lastName.isNotEmpty) {
      return '${firstName[0]}${lastName[0]}'.toUpperCase();
    }
    final handle = username.isNotEmpty ? username : email;
    return handle.isEmpty ? '?' : handle[0].toUpperCase();
  }
}

/// Credentials for `POST /api/auth/login`.
class LoginCredentials {
  const LoginCredentials({required this.email, required this.password});

  final String email;
  final String password;

  Map<String, dynamic> toJson() => {'email': email, 'password': password};
}

/// Payload for `POST /api/auth/register`.
class RegisterData {
  const RegisterData({
    required this.firstName,
    required this.lastName,
    required this.username,
    required this.email,
    required this.password,
  });

  final String firstName;
  final String lastName;
  final String username;
  final String email;
  final String password;

  Map<String, dynamic> toJson() => {
        'firstName': firstName,
        'lastName': lastName,
        'username': username,
        'email': email,
        'password': password,
      };
}
