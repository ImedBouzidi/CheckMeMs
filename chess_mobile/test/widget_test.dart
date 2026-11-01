import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:chess_mobile/core/i18n/language_service.dart';
import 'package:chess_mobile/core/services/auth_service.dart';
import 'package:chess_mobile/core/services/storage_scope_service.dart';
import 'package:chess_mobile/core/services/theme_service.dart';
import 'package:chess_mobile/core/storage/app_storage.dart';
import 'package:chess_mobile/main.dart';
import 'package:chess_mobile/routing/app_router.dart';

void main() {
  testWidgets('CheckMe app boots to the home shell', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    await AppStorage.instance.init();

    final authService = AuthService();
    final storageScope = StorageScopeService(authService);
    final languageService = LanguageService();
    final themeService = ThemeService();
    final router = createAppRouter(authService);
    authService.onSessionCleared = () => router.go('/auth/login');

    await tester.pumpWidget(
      CheckMeApp(
        authService: authService,
        storageScope: storageScope,
        languageService: languageService,
        themeService: themeService,
        router: router,
      ),
    );
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.byType(CheckMeApp), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
