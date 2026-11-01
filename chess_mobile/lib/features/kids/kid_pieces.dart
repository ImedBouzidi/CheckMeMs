import 'package:flutter/material.dart';

/// Chess piece a child is introduced to. Structural data only — the wording is
/// resolved through [KidsCopyLookup.pieceCopy] so a locale switch re-renders it.
///
/// Ported from `chess-web/src/app/features/home/kids-piece.model.ts`.
class KidPiece {
  const KidPiece({
    required this.name,
    required this.image,
    required this.emoji,
    required this.tint,
    required this.moves,
    required this.captures,
  });

  /// Piece name, also the key into the kids piece copy dictionary.
  final String name;

  /// Asset stem under `assets/pieces/`, e.g. `wP`.
  final String image;

  final String emoji;
  final Color tint;

  /// `col,row` pairs on the 5x5 teaching grid that the piece can move to.
  final List<String> moves;

  /// `col,row` pairs on the 5x5 teaching grid the piece can capture on.
  final List<String> captures;

  String get asset => kidPieceAsset(image);

  bool isMoveSquare(int col, int row) =>
      !isCenterSquare(col, row) && moves.contains('$col,$row') && !captures.contains('$col,$row');

  bool isCaptureSquare(int col, int row) => captures.contains('$col,$row');
}

/// Asset path of a piece image; the mobile bundle keeps lowercase stems.
String kidPieceAsset(String image) => 'assets/pieces/${image.toLowerCase()}.svg';

const List<KidPiece> kidPieces = [
  KidPiece(
    name: 'Pawn',
    image: 'wP',
    emoji: '🐣',
    tint: Color(0xFFBBF7D0),
    moves: ['2,1', '2,0'],
    captures: ['1,1', '3,1'],
  ),
  KidPiece(
    name: 'Knight',
    image: 'wN',
    emoji: '🐴',
    tint: Color(0xFFBFDBFE),
    moves: ['0,1', '1,0', '3,0', '4,1', '0,3', '1,4', '3,4', '4,3'],
    captures: ['0,1', '4,3'],
  ),
  KidPiece(
    name: 'Bishop',
    image: 'wB',
    emoji: '🎩',
    tint: Color(0xFFDDD6FE),
    moves: ['0,0', '1,1', '3,3', '4,4', '0,4', '1,3', '3,1', '4,0'],
    captures: ['0,0', '4,4'],
  ),
  KidPiece(
    name: 'Rook',
    image: 'wR',
    emoji: '🏰',
    tint: Color(0xFFFDE68A),
    moves: ['0,2', '1,2', '3,2', '4,2', '2,0', '2,1', '2,3', '2,4'],
    captures: ['4,2', '2,0'],
  ),
  KidPiece(
    name: 'Queen',
    image: 'wQ',
    emoji: '👑',
    tint: Color(0xFFFBCFE8),
    moves: [
      '0,0', '1,1', '3,3', '4,4', '0,4', '1,3', '3,1', '4,0', //
      '0,2', '1,2', '3,2', '4,2', '2,0', '2,1', '2,3', '2,4',
    ],
    captures: ['4,4', '0,2', '2,0'],
  ),
  KidPiece(
    name: 'King',
    image: 'wK',
    emoji: '🤴',
    tint: Color(0xFFFECACA),
    moves: ['1,1', '1,2', '1,3', '2,1', '2,3', '3,1', '3,2', '3,3'],
    captures: ['1,1', '3,3'],
  ),
];

/// The teaching grid is 5x5 with the piece in the middle.
const int kidPieceGridSize = 5;

bool isCenterSquare(int col, int row) => col == 2 && row == 2;

/// Start square and the two black pawns of a "Try me" practice position, keyed
/// by piece name — the same setups the web trainer uses.
const Map<String, KidPracticeSetup> kidPracticeSetups = {
  'Pawn': KidPracticeSetup(start: 'd2', pawns: ['c3', 'e3']),
  'Knight': KidPracticeSetup(start: 'd4', pawns: ['b5', 'f5']),
  'Bishop': KidPracticeSetup(start: 'd4', pawns: ['b2', 'f6']),
  'Rook': KidPracticeSetup(start: 'd4', pawns: ['d7', 'g4']),
  'Queen': KidPracticeSetup(start: 'd4', pawns: ['d7', 'g7']),
  'King': KidPracticeSetup(start: 'd4', pawns: ['c4', 'e4']),
};

class KidPracticeSetup {
  const KidPracticeSetup({required this.start, required this.pawns});

  /// Square the practised piece is placed on.
  final String start;

  /// Squares holding the two enemy pawns the child may capture.
  final List<String> pawns;
}

/// chess.js piece letter for a trainer piece name.
String kidPieceLetter(String name) => switch (name) {
      'Pawn' => 'p',
      'Knight' => 'n',
      'Bishop' => 'b',
      'Rook' => 'r',
      'Queen' => 'q',
      'King' => 'k',
      _ => 'p',
    };
