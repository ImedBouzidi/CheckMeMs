import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/course.dart';
import '../../core/models/game_history.dart';
import '../../core/services/game_history_service.dart';
import '../../core/services/course_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/learning_progress_service.dart';
import '../../core/services/move_analysis_api_service.dart';
import '../../core/services/premium_service.dart';
import '../../core/services/puzzle_progress_service.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/cm.dart';

import '../../core/theme/app_theme.dart';

/// Dashboard, mirroring `chess-web/src/app/features/dashboard/dashboard.component.ts`:
/// KPI tiles, recent games with one-click engine review, course progress and
/// the puzzle tracks.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final Set<String> _analyzingIds = {};

  @override
  void initState() {
    super.initState();
    // Kick off the remote history load, like the web dashboard's ngOnInit.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<GameHistoryService>().loadRemote();
    });
  }

  GameHistoryService get _history => context.read<GameHistoryService>();

  /// Same id rules as the web `analysisGameId()`.
  String _analysisGameId(GameHistoryEntry game) {
    final uuid = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    if (game.remoteId != null) return game.remoteId!;
    if (uuid.hasMatch(game.id)) return game.id;
    return 'local-${game.id}';
  }

  void _openReview(GameHistoryEntry game) {
    final requestId = game.analysisRequestId;
    if (requestId == null) return;
    final uri = Uri(
      path: AppRoutes.analysis,
      queryParameters: {
        'requestId': requestId,
        'side': game.playerColor,
        if (game.plies > 0) 'plies': '${game.plies}',
      },
    );
    context.go(uri.toString());
  }

  Future<void> _analyzeGame(GameHistoryEntry game) async {
    if (game.analysisRequestId != null) {
      _openReview(game);
      return;
    }

    final auth = context.read<AuthService>();
    if (!auth.isAuthenticated) {
      context.go(AppRoutes.login(returnTo: AppRoutes.dashboard));
      return;
    }
    if (game.pgn.isEmpty || _analyzingIds.contains(game.id)) return;

    setState(() => _analyzingIds.add(game.id));
    try {
      final submitted = await context
          .read<MoveAnalysisApiService>()
          .submit(game.pgn, _analysisGameId(game));
      _history.attachAnalysis(game.id, submitted.requestId);
      if (!mounted) return;
      _openReview(game.copyWith(analysisRequestId: submitted.requestId));
    } catch (_) {
      if (!mounted) return;
      final language = context.read<LanguageService>();
      cmSnackBar(
        context,
        language.t('dashboard.games.analysisError'),
        error: true,
      );
    } finally {
      if (mounted) setState(() => _analyzingIds.remove(game.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final auth = context.watch<AuthService>();
    final history = context.watch<GameHistoryService>();
    final puzzles = context.watch<PuzzleProgressService>();
    final courses = context.watch<CourseService>();
    final learning = context.watch<LearningProgressService>();
    final premium = context.watch<PremiumService>();

    final stats = history.stats;
    final name = auth.userDisplayName ?? '';
    final title = name.isEmpty
        ? language.t('dashboard.titleGuest')
        : language.t('dashboard.title', {'name': name});

    // Overall course progress across every course the learner may open.
    var doneLessons = 0;
    var totalLessons = 0;
    for (final course in courses.courses) {
      final refs = courses.lessonRefs(course);
      totalLessons += refs.length;
      doneLessons += learning.completedCount(
        course.id,
        refs.map((ref) => ref.lesson.id).toList(growable: false),
      );
    }
    final coursePercent = totalLessons == 0 ? 0 : ((doneLessons / totalLessons) * 100).round();

    return CmPage(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CmSectionHeader(
            eyebrow: language.t('dashboard.eyebrow'),
            title: title,
            copy: language.t('dashboard.subtitle'),
          ),
          if (!auth.isAuthenticated) ...[
            CmNote(language.t('dashboard.signInPrompt')),
            const SizedBox(height: 10),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: CmSecondaryButton(
                label: language.t('dashboard.signIn'),
                icon: Icons.login_rounded,
                onPressed: () => context.go(AppRoutes.login(returnTo: AppRoutes.dashboard)),
              ),
            ),
            const SizedBox(height: 16),
          ],
          // KPI tiles.
          LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 900;
              return GridView.count(
                crossAxisCount: wide ? 4 : 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: wide ? 1.9 : 1.55,
                children: [
                  CmStatCard(
                    icon: Icons.sports_esports_rounded,
                    value: '${stats.played}',
                    label: language.t('dashboard.stats.games'),
                    tone: 'blue',
                  ),
                  CmStatCard(
                    icon: Icons.emoji_events_rounded,
                    value: '${stats.winRate}%',
                    label: language.t('dashboard.stats.winRate'),
                    tone: 'gold',
                  ),
                  CmStatCard(
                    icon: Icons.local_fire_department_rounded,
                    value: '${puzzles.streak}',
                    label: language.t('dashboard.stats.puzzleStreak'),
                    tone: 'green',
                  ),
                  CmStatCard(
                    icon: Icons.school_rounded,
                    value: '$coursePercent%',
                    label: language.t('dashboard.stats.courseProgress'),
                    tone: 'slate',
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              CmPrimaryButton(
                small: true,
                label: language.t('dashboard.quick.play'),
                icon: Icons.play_arrow_rounded,
                onPressed: () => context.go(AppRoutes.play),
              ),
              CmSecondaryButton(
                small: true,
                label: language.t('dashboard.quick.puzzles'),
                icon: Icons.extension_rounded,
                onPressed: () => context.go(AppRoutes.puzzles),
              ),
              CmSecondaryButton(
                small: true,
                label: language.t('dashboard.quick.learn'),
                icon: Icons.school_rounded,
                onPressed: () => context.go(AppRoutes.learn),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Recent games.
          _SectionHeader(
            eyebrow: language.t('dashboard.games.eyebrow'),
            title: language.t('dashboard.games.title'),
            copy: language.t('dashboard.games.copy'),
            actionLabel: language.t('dashboard.games.play'),
            onAction: () => context.go(AppRoutes.play),
          ),
          if (history.loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 26),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (history.games.isEmpty)
            CmEmptyState(
              icon: Icons.grid_view_rounded,
              title: language.t('dashboard.games.emptyTitle'),
              text: language.t('dashboard.games.emptyText'),
              actionLabel: language.t('dashboard.games.emptyCta'),
              onAction: () => context.go(AppRoutes.play),
            )
          else ...[
            if (history.remoteError)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: CmNote(
                  language.t('dashboard.games.remoteError'),
                  tone: 'gold',
                  icon: Icons.cloud_off_rounded,
                ),
              ),
            ...history.games.take(12).map(
                  (game) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _GameRow(
                      game: game,
                      language: language,
                      analyzing: _analyzingIds.contains(game.id),
                      onAnalyze: () => _analyzeGame(game),
                    ),
                  ),
                ),
          ],
          const SizedBox(height: 14),

          // Courses.
          _SectionHeader(
            eyebrow: language.t('dashboard.courses.eyebrow'),
            title: language.t('dashboard.courses.title'),
            copy: language.t('dashboard.courses.copy'),
            actionLabel: language.t('dashboard.courses.all'),
            onAction: () => context.go(AppRoutes.learn),
          ),
          CmPanel(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        language.t('dashboard.courses.continue'),
                        style: context.tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    Text(
                      language.t('dashboard.courses.lessonTotal', {
                        'done': doneLessons,
                        'total': totalLessons,
                      }),
                      style: context.tt.labelMedium?.copyWith(color: context.cm.muted),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                CmProgressBar(percent: coursePercent.toDouble()),
                const SizedBox(height: 14),
                SizedBox(
                  height: 118,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: courses.courses.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 10),
                    itemBuilder: (context, index) {
                      final course = courses.courses[index];
                      final refs = courses.lessonRefs(course);
                      final ids = refs.map((ref) => ref.lesson.id).toList(growable: false);
                      final done = learning.completedCount(course.id, ids);
                      final locked = !premium.canOpenCourse(course);
                      final percent =
                          ids.isEmpty ? 0 : ((done / ids.length) * 100).round();
                      return _CourseCard(
                        course: course,
                        done: done,
                        total: ids.length,
                        percent: percent,
                        locked: locked,
                        language: language,
                        onTap: () => context.go(AppRoutes.learn),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Puzzles.
          _SectionHeader(
            eyebrow: language.t('dashboard.puzzles.eyebrow'),
            title: language.t('dashboard.puzzles.title'),
            copy: language.t('dashboard.puzzles.copy'),
          ),
          CmPanel(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _MiniStat(
                        label: language.t('dashboard.puzzles.solved'),
                        value: '${puzzles.totalSolved}',
                      ),
                    ),
                    Expanded(
                      child: _MiniStat(
                        label: language.t('dashboard.puzzles.streak'),
                        value: '${puzzles.streak}',
                      ),
                    ),
                    Expanded(
                      child: _MiniStat(
                        label: language.t('dashboard.puzzles.accuracy'),
                        value: '${puzzles.accuracy}%',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ...[
                  for (final track in puzzleTracks)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _TrackRow(track: track, language: language),
                    ),
                ],
                const SizedBox(height: 4),
                CmPanel(
                  color: context.cm.primarySoft,
                  border: Colors.transparent,
                  shadow: false,
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        language.t('dashboard.puzzles.daily'),
                        style: context.tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        language.t('dashboard.puzzles.dailyText'),
                        style: context.tt.bodySmall?.copyWith(color: context.cm.muted),
                      ),
                      const SizedBox(height: 12),
                      CmPrimaryButton(
                        small: true,
                        label: language.t('dashboard.puzzles.startDaily'),
                        icon: Icons.today_rounded,
                        onPressed: () => context.go(AppRoutes.puzzles),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.eyebrow,
    required this.title,
    required this.copy,
    this.actionLabel,
    this.onAction,
  });

  final String eyebrow;
  final String title;
  final String copy;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CmEyebrow(eyebrow),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: context.tt.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              if (actionLabel != null)
                CmSecondaryButton(small: true, label: actionLabel!, onPressed: onAction),
            ],
          ),
          const SizedBox(height: 6),
          Text(copy, style: context.tt.bodySmall?.copyWith(color: context.cm.muted, height: 1.5)),
        ],
      ),
    );
  }
}

class _TrackRow extends StatelessWidget {
  const _TrackRow({required this.track, required this.language});

  final PuzzleTrack track;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final puzzles = context.watch<PuzzleProgressService>();
    return Row(
      children: [
        Expanded(
          flex: 3,
          child: Text(
            language.t(track.labelKey),
            style: context.tt.labelMedium,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        Expanded(
          flex: 5,
          child: CmProgressBar(
            percent: puzzles.trackPercent(track).toDouble(),
            height: 6,
          ),
        ),
        SizedBox(
          width: 54,
          child: Text(
            '${puzzles.solvedCount(track.id)}/${track.total}',
            textAlign: TextAlign.end,
            style: context.tt.labelSmall?.copyWith(color: cm.muted),
          ),
        ),
      ],
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: context.tt.titleLarge?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: context.tt.labelSmall?.copyWith(color: context.cm.muted),
        ),
      ],
    );
  }
}

class _GameRow extends StatelessWidget {
  const _GameRow({
    required this.game,
    required this.language,
    required this.analyzing,
    required this.onAnalyze,
  });

  final GameHistoryEntry game;
  final LanguageService language;
  final bool analyzing;
  final VoidCallback onAnalyze;

  String _outcomeLabel() => switch (game.result) {
        GameOutcome.win => language.t('dashboard.games.win'),
        GameOutcome.loss => language.t('dashboard.games.loss'),
        GameOutcome.draw => language.t('dashboard.games.draw'),
      };

  String _outcomeTone() => switch (game.result) {
        GameOutcome.win => 'green',
        GameOutcome.loss => 'danger',
        GameOutcome.draw => 'slate',
      };

  String _dateLabel() {
    final date = DateTime.tryParse(game.playedAt);
    if (date == null) return '';
    return DateFormat.yMMMd().format(date.toLocal());
  }

  String _clockLabel() =>
      game.timeControl.isEmpty || game.timeControl == 'unlimited'
          ? language.t('common.noClock')
          : game.timeControl;

  String _analysisLabel() {
    if (game.analysisRequestId != null) return language.t('dashboard.games.analysisReady');
    if (analyzing) return language.t('dashboard.games.analysisRunning');
    if (game.analysisStatus == 'FAILED') return language.t('dashboard.games.analysisFailedChip');
    return language.t('dashboard.games.analysisPending');
  }

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final ready = game.analysisRequestId != null;
    return CmPanel(
      padding: const EdgeInsets.all(14),
      radius: CmRadius.md,
      child: Row(
        children: [
          CmIconTile(
            game.result == GameOutcome.win
                ? Icons.emoji_events_rounded
                : game.result == GameOutcome.loss
                    ? Icons.sentiment_dissatisfied_rounded
                    : Icons.handshake_rounded,
            tone: _outcomeTone(),
            size: 40,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        language.t('dashboard.games.vs', {'opponent': game.opponent}),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    CmTag(_outcomeLabel(), tone: _outcomeTone(), dense: true),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    _clockLabel(),
                    language.t('dashboard.games.moves', {'count': game.plies ~/ 2}),
                    _dateLabel(),
                  ].where((part) => part.isNotEmpty).join(' · '),
                  style: tt.labelSmall?.copyWith(color: cm.muted),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      ready
                          ? Icons.check_circle_rounded
                          : analyzing
                              ? Icons.timelapse_rounded
                              : Icons.radio_button_unchecked_rounded,
                      size: 13,
                      color: ready
                          ? cm.success
                          : analyzing
                              ? cm.primary
                              : cm.mutedLight,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      _analysisLabel(),
                      style: tt.labelSmall?.copyWith(
                        color: ready
                            ? cm.success
                            : analyzing
                                ? cm.primary
                                : cm.muted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          analyzing
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : CmSecondaryButton(
                  small: true,
                  label: ready
                      ? language.t('dashboard.games.review')
                      : language.t('dashboard.games.analyze'),
                  icon: Icons.insights_rounded,
                  onPressed: onAnalyze,
                ),
        ],
      ),
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
    return SizedBox(
      width: 210,
      child: CmPanel(
        onTap: onTap,
        padding: const EdgeInsets.all(14),
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
                  CmTag('$percent%', tone: course.accent, dense: true),
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
