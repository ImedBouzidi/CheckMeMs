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

/// Default board palette. Kept as a top-level const so it can be used as a
/// default parameter value (indexing a const list is not a const expression).
const BoardTheme kGreenBoardTheme =
    BoardTheme(id: 'green', labelKey: 'bot.boardTheme.green', light: Color(0xFFEEeed2), dark: Color(0xFF769656));

const BoardTheme kDefaultBoardTheme = kGreenBoardTheme;

const List<BoardTheme> boardThemes = [
  kGreenBoardTheme,
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

/// Kids board: the cream/violet "kids" cm-chessboard style of the web app.
const BoardTheme kKidsBoardTheme =
    BoardTheme(id: 'kids', labelKey: 'kids.boardTheme', light: Color(0xFFFFF7CC), dark: Color(0xFFC4B5FD));

/// Board border, coach frame, legal-move pulse and learn markers of kids mode.
const Color kKidsBorderColor = Color(0xFFA78BFA);
const Color kKidsFrameColor = Color(0xFFFBBF24);
const Color kKidsPulseColor = Color(0xFFEC4899);
const Color kKidsLearnMoveColor = Color(0xFF22C55E);
const Color kKidsLearnCaptureColor = Color(0xFFEC4899);
const Color kKidsArrowColor = Color(0xFFF97316);
