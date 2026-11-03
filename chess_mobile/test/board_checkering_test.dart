import 'package:flutter_test/flutter_test.dart';

import 'package:chess_mobile/ui/board/chess_board_view.dart';

void main() {
  test('board squares follow the chess checkering (white on the right)', () {
    // Every light square's neighbours are dark, and the four corners have
    // fixed colors: a1/h8 dark, h1/a8 light — "white square on the right".
    expect(squareIsLight('a1'), isFalse);
    expect(squareIsLight('h1'), isTrue);
    expect(squareIsLight('a8'), isTrue);
    expect(squareIsLight('h8'), isFalse);

    for (var file = 0; file < 8; file++) {
      for (var rank = 1; rank <= 8; rank++) {
        final square = '${'abcdefgh'[file]}$rank';
        final neighbours = [
          '${'abcdefgh'[file]}${rank + 1}',
          if (file < 7) '${'abcdefgh'[file + 1]}$rank',
        ]
            .where((s) => int.parse(s.substring(1)) <= 8)
            .toList();
        for (final n in neighbours) {
          expect(squareIsLight(n), isNot(squareIsLight(square)),
              reason: '$n and $square share a border');
        }
      }
    }
  });
}
