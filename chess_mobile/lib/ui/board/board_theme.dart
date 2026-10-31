import 'package:flutter/material.dart';

/// Board color themes, matching the selectable in-game styles of the web app
/// (cm-chessboard styles `green`, `chess-club`, `blue`, `chessboard-js`,
/// `default-contrast`).
class BoardTheme {
  const BoardTheme({
    required this.id,
    required this.labelKey,
    required this.light,
    required this.dark,
  });

  final String id;

  /// Translation key of the theme name (board theme menu).
  final String labelKey;
  final Color light;
  final Color dark;
}

const List<BoardTheme> boardThemes = [
  BoardTheme(id: 'green', labelKey: 'bot.boardTheme.green', light: Color(0xFFEEeed2), dark: Color(0xFF769656)),
  BoardTheme(id: 'chess-club', labelKey: 'bot.boardTheme.chessClub', light: Color(0xFFEFE7D6), dark: Color(0xFF9A7B4F)),
  BoardTheme(id: 'blue', labelKey: 'bot.boardTheme.blue', light: Color(0xFFDEE3E6), dark: Color(0xFF8CA2AD)),
  BoardTheme(id: 'chessboard-js', labelKey: 'bot.boardTheme.brown', light: Color(0xFFF0D9B5), dark: Color(0xFFB58863)),
  BoardTheme(id: 'default-contrast', labelKey: 'bot.boardTheme.contrast', light: Color(0xFFD5D5D5), dark: Color(0xFF585858)),
];

BoardTheme boardThemeById(String id) =>
    boardThemes.firstWhere((theme) => theme.id == id, orElse: () => boardThemes.first);

/// Marker colors, mirroring the recolored cm-chessboard markers of the web app.
const Color kSelectedSquareColor = Color(0xFFF6E05E); // yellow
const Color kLastMoveColor = Color(0xFFCDD26A); // olive
const Color kCheckColor = Color(0xFFE53E3E); // red
const Color kHintArrowColor = Color(0xFF2563EB); // primary blue
const Color kTargetDotColor = Color(0xAA122033);
