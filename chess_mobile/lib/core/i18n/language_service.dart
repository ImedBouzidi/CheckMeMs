import 'package:flutter/foundation.dart';

import '../storage/app_storage.dart';
import 'generated/app_translations.dart';

/// Supported app language, mirroring `AppLanguage` in app-i18n.ts.
class AppLanguage {
  const AppLanguage({
    required this.code,
    required this.name,
    required this.dir,
    required this.speechLang,
  });

  final String code;
  final String name;

  /// `ltr` or `rtl`.
  final String dir;
  final String speechLang;

  bool get isRtl => dir == 'rtl';

  factory AppLanguage.fromMap(Map<String, String> map) => AppLanguage(
        code: map['code'] ?? 'en',
        name: map['name'] ?? 'English',
        dir: map['dir'] ?? 'ltr',
        speechLang: map['speechLang'] ?? 'en-US',
      );
}

const String defaultLanguage = 'en';

bool isAppLanguageCode(String? value) => value == 'en' || value == 'ar' || value == 'fr' || value == 'es';

String languageDirection(String code) => code == 'ar' ? 'rtl' : 'ltr';

/// Application language + translation lookup, mirroring
/// `chess-web/src/app/core/i18n/language.service.ts`.
///
/// The dictionary is generated from the web app's `app-i18n.ts`, so every key
/// and locale is identical to the web product.
class LanguageService extends ChangeNotifier {
  LanguageService() {
    _code = _readStoredLanguage();
  }

  static const String _storageKey = 'checkme-language';
  static const String _legacyStorageKey = 'kids-instructor-language';

  late String _code;

  /// Languages in menu order (English, العربية, Français, Español).
  final List<AppLanguage> languages =
      appLanguagesData.map(AppLanguage.fromMap).toList(growable: false);

  String get code => _code;

  AppLanguage get activeLanguage =>
      languages.firstWhere((item) => item.code == _code, orElse: () => languages.first);

  bool get isRtl => languageDirection(_code) == 'rtl';

  /// `TextDirection` value consumed by the app's Directionality widget.
  bool get textDirectionRtl => isRtl;

  String t(String key, [Map<String, Object> params = const {}]) {
    final dictionary = appTranslations[_code] ?? appTranslations[defaultLanguage] ?? const {};
    var template = dictionary[key] ?? appTranslations[defaultLanguage]?[key] ?? key;

    if (params.isEmpty) return template;

    params.forEach((name, value) {
      template = template.replaceAll('{$name}', value.toString());
    });
    return template;
  }

  bool setLanguage(String code) {
    if (!isAppLanguageCode(code)) return false;
    _code = code;
    AppStorage.instance.setString(_storageKey, code);
    AppStorage.instance.setString(_legacyStorageKey, code);
    notifyListeners();
    return true;
  }

  static String _readStoredLanguage() {
    final stored = AppStorage.instance.getString(_storageKey);
    if (isAppLanguageCode(stored)) return stored!;

    // Legacy key written by the kids-mode language switcher.
    final legacy = AppStorage.instance.getString(_legacyStorageKey);
    if (isAppLanguageCode(legacy)) return legacy!;

    return defaultLanguage;
  }
}
