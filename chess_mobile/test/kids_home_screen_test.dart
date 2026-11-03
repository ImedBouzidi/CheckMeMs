import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:chess_mobile/core/i18n/language_service.dart';
import 'package:chess_mobile/core/storage/app_storage.dart';
import 'package:chess_mobile/features/home/kids_home_screen.dart';
import 'package:chess_mobile/features/kids/kids_copy.dart';
import 'package:chess_mobile/routing/app_router.dart';

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

  Widget host({Key? key}) {
    final router = GoRouter(
      initialLocation: AppRoutes.kids,
      routes: [
        GoRoute(path: AppRoutes.kids, builder: (context, state) => const KidsHomeScreen()),
        GoRoute(path: AppRoutes.kidsPlay, builder: (context, state) => const SizedBox.shrink()),
        GoRoute(path: AppRoutes.kidsLearn, builder: (context, state) => const SizedBox.shrink()),
        GoRoute(path: AppRoutes.home, builder: (context, state) => const SizedBox.shrink()),
      ],
    );

    return MultiProvider(
      providers: [ChangeNotifierProvider<LanguageService>.value(value: language)],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  Future<void> settle(WidgetTester tester, int frames) async {
    for (var i = 0; i < frames; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
  }

  testWidgets('lays out on phone, laptop and desktop widths', (tester) async {
    for (final size in const <Size>[Size(420, 900), Size(895, 853), Size(1300, 900)]) {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      await tester.pumpWidget(host(key: ValueKey(size)));
      await settle(tester, 3);

      expect(find.text(language.kids('home.heroLine1')), findsOneWidget, reason: '$size');
      expect(find.text(language.kids('common.grownUps')), findsWidgets, reason: '$size');
      expect(tester.takeException(), isNull, reason: '$size');
    }
    addTearDown(tester.view.reset);
  });

  testWidgets('the header routes to play, learn and the grown-up home', (tester) async {
    tester.view.physicalSize = const Size(1300, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(host());
    await settle(tester, 3);

    await tester.tap(find.text(language.kids('common.learn')).first);
    await settle(tester, 2);
    expect(tester.takeException(), isNull);
  });
}
