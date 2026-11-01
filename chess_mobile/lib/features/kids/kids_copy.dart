import '../../core/i18n/language_service.dart';
import 'generated/kids_copy_data.dart';

/// Lookup of the nested kids dictionaries generated from
/// `chess-web/src/app/features/home/kids-learn.i18n.ts`.
///
/// The web app reads these through `KIDS_UI_COPY` / `INSTRUCTOR_COPY` /
/// `KIDS_PIECE_COPY` instead of the flat `app-i18n.ts` table, so kids copy is
/// resolved here exactly the same way: dot path, English fallback, `{param}`
/// substitution.
extension KidsCopyLookup on LanguageService {
  String kids(String path, [Map<String, Object> params = const {}]) =>
      _resolve(kidsUiCopyData, code, path, params);

  /// A list-valued kids UI entry, for example `game.buddy.praise`.
  List<String> kidsList(String path) => _resolveList(kidsUiCopyData, code, path);

  String instructor(String path, [Map<String, Object> params = const {}]) =>
      _resolve(instructorCopyData, code, path, params);

  String pieceCopy(String piece, String field, [Map<String, Object> params = const {}]) =>
      _resolve(kidsPieceCopyData, code, '$piece.$field', params);

  String pieceLabel(String piece) => pieceCopy(piece, 'label');

  /// Coach voice locale, e.g. `ar-SA`.
  String get speechLang => instructorLanguagesData
      .firstWhere((item) => item['code'] == code, orElse: () => instructorLanguagesData.first)['speechLang']!;
}

String _resolve(Map<String, dynamic> source, String code, String path, Map<String, Object> params) {
  final found = _walk(source, code, path) ?? _walk(source, defaultLanguage, path);
  if (found is! String) return path;
  return _interpolate(found, params);
}

List<String> _resolveList(Map<String, dynamic> source, String code, String path) {
  final found = _walk(source, code, path) ?? _walk(source, defaultLanguage, path);
  if (found is! List) return const [];
  return found.map((entry) => entry.toString()).toList(growable: false);
}

Object? _walk(Map<String, dynamic> source, String code, String path) {
  final locale = source[code] ?? source[defaultLanguage];
  if (locale is! Map) return null;

  Object? node = locale;
  for (final segment in path.split('.')) {
    if (node is! Map || !node.containsKey(segment)) return null;
    node = node[segment];
  }
  return node;
}

/// Replaces `{name}` placeholders. One generated entry kept the JavaScript
/// template it was ported from, so its ternary is resolved here instead of
/// leaking to the screen.
String _interpolate(String template, Map<String, Object> params) {
  var text = template;
  final artifact = text.indexOf(r'${');
  if (artifact >= 0) {
    final plural = params['count'] == 1 ? '' : 's';
    text = text.replaceRange(artifact, text.length, plural);
  }
  params.forEach((name, value) {
    text = text.replaceAll('{$name}', value.toString());
  });
  return text;
}
