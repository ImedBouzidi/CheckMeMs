import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/services/puzzle_progress_service.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/cm.dart';

/// Puzzles screen, mirroring `chess-web/src/app/features/puzzles/puzzles.component.ts`:
class PuzzlesScreen extends StatefulWidget {
  const PuzzlesScreen({super.key});

  @override
  State<PuzzlesScreen> createState() => _PuzzlesScreenState();
}

class _PuzzlesScreenState extends State<PuzzlesScreen> {
  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;
    final puzzles = context.watch<PuzzleProgressService>();

    return CmPage(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Page header
          Container(
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
                      CmEyebrow(language.t('puzzles.eyebrow')),
                      const SizedBox(height: 10),
                      Text(
                        language.t('puzzles.title'),
                        style: tt.headlineLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                          height: 1.02,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        language.t('puzzles.subtitle'),
                        style: tt.bodyLarge?.copyWith(color: cm.inkSoft, height: 1.5),
                      ),
                    ],
                  ),
                ),
                // Progress tag
                CmTag(
                  '${puzzles.totalSolved} solved',
                  tone: 'gold',
                  icon: Icons.emoji_events_rounded,
                ),
              ],
            ),
          ),

          // KPI tiles
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              _PuzzleStatCard(
                icon: Icons.remove_chart_rounded,
                value: '${puzzles.streak}',
                label: language.t('puzzles.streak'),
                tone: 'green',
              ),
              _PuzzleStatCard(
                icon: Icons.trending_up_rounded,
                value: '${puzzles.accuracy}%',
                label: language.t('puzzles.accuracy'),
                tone: 'slate',
              ),
              _PuzzleStatCard(
                icon: Icons.today_rounded,
                value: '',
                label: language.t('puzzles.daily'),
                tone: 'blue',
              ),
            ],
          ),

 const SizedBox(height: 24),

          // Recent solved puzzles
          _SectionHeader(
            eyebrow: language.t('puzzles.recentEyebrow'),
            title: language.t('puzzles.recentTitle'),
            copy: language.t('puzzles.recentCopy'),
          ),

 const SizedBox(height: 8),

          // Puzzle list
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Stats row
                  _MiniStatRow(
                    language: language,
                    cm: cm,
                    tt: tt,
                    puzzles: puzzles,
                  ),

 const SizedBox(height: 16),

                  // Track progress rows
 ...[
                  for (final track in puzzleTracks)
                    _TrackRow(track: track, language: language),
                ],
                const SizedBox(height: 16),

                // Daily puzzle
                _DailyPuzzle(language: language, cm: cm, tt: tt, puzzles: puzzles),
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
  });

  final String eyebrow;
  final String title;
  final String copy;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CmEyebrow(eyebrow),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(copy, style: tt.bodySmall?.copyWith(color: cm.muted, height: 1.5)),
        ],
      ),
    );
  }
}

class _PuzzleStatCard extends StatelessWidget {
  const _PuzzleStatCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.tone,
  });

  final IconData icon;
  final String value;
  final String label;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return CmPanel(
      padding: const EdgeInsets.all(14),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CmIconTile(icon, tone: tone, size: 32, iconSize: 18),
          const SizedBox(height: 6),
          Text(value, style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.w800, height: 1)),
          const SizedBox(height: 2),
          Text(label, style: tt.bodySmall?.copyWith(color: cm.muted, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _MiniStatRow extends StatelessWidget {
  const _MiniStatRow({
    required this.language,
    required this.cm,
    required this.tt,
    required this.puzzles,
  });

  final LanguageService language;
  final CmColors cm;
  final TextTheme tt;
  final PuzzleProgressService puzzles;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _MiniStat(label: language.t('puzzles.solved'), value: '${puzzles.totalSolved}'),
        const SizedBox(width: 12),
        _MiniStat(label: language.t('puzzles.streak'), value: '${puzzles.streak}'),
        const SizedBox(width: 12),
        _MiniStat(label: language.t('puzzles.accuracy'), value: '${puzzles.accuracy}%'),
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
    final cm = context.cm;
    final tt = context.tt;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w800, height: 1)),
        const SizedBox(height: 2),
        Text(label, style: tt.bodySmall?.copyWith(color: cm.muted, fontWeight: FontWeight.w500)),
      ],
    );
  }
}

class _TrackRow extends StatelessWidget {
  const _TrackRow({required this.track, required this.language});

  final dynamic track;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              language.t(track.labelKey),
              style: tt.labelMedium,
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
              style: tt.labelSmall?.copyWith(color: cm.muted),
            ),
          ),
        ],
      ),
    );
  }
}

class _DailyPuzzle extends StatelessWidget {
  const _DailyPuzzle({
    required this.language,
    required this.cm,
    required this.tt,
    required this.puzzles,
  });

  final LanguageService language;
  final CmColors cm;
  final TextTheme tt;
  final PuzzleProgressService puzzles;

  @override
  Widget build(BuildContext context) {
    return CmPanel(
      padding: const EdgeInsets.all(14),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            language.t('puzzles.daily'),
            style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
 const SizedBox(height: 4),
          Text(
            language.t('puzzles.dailyText'),
            style: tt.bodySmall?.copyWith(color: cm.muted, height: 1.5),
          ),
 const SizedBox(height: 12),
          CmPrimaryButton(
            small: true,
            label: language.t('puzzles.startDaily'),
            icon: Icons.today_rounded,
            onPressed: () => context.go('/puzzles'),
          ),
        ],
      ),
    );
  }
}

// Mock puzzle tracks - in a full app these would come from the service
static const List<dynamic> puzzleTracks = [
  {'id': 'tactical', 'labelKey': 'tactical', 'total': 20},
  {'id': 'endgame', 'labelKey': 'endgame', 'total': 10},
  {'id': 'opening', 'labelKey': 'opening', 'total': 15},
];