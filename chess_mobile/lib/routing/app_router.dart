import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/services/auth_service.dart';
import '../features/analysis/analysis_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/game/game_local_screen.dart';
import '../features/game/game_vs_bot_screen.dart';
import '../features/home/home_screen.dart';
import '../features/home/kids_home_screen.dart';
import '../features/kids/kids_learn_screen.dart';
import '../features/kids/kids_play_screen.dart';
import '../features/learn/learn_screen.dart';
import '../features/learn/lesson_player_screen.dart';
import '../features/openings/openings_screen.dart';
import '../features/play/play_screen.dart';
import '../features/puzzles/puzzles_screen.dart';
import '../ui/layout/shell_screen.dart';

/// Route path helpers shared by the whole app.
class AppRoutes {
  AppRoutes._();

  static const String home = '/';
  static const String dashboard = '/dashboard';
  static const String play = '/play';
  static const String puzzles = '/puzzles';
  static const String openings = '/openings';
  static const String learn = '/learn';
  static const String analysis = '/analysis';
  static const String gameBot = '/game/bot';
  static const String gameLocal = '/game/local';
  static const String kids = '/kids';
  static const String kidsPlay = '/kids/play';
  static const String kidsLearn = '/kids/learn';

  static String lesson(String courseId, String lessonId) => '/learn/$courseId/$lessonId';

  static String login({String? returnTo}) =>
      returnTo == null ? '/auth/login' : '/auth/login?returnUrl=${Uri.encodeComponent(returnTo)}';

  static String register({String? returnTo}) =>
      returnTo == null ? '/auth/register' : '/auth/register?returnUrl=${Uri.encodeComponent(returnTo)}';

  /// Reads the `returnUrl` query parameter of an auth route.
  static String? returnToOf(GoRouterState state) {
    final raw = state.uri.queryParameters['returnUrl'];
    if (raw == null || raw.isEmpty) return null;
    return Uri.decodeComponent(raw);
  }
}

/// Route table, mirroring `chess-web/src/app/app.routes.ts`:
///
///  * `/auth/login`, `/auth/register`
///  * `/kids`, `/kids/play`, `/kids/learn` (outside the shell, full-screen)
///  * shell children: home, dashboard (auth-guarded), play, puzzles, openings,
///    learn, learn/:courseId/:lessonId, analysis, game/bot, game/local
GoRouter createAppRouter(AuthService auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final loggedIn = auth.isAuthenticated;
      final location = state.matchedLocation;

      // The dashboard is the only guarded route, like the web app.
      if (location == '/dashboard' && !loggedIn) {
        final returnTo = Uri.encodeComponent(state.uri.toString());
        return '/auth/login?returnUrl=$returnTo';
      }

      // Signed-in users never see the auth screens.
      if (location.startsWith('/auth') && loggedIn) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => LoginScreen(returnTo: AppRoutes.returnToOf(state)),
      ),
      GoRoute(
        path: '/auth/register',
        builder: (context, state) => RegisterScreen(returnTo: AppRoutes.returnToOf(state)),
      ),
      GoRoute(path: '/kids', builder: (context, state) => const KidsHomeScreen()),
      GoRoute(path: '/kids/play', builder: (context, state) => const KidsPlayScreen()),
      GoRoute(path: '/kids/learn', builder: (context, state) => const KidsLearnScreen()),
      ShellRoute(
        builder: (context, state, child) => ShellScreen(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
          GoRoute(path: '/play', builder: (context, state) => const PlayScreen()),
          GoRoute(path: '/puzzles', builder: (context, state) => const PuzzlesScreen()),
          GoRoute(path: '/openings', builder: (context, state) => const OpeningsScreen()),
          GoRoute(path: '/learn', builder: (context, state) => const LearnScreen()),
          GoRoute(
            path: '/learn/:courseId/:lessonId',
            builder: (context, state) => LessonPlayerScreen(
              courseId: state.pathParameters['courseId'] ?? '',
              lessonId: state.pathParameters['lessonId'] ?? '',
            ),
          ),
          GoRoute(path: '/analysis', builder: (context, state) => const AnalysisScreen()),
          GoRoute(path: '/game/bot', builder: (context, state) => const GameVsBotScreen()),
          GoRoute(path: '/game/local', builder: (context, state) => const GameLocalScreen()),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.uri}')),
    ),
  );
}

/// True when [location] is active for drawer highlighting.
bool isLocationActive(String current, String location) {
  if (location == '/') return current == '/';
  return current == location || current.startsWith('$location/');
}

/// Convenience accessors.
T read<T extends Object>(BuildContext context) => context.read<T>();
T watch<T extends Object>(BuildContext context) => context.watch<T>();
