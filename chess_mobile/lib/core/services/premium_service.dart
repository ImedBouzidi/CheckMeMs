import 'package:flutter/foundation.dart';

import '../models/course.dart';
import '../storage/app_storage.dart';

/// Premium features gated behind the entitlement switch.
enum PremiumFeature {
  coursePremium('course.premium'),
  lessonPremium('lesson.premium'),
  analysisDeep('analysis.deep'),
  analysisOpponent('analysis.opponent'),
  analysisSaved('analysis.saved');

  const PremiumFeature(this.wire);

  final String wire;
}

/// Frontend-only entitlement switch, mirroring
/// `chess-web/src/app/core/services/premium.service.ts`: deliberately cosmetic —
/// replace it with a backend subscription check before charging money.
class PremiumService extends ChangeNotifier {
  PremiumService() : _premium = AppStorage.instance.getBool(_storageKey) == true;

  static const String _storageKey = 'checkme.premium.enabled';

  bool _premium;

  bool get isPremium => _premium;

  bool canUse(PremiumFeature feature) => _premium;

  void setPremium(bool value) {
    _premium = value;
    AppStorage.instance.setBool(_storageKey, value);
    notifyListeners();
  }

  /// A course opens when it is free, or when the learner is premium.
  bool canOpenCourse(Course course) => course.tier == CourseTier.free || _premium;

  /// Free-tier rule:
  ///  * free lessons always open;
  ///  * the first lesson of any course opens as a teaser;
  ///  * everything else needs premium.
  bool canOpenLesson(Course course, Lesson lesson, int lessonIndex) {
    if (_premium) return true;
    if ((lesson.tier ?? course.tier) == CourseTier.free) return true;
    return lessonIndex == 0;
  }
}
