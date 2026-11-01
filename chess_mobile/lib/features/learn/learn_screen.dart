import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/course.dart';
import '../../core/services/course_service.dart';
import '../../core/services/learning_progress_service.dart';
import '../../core/services/premium_service.dart';
import '../../core/theme/app_theme.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/cm.dart';

/// Learn hub, mirroring `chess-web/src/app/features/learn/learn.component.ts`.
class LearnScreen extends StatelessWidget {
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final premium = context.watch<PremiumService>();
    final courseService = context.read<CourseService>();
    final progress = context.watch<LearningProgressService>();
    final courses = courseService.courses;
    final featured = courses.isEmpty ? null : courses.first;

    return CmPage(
      maxWidth: 1120,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _LearnHeader(language: language, premium: premium),
          if (featured != null) ...[
            const SizedBox(height: 20),
            _FeaturedCourse(
              course: featured,
              language: language,
              courseService: courseService,
              progress: progress,
              premium: premium,
            ),
          ],
          const SizedBox(height: 34),
          Row(
            children: [
              Expanded(
                child: Text(
                  language.t('learn.hub.library'),
                  style: context.tt.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
              ),
              CmTag('${courses.length}'),
            ],
          ),
          const SizedBox(height: 14),
          _CourseGrid(
            courses: courses,
            language: language,
            courseService: courseService,
            progress: progress,
            premium: premium,
          ),
        ],
      ),
    );
  }
}

class _LearnHeader extends StatelessWidget {
  const _LearnHeader({required this.language, required this.premium});

  final LanguageService language;
  final PremiumService premium;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.school_rounded, size: 15, color: cm.primaryDark),
                  const SizedBox(width: 6),
                  CmEyebrow(language.t('learn.eyebrow')),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                language.t('learn.title'),
                style: tt.headlineLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.02,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                language.t('learn.subtitle'),
                style: tt.bodyLarge?.copyWith(color: cm.inkSoft, height: 1.5),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.end,
          children: [
            CmTag(
              premium.isPremium
                  ? language.t('learn.hub.premiumActive')
                  : language.t('learn.hub.freePlan'),
              tone: premium.isPremium ? 'gold' : 'blue',
              icon: premium.isPremium
                  ? Icons.workspace_premium_rounded
                  : Icons.lock_open_rounded,
            ),
            if (kDebugMode)
              CmSecondaryButton(
                small: true,
                label: premium.isPremium
                    ? language.t('learn.hub.freePlan')
                    : language.t('learn.hub.devPremium'),
                onPressed: () => premium.setPremium(!premium.isPremium),
              ),
          ],
        ),
      ],
    );
  }
}

/* ------------------------------ featured course ------------------------------ */

class _FeaturedCourse extends StatelessWidget {
  const _FeaturedCourse({
    required this.course,
    required this.language,
    required this.courseService,
    required this.progress,
    required this.premium,
  });

  final Course course;
  final LanguageService language;
  final CourseService courseService;
  final LearningProgressService progress;
  final PremiumService premium;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final refs = courseService.lessonRefs(course);
    final done = _completedCount(course, refs, progress);
    final percent = refs.isEmpty ? 0 : ((done / refs.length) * 100).round();
    final current = _continueRef(course, courseService, progress, premium);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        border: Border.all(color: cm.isDark ? cm.line : const Color(0xFFC7D2FE)),
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: cm.isDark
              ? [cm.surface, cm.primarySoft, cm.surface]
              : const [Color(0xFFFFFFFF), Color(0xFFF8FAFF), Color(0xFFF5F3FF)],
        ),
        boxShadow: CmShadow.lg(cm),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 850;
          final copy = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.auto_awesome_rounded, size: 16, color: cm.primaryDark),
                  const SizedBox(width: 6),
                  Text(
                    language.t('learn.hub.freeCourse').toUpperCase(),
                    style: TextStyle(
                      color: cm.primaryDark,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                course.title,
                style: tt.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.04,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                course.summary,
                style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.7),
              ),
              const SizedBox(height: 22),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  CmPrimaryButton(
                    label: _ctaLabel(course, language, courseService, progress, premium),
                    icon: done > 0 ? Icons.play_arrow_rounded : Icons.rocket_launch_rounded,
                    onPressed: () => _openCourse(
                      context,
                      course,
                      language,
                      courseService,
                      progress,
                      premium,
                    ),
                  ),
                  Text(
                    language.t('learn.hub.progress', {
                      'done': done,
                      'total': refs.length,
                    }),
                    style: tt.bodySmall?.copyWith(color: cm.muted, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 320),
                child: CmProgressBar(percent: percent.toDouble(), height: 5),
              ),
            ],
          );

          final path = _LessonPath(
            course: course,
            refs: refs,
            current: current,
            progress: progress,
            premium: premium,
            language: language,
          );

          if (!wide) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [copy, const SizedBox(height: 26), path],
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(flex: 21, child: copy),
              const SizedBox(width: 44),
              Expanded(flex: 19, child: path),
            ],
          );
        },
      ),
    );
  }
}

class _LessonPath extends StatelessWidget {
  const _LessonPath({
    required this.course,
    required this.refs,
    required this.current,
    required this.progress,
    required this.premium,
    required this.language,
  });

  final Course course;
  final List<LessonRef> refs;
  final LessonRef? current;
  final LearningProgressService progress;
  final PremiumService premium;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;

    return Semantics(
      label: language.t('learn.hub.yourProgress'),
      child: Container(
        decoration: BoxDecoration(
          color: cm.surface.withValues(alpha: 0.9),
          border: Border.all(color: cm.line),
          borderRadius: BorderRadius.circular(20),
          boxShadow: CmShadow.md(cm),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            for (var i = 0; i < refs.length; i++)
              _PathRow(
                index: i,
                ref: refs[i],
                done: progress.isComplete(course.id, refs[i].lesson.id),
                current: current?.lesson.id == refs[i].lesson.id,
                showDivider: i > 0,
                onTap: () => _openLesson(context, refs[i], language, premium),
              ),
          ],
        ),
      ),
    );
  }
}

class _PathRow extends StatelessWidget {
  const _PathRow({
    required this.index,
    required this.ref,
    required this.done,
    required this.current,
    required this.showDivider,
    required this.onTap,
  });

  final int index;
  final LessonRef ref;
  final bool done;
  final bool current;
  final bool showDivider;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;

    return Material(
      color: current ? cm.primarySoft : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
          decoration: BoxDecoration(
            border: showDivider
                ? Border(top: BorderSide(color: cm.line.withValues(alpha: 0.6)))
                : null,
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: current ? cm.surface : cm.surfaceMuted,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${index + 1}'.padLeft(2, '0'),
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: current ? cm.primaryDark : cm.muted,
                  ),
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ref.lesson.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: done ? cm.muted : cm.inkSoft,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      ref.lesson.summary ?? '',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: cm.mutedLight, fontSize: 10.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                done
                    ? Icons.check_circle_rounded
                    : current
                        ? Icons.play_circle_rounded
                        : Icons.arrow_forward_rounded,
                size: 18,
                color: done
                    ? cm.success
                    : current
                        ? cm.primary
                        : cm.lineStrong,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/* ------------------------------- course grid -------------------------------- */

class _CourseGrid extends StatelessWidget {
  const _CourseGrid({
    required this.courses,
    required this.language,
    required this.courseService,
    required this.progress,
    required this.premium,
  });

  final List<Course> courses;
  final LanguageService language;
  final CourseService courseService;
  final LearningProgressService progress;
  final PremiumService premium;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final columns = width >= 1000 ? 3 : (width >= 600 ? 2 : 1);
        final spacing = 18.0;
        final cardWidth = (width - spacing * (columns - 1)) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final course in courses)
              SizedBox(
                width: cardWidth,
                child: _CourseCard(
                  course: course,
                  language: language,
                  courseService: courseService,
                  progress: progress,
                  premium: premium,
                ),
              ),
          ],
        );
      },
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({
    required this.course,
    required this.language,
    required this.courseService,
    required this.progress,
    required this.premium,
  });

  final Course course;
  final LanguageService language;
  final CourseService courseService;
  final LearningProgressService progress;
  final PremiumService premium;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final refs = courseService.lessonRefs(course);
    final done = _completedCount(course, refs, progress);
    final percent = refs.isEmpty ? 0 : ((done / refs.length) * 100).round();
    final locked = !premium.canOpenCourse(course);

    return CmPanel(
      padding: const EdgeInsets.all(22),
      radius: 22,
      color: locked ? cm.goldSoft : null,
      border: locked ? cm.goldBorder : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CmIconTile(
                _courseIcon(course.icon),
                tone: course.accent,
                size: 44,
              ),
              const Spacer(),
              if (locked)
                CmTag(
                  language.t('learn.hub.locked'),
                  tone: 'gold',
                  icon: Icons.lock_rounded,
                  dense: true,
                )
              else if (course.tier == CourseTier.free)
                CmTag(language.t('learn.hub.freeCourse'), tone: 'green', dense: true)
              else
                CmTag(language.t('learn.hub.teaser'), tone: 'blue', dense: true),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            course.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: tt.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            course.summary,
            style: tt.bodySmall?.copyWith(color: cm.muted, height: 1.6),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 14,
            runSpacing: 6,
            children: [
              Text(
                language.t('learn.hub.lessons', {'count': refs.length}),
                style: _metaStyle(cm),
              ),
              Text(
                language.t('learn.hub.minutes', {
                  'count': courseService.totalMinutes(course),
                }),
                style: _metaStyle(cm),
              ),
              Text(_levelLabel(course.level, language), style: _metaStyle(cm)),
            ],
          ),
          const SizedBox(height: 14),
          CmProgressBar(percent: percent.toDouble(), height: 4),
          const SizedBox(height: 6),
          Text(
            language.t('learn.hub.progress', {'done': done, 'total': refs.length}),
            style: TextStyle(color: cm.mutedLight, fontSize: 11),
          ),
          const SizedBox(height: 18),
          CmPrimaryButton(
            expanded: true,
            label: _ctaLabel(course, language, courseService, progress, premium),
            icon: locked ? Icons.lock_rounded : Icons.play_arrow_rounded,
            onPressed: () => _openCourse(
              context,
              course,
              language,
              courseService,
              progress,
              premium,
            ),
          ),
        ],
      ),
    );
  }

  TextStyle _metaStyle(CmColors cm) => TextStyle(
        color: cm.mutedLight,
        fontSize: 11.5,
        fontWeight: FontWeight.w600,
      );
}

/* -------------------------------- shared logic ------------------------------- */

IconData _courseIcon(String name) => switch (name) {
      'sports_esports' => Icons.sports_esports_rounded,
      'extension' => Icons.extension_rounded,
      'insights' => Icons.insights_rounded,
      'emoji_events' => Icons.emoji_events_rounded,
      'auto_stories' => Icons.auto_stories_rounded,
      'school' => Icons.school_rounded,
      _ => Icons.menu_book_rounded,
    };

int _completedCount(Course course, List<LessonRef> refs, LearningProgressService progress) =>
    progress.completedCount(
      course.id,
      refs.map((ref) => ref.lesson.id).toList(growable: false),
    );

String _levelLabel(CourseLevel level, LanguageService language) => switch (level) {
      CourseLevel.beginner => language.t('learn.hub.levelBeginner'),
      CourseLevel.intermediate => language.t('learn.hub.levelIntermediate'),
      CourseLevel.advanced => language.t('learn.hub.levelAdvanced'),
    };

String _ctaLabel(
  Course course,
  LanguageService language,
  CourseService courseService,
  LearningProgressService progress,
  PremiumService premium,
) {
  if (!premium.canOpenCourse(course)) return language.t('learn.hub.locked');
  final refs = courseService.lessonRefs(course);
  final done = _completedCount(course, refs, progress);
  if (refs.isNotEmpty && done >= refs.length) return language.t('learn.hub.review');
  if (done > 0) return language.t('learn.hub.continue');
  return language.t('learn.hub.start');
}

bool _lessonLocked(LessonRef ref, PremiumService premium) =>
    !premium.canOpenLesson(ref.course, ref.lesson, ref.index);

/// First unfinished unlocked lesson, falling back to the first unlocked one.
LessonRef? _continueRef(
  Course course,
  CourseService courseService,
  LearningProgressService progress,
  PremiumService premium,
) {
  final open = courseService
      .lessonRefs(course)
      .where((ref) => !_lessonLocked(ref, premium))
      .toList(growable: false);
  for (final ref in open) {
    if (!progress.isComplete(course.id, ref.lesson.id)) return ref;
  }
  return open.isEmpty ? null : open.first;
}

void _openCourse(
  BuildContext context,
  Course course,
  LanguageService language,
  CourseService courseService,
  LearningProgressService progress,
  PremiumService premium,
) {
  if (!premium.canOpenCourse(course)) {
    _showUpgrade(context, language, premium);
    return;
  }
  final ref = _continueRef(course, courseService, progress, premium);
  if (ref == null) return;
  _openLesson(context, ref, language, premium);
}

void _openLesson(
  BuildContext context,
  LessonRef ref,
  LanguageService language,
  PremiumService premium,
) {
  if (_lessonLocked(ref, premium)) {
    _showUpgrade(context, language, premium);
    return;
  }
  context.go(AppRoutes.lesson(ref.course.id, ref.lesson.id));
}

Future<void> _showUpgrade(
  BuildContext context,
  LanguageService language,
  PremiumService premium,
) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) {
      final cm = dialogContext.cm;
      return AlertDialog(
        icon: Icon(Icons.workspace_premium_rounded, color: cm.gold, size: 30),
        title: Text(language.t('learn.hub.lockedTitle')),
        content: Text(language.t('learn.hub.lockedText')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(language.t('learn.hub.close')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(
              kDebugMode
                  ? language.t('learn.hub.devPremium')
                  : language.t('learn.hub.unlock'),
            ),
          ),
        ],
      );
    },
  );
  if (confirmed == true && kDebugMode) premium.setPremium(true);
}
