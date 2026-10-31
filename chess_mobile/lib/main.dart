import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/i18n/language_service.dart';
import 'core/services/auth_service.dart';
import 'core/services/course_service.dart';
import 'core/services/game_history_service.dart';
import 'core/services/learning_progress_service.dart';
import 'core/services/move_analysis_api_service.dart';
import 'core/services/premium_service.dart';
import 'core/services/puzzle_progress_service.dart';
import 'core/services/sound_service.dart';
import 'core/services/stockfish_engine_service.dart';
import 'core/services/storage_scope_service.dart';
import 'core/services/theme_service.dart';
import 'core/storage/app_storage.dart';
import 'core/theme/app_theme.dart';
import 'routing/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppStorage.instance.init();

  // Services mirror the web app's root-provided singletons.
  final authService = AuthService();
  final storageScope = StorageScopeService(authService);
  final languageService = LanguageService();
  final themeService = ThemeService();

  final router = createAppRouter(authService);
  authService.onSessionCleared = () => router.go('/auth/login');

  runApp(
    CheckMeApp(
      authService: authService,
      storageScope: storageScope,
      languageService: languageService,
      themeService: themeService,
      router: router,
    ),
  );
}

class CheckMeApp extends StatefulWidget {
  const CheckMeApp({
    super.key,
    required this.authService,
    required this.storageScope,
    required this.languageService,
    required this.themeService,
    required this.router,
  });

  final AuthService authService;
  final StorageScopeService storageScope;
  final LanguageService languageService;
  final ThemeService themeService;
  final GoRouter router;

  @override
  State<CheckMeApp> createState() => _CheckMeAppState();
}

class _CheckMeAppState extends State<CheckMeApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.themeService.followSystemBrightness(WidgetsBinding.instance.platformDispatcher.platformBrightness);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangePlatformBrightness() {
    widget.themeService
        .followSystemBrightness(WidgetsBinding.instance.platformDispatcher.platformBrightness);
  }

  @override
  Widget build(BuildContext context) {
    final language = widget.languageService;
    final theme = widget.themeService;

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthService>.value(value: widget.authService),
        ChangeNotifierProvider<StorageScopeService>.value(value: widget.storageScope),
        ChangeNotifierProvider<LanguageService>.value(value: language),
        ChangeNotifierProvider<ThemeService>.value(value: theme),
        ChangeNotifierProvider<GameHistoryService>(
          create: (_) => GameHistoryService(widget.authService, widget.storageScope),
        ),
        Provider<MoveAnalysisApiService>(
          create: (_) => MoveAnalysisApiService(widget.authService),
        ),
        ChangeNotifierProvider<CourseService>(
          create: (_) => CourseService(language),
        ),
        ChangeNotifierProvider<LearningProgressService>(
          create: (_) => LearningProgressService(widget.storageScope),
        ),
        ChangeNotifierProvider<PuzzleProgressService>(
          create: (_) => PuzzleProgressService(widget.storageScope),
        ),
        ChangeNotifierProvider<PremiumService>(create: (_) => PremiumService()),
        ChangeNotifierProvider<StockfishEngineService>(
          create: (_) => StockfishEngineService(),
        ),
        ChangeNotifierProvider<SoundService>(create: (_) => SoundService()),
      ],
      child: ListenableBuilder(
        listenable: Listenable.merge([language, theme]),
        builder: (context, _) {
          return MaterialApp.router(
            title: 'CheckMe',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            themeMode: theme.isDark ? ThemeMode.dark : ThemeMode.light,
            locale: Locale(language.code),
            supportedLocales: const [
              Locale('en'),
              Locale('ar'),
              Locale('fr'),
              Locale('es'),
            ],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            routerConfig: widget.router,
            builder: (context, child) => Directionality(
              textDirection: language.isRtl ? TextDirection.rtl : TextDirection.ltr,
              child: child ?? const SizedBox.shrink(),
            ),
          );
        },
      ),
    );
  }
}
