import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_svg/flutter_svg.dart';

void main() {
  testWidgets('every board piece asset parses and draws', (tester) async {
    const pieces = ['wp', 'wr', 'wn', 'wb', 'wq', 'wk', 'bp', 'br', 'bn', 'bb', 'bq', 'bk'];

    for (final piece in pieces) {
      await tester.pumpWidget(
        MaterialApp(
          home: SvgPicture.asset('assets/pieces/$piece.svg', fit: BoxFit.contain),
        ),
      );
      // Let the async SVG loader finish parsing.
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      expect(tester.takeException(), isNull, reason: '$piece.svg threw while loading');
    }
  });
}
