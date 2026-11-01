import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:chess_mobile/core/i18n/language_service.dart';
import 'package:chess_mobile/core/services/sound_service.dart';
import 'package:chess_mobile/core/storage/app_storage.dart';
import 'package:chess_mobile/features/kids/kids_copy.dart';
import 'package:chess_mobile/features/kids/kids_learn_screen.dart';
import 'package:chess_mobile/routing/app_router.dart';
import 'package:chess_mobile/ui/board/chess_board_view.dart';

const String emptyBoard = '8/8/8/8/8/8/8/8 w - - 0 1';
const String knightSetup = '8/8/8/1p3p2/3N4/8/8/8 w - - 0 1';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late LanguageService language;

  setUp(() async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    await AppStorage.instance.init();
    language = LanguageService();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(MethodChannel('xyz.luan/audioplayers'), (call) async => null);
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(MethodChannel('xyz.luan/audioplayers'), null);
  });

  Widget host() {
    final router = GoRouter(
      initialLocation: AppRoutes.kidsLearn,
      routes: [
        GoRoute(path: AppRoutes.kidsLearn, builder: (context, state) => const KidsLearnScreen()),
        GoRoute(path: AppRoutes.kids, builder: (context, state) => const SizedBox.shrink()),
        GoRoute(path: AppRoutes.home, builder: (context, state) => const SizedBox.shrink()),
      ],
    );

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<LanguageService>.value(value: language),
        ChangeNotifierProvider<SoundService>(create: (_) => SoundService()..setMuted(true)),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  Future<void> settle(WidgetTester tester, int frames) async {
    for (var i = 0; i < frames; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
  }

  Future<void> tapSquare(WidgetTester tester, String square) async {
    final rect = tester.getRect(find.byType(ChessBoardView));
    final side = rect.width / 8;
    final file = 'abcdefgh'.indexOf(square[0]);
    final rank = int.parse(square[1]);
    await tester.tapAt(Offset(rect.left + (file + 0.5) * side, rect.top + (8 - rank + 0.5) * side));
    await tester.pump();
  }

  ChessBoardView board(WidgetTester tester) =>
      tester.widget<ChessBoardView>(find.byType(ChessBoardView));

  /// Opens the piece popup for [pieceLabel] and presses "Try me!".
  Future<void> tryPiece(WidgetTester tester, String pieceLabel) async {
    await tester.tap(find.text(pieceLabel).last);
    await tester.pump();
    await settle(tester, 2);
    await tester.tap(find.text(language.kids('popup.tryMe')));
    await tester.pump();
    await settle(tester, 4);
  }

  testWidgets('greets the child and lists every piece', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);

    expect(find.text(language.instructor('welcome')), findsOneWidget);
    expect(find.text(language.instructor('coachName').toUpperCase()), findsOneWidget);
    expect(find.text(language.kids('learn.allPieces')), findsOneWidget);
    expect(find.text(language.kids('learn.emptyPick')), findsOneWidget);
    expect(find.text(language.kids('learn.footer')), findsOneWidget);
    expect(board(tester).fen, emptyBoard);
    expect(board(tester).interactive, isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Try me puts the knight on its practice squares', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);

    await tryPiece(tester, language.pieceLabel('Knight'));

    expect(board(tester).fen, knightSetup);
    expect(board(tester).interactive, isTrue);
    expect(board(tester).selectedSquare, 'd4');
    expect(board(tester).legalTargets, hasLength(8));
    expect(board(tester).arrows, hasLength(1));
    expect(
      find.text(language.kids('learn.practicing', {'piece': language.pieceLabel('Knight')})),
      findsOneWidget,
    );
    expect(
      find.text(language.instructor('practiceIntro', {'piece': language.pieceCopy('Knight', 'sentenceName')})),
      findsOneWidget,
    );
    expect(find.text('8 possible squares'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('capturing a pawn earns praise and the turn stays white', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);
    await tryPiece(tester, language.pieceLabel('Knight'));

    await tapSquare(tester, 'd4');
    await tapSquare(tester, 'b5');
    await settle(tester, 6);

    final played = board(tester);
    expect(played.fen, '8/8/8/1N3p2/8/8/8/8 w - - 0 1');
    expect(played.fen.split(' ').elementAt(1), 'w');
    expect(played.selectedSquare, 'b5');
    expect(find.text(language.instructor('goodCaptureMessage')), findsOneWidget);
    expect(find.text(language.instructor('goodCaptureHint')), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 2900));
    expect(find.text(language.instructor('goodCaptureMessage')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('touching another piece says wrong piece', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);
    await tryPiece(tester, language.pieceLabel('Knight'));

    await tapSquare(tester, 'f5');
    await settle(tester, 2);

    // The web writes the same line into the coach bubble (`hint`) and the
    // feedback banner, so both are on screen together.
    expect(
      find.text(language.instructor('wrongPieceMessage',
          {'piece': language.pieceCopy('Knight', 'sentenceName')})),
      findsNWidgets(2),
    );
    expect(find.text(language.instructor('wrongPieceTitle')), findsOneWidget);
    expect(board(tester).fen, knightSetup);
    expect(tester.takeException(), isNull);
  });

  testWidgets('an illegal square says wrong move', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);
    await tryPiece(tester, language.pieceLabel('Knight'));

    await tapSquare(tester, 'd4');
    await tapSquare(tester, 'd6');
    await settle(tester, 2);

    expect(find.text(language.instructor('wrongMoveShort')), findsOneWidget);
    expect(find.text(language.instructor('tryGlowing')), findsOneWidget);
    expect(board(tester).fen, knightSetup);
    expect(tester.takeException(), isNull);
  });

  testWidgets('clear board empties the trainer', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);
    await tryPiece(tester, language.pieceLabel('Knight'));
    expect(board(tester).fen, isNot(emptyBoard));

    await tester.tap(find.text(language.kids('learn.clear')).first);
    await settle(tester, 2);

    expect(board(tester).fen, emptyBoard);
    expect(board(tester).legalTargets, isEmpty);
    expect(board(tester).arrows, isEmpty);
    expect(find.text(language.instructor('emptyBoard')), findsOneWidget);
    expect(find.text(language.kids('learn.emptyPick')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('switching language re-reads the instructor', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);
    await tryPiece(tester, language.pieceLabel('Knight'));

    await tester.tap(find.text(language.kids('learn.clearBoard')));
    await settle(tester, 2);

    await tester.tap(find.text('🌍').last);
    // The menu itself animates for 300 ms; tapping mid-flight hits the barrier.
    await settle(tester, 5);
    await tester.tap(find.text('Español').last);
    await settle(tester, 3);

    expect(language.code, 'es');
    expect(find.text(language.instructor('emptyBoard')), findsOneWidget);
    expect(find.text(language.kids('learn.clearBoard')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
