/// Learning / courses domain model, mirroring
/// `chess-web/src/app/core/models/course.models.ts`.
///
/// English copy lives in the generated seed (`courses_seed.dart`); translated
/// copy is overlaid from `courses_content.dart` by CourseService.

library;

/// The standard starting position.
const String startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

enum CourseTier { free, premium }

enum CourseLevel { beginner, intermediate, advanced }

enum BoardOrientation { white, black }

enum ArrowTone { defaultTone, success, warning, info, danger, secondary }

class BoardArrow {
  const BoardArrow({required this.from, required this.to, this.tone = ArrowTone.defaultTone});

  final String from;
  final String to;
  final ArrowTone tone;
}

sealed class LessonStep {
  const LessonStep({this.title, this.text});

  /// Short heading shown above the step body.
  final String? title;

  /// Lesson copy (overlaid with translations).
  final String? text;
}

class TextStep extends LessonStep {
  const TextStep({super.title, super.text});
}

class PositionStep extends LessonStep {
  const PositionStep({
    super.title,
    super.text,
    required this.fen,
    this.orientation = BoardOrientation.white,
    this.arrows = const [],
    this.highlights = const [],
  });

  final String fen;
  final BoardOrientation orientation;
  final List<BoardArrow> arrows;

  /// Squares to frame, e.g. the centre or a weak point.
  final List<String> highlights;
}

class TaskStep extends LessonStep {
  const TaskStep({
    super.title,
    super.text,
    required this.fen,
    this.orientation = BoardOrientation.white,
    this.solution = const [],
    this.hint,
    this.success,
  });

  final String fen;
  final BoardOrientation orientation;

  /// SAN moves. Even indices are the learner's moves; odd indices are scripted
  /// replies played automatically.
  final List<String> solution;
  final String? hint;
  final String? success;
}

class PgnStep extends LessonStep {
  const PgnStep({super.title, super.text, required this.pgn});

  final String pgn;
}

class Lesson {
  const Lesson({
    required this.id,
    required this.title,
    this.summary,
    this.estimatedMinutes,
    this.tier,
    required this.steps,
  });

  final String id;
  final String title;
  final String? summary;
  final int? estimatedMinutes;

  /// Overrides the course tier for this lesson.
  final CourseTier? tier;
  final List<LessonStep> steps;
}

class CourseModule {
  const CourseModule({required this.id, required this.title, this.summary, required this.lessons});

  final String id;
  final String title;
  final String? summary;
  final List<Lesson> lessons;
}

class Course {
  const Course({
    required this.id,
    required this.title,
    required this.summary,
    required this.level,
    required this.tier,
    required this.icon,
    required this.accent,
    required this.modules,
  });

  final String id;
  final String title;
  final String summary;
  final CourseLevel level;
  final CourseTier tier;

  /// Material icon name.
  final String icon;

  /// Accent tile color: blue | gold | green | slate.
  final String accent;
  final List<CourseModule> modules;
}
