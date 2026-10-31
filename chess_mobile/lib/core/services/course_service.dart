import 'package:flutter/foundation.dart';

import '../data/generated/courses_content.dart';
import '../data/generated/courses_seed.dart';
import '../i18n/language_service.dart';
import '../models/course.dart';

/// A lesson positioned inside its course (course, module, lesson and indexes).
class LessonRef {
  const LessonRef({
    required this.course,
    required this.module,
    required this.lesson,
    required this.index,
    required this.moduleIndex,
    required this.lessonIndex,
  });

  final Course course;
  final CourseModule module;
  final Lesson lesson;

  /// Position of the lesson across the whole course.
  final int index;
  final int moduleIndex;
  final int lessonIndex;
}

/// Course catalog + localization, mirroring
/// `chess-web/src/app/core/services/course.service.ts` and `courses.i18n.ts`:
/// structural data (FEN, solutions, arrows…) stays in the seed, translated copy
/// is overlaid per language.
class CourseService extends ChangeNotifier {
  CourseService(this._language) {
    _rebuild();
    _language.addListener(_rebuild);
  }

  final LanguageService _language;
  late List<Course> _courses;

  void _rebuild() {
    _courses = localizeCourses(coursesSeedData, _language.code);
    notifyListeners();
  }

  @override
  void dispose() {
    _language.removeListener(_rebuild);
    super.dispose();
  }

  List<Course> get courses => _courses;

  Course? getCourse(String courseId) {
    for (final course in _courses) {
      if (course.id == courseId) return course;
    }
    return null;
  }

  List<LessonRef> lessonRefs(Course course) {
    final refs = <LessonRef>[];
    var index = 0;

    for (var moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex++) {
      final module = course.modules[moduleIndex];
      for (var lessonIndex = 0; lessonIndex < module.lessons.length; lessonIndex++) {
        refs.add(LessonRef(
          course: course,
          module: module,
          lesson: module.lessons[lessonIndex],
          index: index,
          moduleIndex: moduleIndex,
          lessonIndex: lessonIndex,
        ));
        index += 1;
      }
    }

    return refs;
  }

  LessonRef? getLessonRef(String courseId, String lessonId) {
    final course = getCourse(courseId);
    if (course == null) return null;
    for (final ref in lessonRefs(course)) {
      if (ref.lesson.id == lessonId) return ref;
    }
    return null;
  }

  LessonRef? nextLesson(String courseId, String lessonId) {
    final course = getCourse(courseId);
    if (course == null) return null;
    final refs = lessonRefs(course);
    final current = refs.indexWhere((ref) => ref.lesson.id == lessonId);
    if (current < 0 || current + 1 >= refs.length) return null;
    return refs[current + 1];
  }

  int lessonCount(Course course) => lessonRefs(course).length;

  int totalMinutes(Course course) => lessonRefs(course)
      .fold(0, (total, ref) => total + (ref.lesson.estimatedMinutes ?? 5));
}

/* ------------------------- localization (courses.i18n.ts) ------------------------- */

List<Course> localizeCourses(List<Map<String, dynamic>> seed, String language) {
  final courses = seed.map(courseFromSeed).toList(growable: false);
  if (language == 'en') return courses;

  final catalog = courseContentData[language];
  if (catalog == null) return courses;

  return courses
      .map((course) => localizeCourse(course, catalog[course.id] as Map<String, dynamic>?))
      .toList(growable: false);
}

Course localizeCourse(Course course, Map<String, dynamic>? content) {
  if (content == null) return course;

  final modules = content['modules'] as Map<String, dynamic>?;
  return Course(
    id: course.id,
    title: content['title'] as String? ?? course.title,
    summary: content['summary'] as String? ?? course.summary,
    level: course.level,
    tier: course.tier,
    icon: course.icon,
    accent: course.accent,
    modules: course.modules
        .map((module) {
          final moduleContent = modules?[module.id] as Map<String, dynamic>?;
          if (moduleContent == null) return module;
          final lessons = moduleContent['lessons'] as Map<String, dynamic>?;
          return CourseModule(
            id: module.id,
            title: moduleContent['title'] as String? ?? module.title,
            summary: moduleContent['summary'] as String? ?? module.summary,
            lessons: module.lessons
                .map((lesson) =>
                    localizeLesson(lesson, lessons?[lesson.id] as Map<String, dynamic>?))
                .toList(),
          );
        })
        .toList(),
  );
}

Lesson localizeLesson(Lesson lesson, Map<String, dynamic>? content) {
  if (content == null) return lesson;

  final steps = content['steps'];
  final localizedSteps = steps is List && steps.isNotEmpty
      ? List.generate(
          lesson.steps.length,
          (index) => localizeStep(
            lesson.steps[index],
            index < steps.length && steps[index] is Map
                ? steps[index] as Map<String, dynamic>
                : null,
          ),
          growable: false,
        )
      : lesson.steps;

  return Lesson(
    id: lesson.id,
    title: content['title'] as String? ?? lesson.title,
    summary: content['summary'] as String? ?? lesson.summary,
    estimatedMinutes: lesson.estimatedMinutes,
    tier: lesson.tier,
    steps: localizedSteps,
  );
}

LessonStep localizeStep(LessonStep step, Map<String, dynamic>? content) {
  if (content == null) return step;

  final title = content['title'] as String? ?? step.title;
  final text = content['text'] as String? ?? step.text;

  return switch (step) {
    TaskStep(:final fen, :final orientation, :final solution, :final hint, :final success) =>
      TaskStep(
        title: title,
        text: text,
        fen: fen,
        orientation: orientation,
        solution: solution,
        hint: content['hint'] as String? ?? hint,
        success: content['success'] as String? ?? success,
      ),
    PositionStep(:final fen, :final orientation, :final arrows, :final highlights) => PositionStep(
        title: title,
        text: text,
        fen: fen,
        orientation: orientation,
        arrows: arrows,
        highlights: highlights,
      ),
    PgnStep(:final pgn) => PgnStep(title: title, text: text, pgn: pgn),
    TextStep() => TextStep(title: title, text: text),
  };
}

/* ------------------------------ seed parsing ------------------------------ */

Course courseFromSeed(Map<String, dynamic> json) => Course(
      id: json['id'] as String,
      title: json['title'] as String,
      summary: json['summary'] as String,
      level: CourseLevel.values.firstWhere(
        (level) => level.name == json['level'],
        orElse: () => CourseLevel.beginner,
      ),
      tier: json['tier'] == 'premium' ? CourseTier.premium : CourseTier.free,
      icon: json['icon'] as String? ?? 'school',
      accent: json['accent'] as String? ?? 'blue',
      modules: ((json['modules'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map((module) => CourseModule(
                id: module['id'] as String,
                title: module['title'] as String,
                summary: module['summary'] as String?,
                lessons: ((module['lessons'] as List?) ?? const [])
                    .whereType<Map<String, dynamic>>()
                    .map(_lessonFromSeed)
                    .toList(),
              ))
              .toList(),
    );

Lesson _lessonFromSeed(Map<String, dynamic> lesson) => Lesson(
      id: lesson['id'] as String,
      title: lesson['title'] as String,
      summary: lesson['summary'] as String?,
      estimatedMinutes: (lesson['estimatedMinutes'] as num?)?.toInt(),
      tier: lesson['tier'] == 'premium'
          ? CourseTier.premium
          : lesson['tier'] == 'free'
              ? CourseTier.free
              : null,
      steps: ((lesson['steps'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(_stepFromSeed)
          .toList(),
    );

LessonStep _stepFromSeed(Map<String, dynamic> step) {
  final kind = step['kind'] as String? ?? 'text';
  final title = step['title'] as String?;
  final text = step['text'] as String?;

  switch (kind) {
    case 'position':
      return PositionStep(
        title: title,
        text: text,
        fen: step['fen'] as String,
        orientation: step['orientation'] == 'black' ? BoardOrientation.black : BoardOrientation.white,
        arrows: ((step['arrows'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map((arrow) => BoardArrow(
                  from: arrow['from'] as String,
                  to: arrow['to'] as String,
                  tone: _arrowTone(arrow['tone'] as String?),
                ))
            .toList(),
        highlights: ((step['highlights'] as List?) ?? const []).whereType<String>().toList(),
      );
    case 'task':
      return TaskStep(
        title: title,
        text: text,
        fen: step['fen'] as String,
        orientation: step['orientation'] == 'black' ? BoardOrientation.black : BoardOrientation.white,
        solution: ((step['solution'] as List?) ?? const []).whereType<String>().toList(),
        hint: step['hint'] as String?,
        success: step['success'] as String?,
      );
    case 'pgn':
      return PgnStep(title: title, text: text, pgn: step['pgn'] as String? ?? '');
    default:
      return TextStep(title: title, text: text);
  }
}

ArrowTone _arrowTone(String? tone) => switch (tone) {
      'success' => ArrowTone.success,
      'warning' => ArrowTone.warning,
      'info' => ArrowTone.info,
      'danger' => ArrowTone.danger,
      'secondary' => ArrowTone.secondary,
      _ => ArrowTone.defaultTone,
    };
