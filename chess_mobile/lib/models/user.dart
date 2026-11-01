// lib/models/user.dart
// User model mirroring the web app's User interface.

class User {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String username;
  final String? provider;
  final String? avatar;

  User({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    required this.username,
    this.provider,
    this.avatar,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        email: json['email'] as String,
        firstName: json['firstName'] as String?,
        lastName: json['lastName'] as String?,
        username: json['username'] as String,
        provider: json['provider'] as String?,
        avatar: json['avatar'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        if (firstName != null) 'firstName': firstName,
        if (lastName != null) 'lastName': lastName,
        'username': username,
        if (provider != null) 'provider': provider,
        if (avatar != null) 'avatar': avatar,
      };
}
