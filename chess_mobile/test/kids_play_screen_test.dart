import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'package:chess_mobile/core/i18n/language_service.dart';
import 'package:chess_mobile/core/services/sound_service.dart';
import 'package:chess_mobile/core/services/stockfish_engine_service.dart';
import 'package:chess_mobile/core/storage/app_storage.dart';
import 'package:chess_mobile/features/kids/kids_copy.dart';
import 'package:chess_mobile/features/kids/kids_play_screen.dart';
import 'package:chess_mobile/routing/app_router.dart';
import 'package:chess_mobile/ui/board/chess_board_view.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The buddy falls back to its own move picker when the engine cannot start,
/// which is exactly what happens in a headless test.
class _EnginelessStockfish extends StockfishEngineService {
  @override
  Future<void> init() async {
    throw StateError('no engine in widget tests');
  }
}

const String startPosition =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channels = ['xyz.luan/audioplayers', 'xyz.luan/audioplayers.global'];

  late LanguageService language;

  setUp(() async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    await AppStorage.instance.init();
    language = LanguageService();
    for (final name in channels) {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(MethodChannel(name), (call) async => null);
    }
  });

  tearDown(() {
    for (final name in channels) {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(MethodChannel(name), null);
    }
  });

  Widget host() {
    final router = GoRouter(
      initialLocation: AppRoutes.kidsPlay,
      routes: [
        GoRoute(path: AppRoutes.kidsPlay, builder: (context, state) => const KidsPlayScreen()),
        GoRoute(path: AppRoutes.kids, builder: (context, state) => const SizedBox.shrink()),
      ],
    );

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<LanguageService>.value(value: language),
        ChangeNotifierProvider<SoundService>(create: (_) => SoundService()..setMuted(true)),
        ChangeNotifierProvider<StockfishEngineService>(
          create: (_) => _EnginelessStockfish(),
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  Future<void> pump(WidgetTester tester, Duration duration) => tester.pump(duration);

  Future<void> tapSquare(WidgetTester tester, String square, {bool whiteAtBottom = true}) async {
    final rect = tester.getRect(find.byType(ChessBoardView));
    final side = rect.width / 8;
    final file = 'abcdefgh'.indexOf(square[0]);
    final rank = int.parse(square[1]);
    final col = whiteAtBottom ? file : 7 - file;
    final row = whiteAtBottom ? 8 - rank : rank - 1;
    await tester.tapAt(Offset(rect.left + (col + 0.5) * side, rect.top + (row + 0.5) * side));
    await tester.pump();
  }

  /// The buddy thinks for 700-1500 ms, then replies.
  Future<void> waitForBuddy(WidgetTester tester) async {
    await pump(tester, const Duration(milliseconds: 1600));
    await pump(tester, Duration.zero);
  }

  Future<void> settle(WidgetTester tester, int frames) async {
    for (var i = 0; i < frames; i++) {
      await pump(tester, const Duration(milliseconds: 100));
    }
  }

  testWidgets('greets the child and offers colour, level and tips', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);

    expect(find.textContaining('Chess Buddy'), findsWidgets);
    expect(find.text(language.kids('game.buddy.welcome')), findsOneWidget);
    expect(find.text(language.kids('game.white')), findsWidgets);
    expect(find.text(language.kids('game.levelEasy')), findsOneWidget);
    expect(find.text(language.kids('game.noTimer')), findsOneWidget);
    expect(find.text(language.kids('game.tipsTitle')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tap-to-move plays the pawn and the buddy answers', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);

    await tapSquare(tester, 'e2');
    expect(find.byType(ChessBoardView), findsOneWidget);

    await tapSquare(tester, 'e4');
    await pump(tester, Duration.zero);
    await waitForBuddy(tester);
    await settle(tester, 2);

    final board = tester.widget<ChessBoardView>(find.byType(ChessBoardView));
    expect(board.fen.contains('PPPP1PPP'), isTrue); // the e-pawn left e2.
    expect(board.fen.split(' ').elementAt(1), 'w'); // the buddy has answered.
    expect(find.text(language.kids('game.yourTurn')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('undo takes the buddy reply and the player move back', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);

    await tapSquare(tester, 'd2');
    await tapSquare(tester, 'd4');
    await waitForBuddy(tester);
    await settle(tester, 2);

    final played = tester.widget<ChessBoardView>(find.byType(ChessBoardView));
    expect(played.fen, isNot(startPosition));

    await tester.tap(find.text(language.kids('game.undo')));
    await pump(tester, Duration.zero);
    await settle(tester, 3);

    final undone = tester.widget<ChessBoardView>(find.byType(ChessBoardView));
    expect(undone.fen, startPosition);
    expect(find.text(language.kids('game.buddy.undo')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('playing as black lets the buddy open', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);

    await tester.tap(find.text(language.kids('game.black')));
    await pump(tester, Duration.zero);
    await waitForBuddy(tester);
    await settle(tester, 3);

    // The board is flipped and the buddy, playing White, has already opened.
    final board = tester.widget<ChessBoardView>(find.byType(ChessBoardView));
    expect(board.orientationWhite, isFalse);
    expect(board.fen, isNot(startPosition));
    expect(board.fen.split(' ').elementAt(1), 'b');
    expect(tester.takeException(), isNull);
  });

  testWidgets('hint points at one of the player moves', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);

    await tester.tap(find.text(language.kids('game.hint')));
    await pump(tester, Duration.zero);

    final board = tester.widget<ChessBoardView>(find.byType(ChessBoardView));
    expect(board.arrows, hasLength(1));
    expect(find.text(language.kids('game.buddy.hint')), findsOneWidget);

    await pump(tester, const Duration(milliseconds: 3600));
    expect(tester.widget<ChessBoardView>(find.byType(ChessBoardView)).arrows, isEmpty);
    expect(tester.takeException(), isNull);
  });
}
