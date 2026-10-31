import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/course.dart';
import '../../core/services/course_service.dart';
import '../../core/services/learning_progress_service.dart';
import '../../core/services/premium_service.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/cm.dart';

/// Learn hub, mirroring `chess-web/src/app/features/learn/learn.component.ts`:
class LearnScreen extends StatefulWidget {
  const LearnScreen({super.key});

  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> {
  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final premium = context.watch<PremiumService>();
    final courseService = context.read<CourseService>();
    final progress = context.watch<LearningProgressService>();

    // Overall course progress across every course the learner may open.
    var doneLessons = 0;
    var totalLessons = 0;
    for (final course in courseService.courses) {
      final refs = courseService.lessonRefs(course);
      totalLessons += refs.length;
      doneLessons += progress.completedCount(course.id, refs.map((ref) => ref.lesson.id).toList(growable: false));
    }
    final coursePercent = totalLessons == 0 ? 0 : ((doneLessons / totalLessons) * 100).round();

    return CmPage(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Page header mirroring .cm-page-header
          _LearnHeader(
            language: language,
            premium: premium,
          ),

          // Featured course spotlight
          if (courseService.courses.isNotEmpty) ...[
            _FeaturedCourseSpotlight(
              course: courseService.courses.first,
              courseService: courseService,
              progress: progress,
              premium: premium,
              onTap: () => context.go(AppRoutes.lesson(courseService.courses.first.id, '1')),
            ),
          ],

          // Course library grid
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Section header
                  _CourseLibraryHeader(
                    language: language,
                    courseService: courseService,
                    premium: premium,
                  ),

                  const SizedBox(height: 16),

                  // Course grid
                  _CourseGrid(
                    courseService: courseService,
                    progress: progress,
                    premium: premium,
                    onTap: () => context.go(AppRoutes.lesson(course.id, '1')),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LearnHeader extends StatelessWidget {
  const _LearnHeader({
    required this.language,
    required this.premium,
  });

  final LanguageService language;
  final PremiumService premium;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: cm.line)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CmEyebrow(language.t('learn.eyebrow')),
                const SizedBox(height: 10),
                Text(
                  language.t('learn.title'),
                  style: tt.headlineLarge?.copyWith(fontWeight: FontWeight.w800, height: 1.02, letterSpacing: -0.2),
                ),
                const SizedBox(height: 4),
                Text(
                  language.t('learn.subtitle'),
                  style: tt.bodyLarge?.copyWith(color: cm.inkSoft, height: 1.5),
                ),
              ],
            ),
          ),
          CmTag(
            premium.isPremium ? language.t('learn.hub.premiumActive') : language.t('learn.hub.freePlan'),
            tone: premium.isPremium ? 'gold' : 'slate',
            icon: premium.isPremium ? Icons.workspace_premium_rounded : Icons.lock_open_rounded,
          ),
        ],
      ),
    );
  }
}

class _FeaturedCourseSpotlight extends StatelessWidget {
  const _FeaturedCourseSpotlight({
    required this.course,
    required this.courseService,
    required this.progress,
    required this.premium,
    required this.onTap,
  });

  final Course course;
  final CourseService courseService;
  final LearningProgressService progress;
  final PremiumService premium;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    final refs = courseService.lessonRefs(course);
    final total = refs.length;
    final done = progress.completedCount(course.id, refs.map((ref) => ref.lesson.id).toList(growable: false));
    final ctaLabel = premium.canOpenCourse(course)
        ? (total > 0 && done >= total ? 'Review' : (done > 0 ? 'Continue' : 'Start'))
        : 'Locked';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        border: Border.all(color: cm.line),
        borderRadius: BorderRadius.vertical(top: Radius.circular(16), bottom: Radius.circular(16)),
        background: LinearGradient(
          colors: [Color(0xFFFFFFFF), Color(0xF8FAFC)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: CmShadow.md(cm),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Featured course visual
          AspectRatio(
            aspectRatio: 1.2,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                gradient: LinearGradient(
                  colors: [cm.primarySoft, cm.isDark ? Color(0xFF1E2A4A) : Color(0xFFEFF6FF)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Icon(
                course.icon,
                size: 64,
                color: cm.primaryDark,
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Course info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  course.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  course.summary,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: tt.bodySmall?.copyWith(color: cm.muted, height: 1.4),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${done}/$total lessons',
                      style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                    ),
                    // Premium lock indicator
                    premium.canOpenCourse(course)
                        ? const SizedBox.shrink()
                        : const Padding(
                            padding: EdgeInsets.only(left: 4),
                            child: Icon(Icons.lock_outline_rounded, size: 14, color: Color(0xFFFBBF24)),
                          ),
                  ],
                ),
                const SizedBox(height: 8),
                // Progress bar
                CmProgressBar(percent: (done / total * 100).toDouble(), height: 4),
                const SizedBox(height: 4),
                Text(
                  '${done}/$total lessons',
                  style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                ),
                const SizedBox(height: 8),
                // CTA button
                CmPrimaryButton(
                  small: true,
                  label: ctaLabel,
                  icon: Icons.arrow_forward_rounded,
                  onPressed: onTap,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CourseLibraryHeader extends StatelessWidget {
  const _CourseLibraryHeader({
    required this.language,
    required this.courseService,
    required this.premium,
  });

  final LanguageService language;
  final CourseService courseService;
  final PremiumService premium;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          CmEyebrow(language.t('learn.eyebrow')),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              language.t('learn.hub.library'),
              style: tt.headlineMedium?.copyWith(fontWeight: FontWeight.w700, height: 1.1),
            ),
          ),
          // Premium indicator
          premium.isPremium
              ? const Icon(Icons.workspace_premium_rounded, size: 16, color: cm.gold)
              : const Icon(Icons.lock_outline_rounded, size: 16, color: cm.gold),
          const SizedBox(width: 4),
          Text(
            premium.isPremium ? language.t('learn.hub.premiumActive') : language.t('learn.hub.freePlan'),
            style: tt.labelSmall?.copyWith(color: cm.mutedLight),
          ),
        ],
      ),
    );
  }
}

class _CourseGrid extends StatelessWidget {
  const _CourseGrid({
    required this.courseService,
    required this.progress,
    required this.premium,
    required this.onTap,
  });

  final CourseService courseService;
  final LearningProgressService progress;
  final PremiumService premium;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final language = context.watch<LanguageService>();

    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 1.15,
      ),
      itemCount: courseService.courses.length,
      itemBuilder: (context, index) {
        final course = courseService.courses[index];
        final refs = courseService.lessonRefs(course);
        final ids = refs.map((ref) => ref.lesson.id).toList(growable: false);
        final done = progress.completedCount(course.id, ids);
        final locked = !premium.canOpenCourse(course);
        final percent = ids.isEmpty ? 0 : ((done / ids.length) * 100).round();

        return _CourseCard(
          course: course,
          done: done,
          total: ids.length,
          percent: percent,
          locked: locked,
          language: language,
          onTap: () => onTap(course),
        );
      },
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({
    required this.course,
    required this.done,
    required this.total,
    required this.percent,
    required this.locked,
    required this.language,
    required this.onTap,
  });

  final Course course;
  final int done;
  final int total;
  final int percent;
  final bool locked;
  final LanguageService language;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return CmPanel(
      onTap: locked ? null : onTap,
      padding: const EdgeInsets.all(16),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CmIconTile(
                _courseIcon(course.icon),
                tone: course.accent,
                size: 34,
                iconSize: 17,
              ),
              const Spacer(),
              if (locked)
                Icon(Icons.lock_rounded, size: 16, color: cm.gold)
              else
                CmTag(
                  '${percent}%',
                  tone: course.accent,
                  dense: true,
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            course.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          CmProgressBar(percent: percent.toDouble(), height: 6),
          const SizedBox(height: 8),
          Text(
            language.t('dashboard.courses.progress', {'done': done, 'total': total}),
            style: tt.labelSmall?.copyWith(color: cm.muted),
          ),
        ],
      ),
    );
  }

  static IconData _courseIcon(String name) => switch (name) {
        'sports_esports' => Icons.sports_esports_rounded,
        'extension' => Icons.extension_rounded,
        'insights' => Icons.insights_rounded,
        'emoji_events' => Icons.emoji_events_rounded,
        'auto_stories' => Icons.auto_stories_rounded,
        _ => Icons.school_rounded,
      };
}