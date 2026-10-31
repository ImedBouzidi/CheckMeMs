import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/course.dart';
import '../../core/services/course_service.dart';
import '../../core/services/premium_service.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/cm.dart';

/// Opening explorer, mirroring `chess-web/src/app/features/openings/openings.component.ts`:
class OpeningsScreen extends StatefulWidget {
  const OpeningsScreen({super.key});

  @override
  State<OpeningsScreen> createState() => _OpeningsScreenState();
}

class _OpeningsScreenState extends State<OpeningsScreen> {
  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;

    // Popular openings data - mirroring the web component's hardcoded openings
    final popularOpenings = [
      {'opening': 'e4', 'name': 'King\'s Pawn Opening', 'moves': '1. e4', 'variations': 'e5 Nf3 Nc6 Bb5', 'style': 'Classical', 'plans': 'Control the center'},
      {'opening': 'd4', 'name': 'Queen\'s Pawn Opening', 'moves': '1. d4', 'variations': 'e6 c4 Nf3', 'style': 'Classical', 'plans': 'Control the center'},
      {'opening': 'c4', 'name': 'English Opening', 'moves': '1. c4', 'variations': 'e5 Nf3 e6', 'style': 'Hypermodern', 'plans': 'Control the center from a distance'},
      {'opening': 'Nf3', 'name': 'Reti Opening', 'moves': '1. Nf3', 'variations': 'd5 c4', 'style': 'Hypermodern', 'plans': 'Flexible piece development'},
    ];

    return CmPage(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Page header mirroring .cm-page-header
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
                      CmEyebrow(language.t('openings.eyebrow')),
                      const SizedBox(height: 10),
                      Text(
                        language.t('openings.title'),
                        style: tt.headlineLarge?.copyWith(fontWeight: FontWeight.w800, height: 1.02, letterSpacing: -0.2),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        language.t('openings.subtitle'),
                        style: tt.bodyLarge?.copyWith(color: cm.inkSoft, height: 1.5),
                      ),
                    ],
                  ),
                ),
                // Development tag (mirrors web @if (isDev))
                const SizedBox(width: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: cm.primarySoft,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: cm.primary.withValues(alpha: 0.3)),
                  ),
                  child: const Text(
                    'In Development',
                    style: TextStyle(
                      color: cm.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Explorer layout: panel + line preview
          Expanded(
            child: Row(
              children: [
                // Explorer panel (left wider)
                Expanded(
                  flex: 3,
                  child: _ExplorerPanel(
                    language: language,
                    cm: cm,
                    tt: tt,
                    popularOpenings: popularOpenings,
                  ),
                ),
                // Line preview (right narrower)
                Expanded(
                  flex: 2,
                  child: _LinePreview(
                    language: language,
                    cm: cm,
                    tt: tt,
                  ),
                ),
              ],
            ),
          ),

          // Tools section
          _FeatureGrid(language: language, cm: cm, tt: tt),
        ],
      ),
    );
  }
}

class _ExplorerPanel extends StatelessWidget {
  const _ExplorerPanel({
    required this.language,
    required this.cm,
    required this.tt,
    required this.popularOpenings,
  });

  final LanguageService language;
  final CmColors cm;
  final TextTheme tt;
  final List<Map<String, dynamic>> popularOpenings;

  @override
  Widget build(BuildContext context) {
    return CmPanel(
      padding: const EdgeInsets.all(20),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Toolbar with search
          _ExplorerToolbar(language: language, cm: cm, tt: tt),

          const SizedBox(height: 20),

 // Popular openings list
          _PopularOpeningsList(openings: popularOpenings, language: language, cm: cm, tt: tt),
        ],
      ),
    );
  }
}

class _ExplorerToolbar extends StatelessWidget {
  const _ExplorerToolbar({
    required this.language,
    required this.cm,
    required this.tt,
  });

  final LanguageService language;
  final CmColors cm;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    return CmPanel(
      padding: const EdgeInsets.all(13),
      color: cm.surfaceMuted,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: cm.line),
      child: Row(
        children: [
          Icon(Icons.search_rounded, size: 18, color: cm.mutedLight),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              language.t('openings.search'),
              style: tt.bodyMedium?.copyWith(color: cm.mutedLight),
            ),
          ),
        ],
      ),
    );
  }
}

class _PopularOpeningsList extends StatelessWidget {
  const _PopularOpeningsList({
    required this.openings,
    required this.language,
    required this.cm,
    required this.tt,
  });

  final List<Map<String, dynamic>> openings;
  final LanguageService language;
  final CmColors cm;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section heading
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Text(
                language.t('openings.popular'),
                style: tt.labelMedium?.copyWith(color: cm.mutedLight, fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),

        const SizedBox(height: 8),

        // Opening rows
        ...List.generate(openings.length, (index) => _OpeningRow(
          opening: openings[index],
          index: index,
          language: language,
          cm: cm,
          tt: tt,
        )),
      ],
    );
  }
}

class _OpeningRow extends StatelessWidget {
  const _OpeningRow({
    required this.opening,
    required this.index,
    required this.language,
    required this.cm,
    required this.tt,
  });

  final Map<String, dynamic> opening;
  final int index;
  final LanguageService language;
  final CmColors cm;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    final isActive = index == 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: CmPanel(
        padding: const EdgeInsets.all(12),
        radius: CmRadius.md,
        color: isActive ? cm.primarySoft : cm.surface,
        border: isActive ? Border.all(color: cm.primary) : Border.none,
        child: Row(
          children: [
            // Opening glyph
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                border: Border.all(color: cm.line),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  opening['opening'],
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 0.78 * 16,
                    fontWeight: FontWeight.w700,
                    color: isActive ? cm.primaryDark : cm.muted,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),

 // Opening name and variations
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    language.t(opening['name']),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: tt.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: isActive ? cm.ink : cm.muted,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    language.t('openings.style', {'style': opening['style']}),
                    style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    language.t('openings.plans', {'plans': opening['plans']}),
                    style: tt.xxxSmall?.copyWith(color: cm.mutedLight),
                  ),
                ],
              ),
            ),

 // Opening count / popularity
            Text(
              language.t('openings.count', {'count': 15 + index * 5}),
              style: tt.labelSmall?.copyWith(color: cm.mutedLight),
            ),
          ],
        ),
      ),
    );
  }
}

class _LinePreview extends StatelessWidget {
  const _LinePreview({
    required this.language,
    required this.cm,
    required this.tt,
  });

  final LanguageService language;
  final CmColors cm;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    return CmPanel(
      padding: const EdgeInsets.all(24),
      radius: CmRadius.md,
      color: linearGradientGradient(
        180,
        [Color(0xFFF8FAFC), Color(0xFFE2E8F0)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Line header
          Row(
            children: [
              CmTag(language.t('openings.exampleLine'), tone: 'blue', icon: Icons.bookmark_border_rounded),
              const SizedBox(width: 8),
              Text(
                language.t('openings.italian'),
                style: tt.headlineMedium?.copyWith(fontWeight: FontWeight.w800, color: cm.ink),
              ),
            ],
          ),
          const SizedBox(height: 8),

 // Family line
          Text(
            language.t('openings.family'),
            style: tt.bodySmall?.copyWith(color: cm.mutedLight, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),

 // Moves
          _MovesList(),

 // Idea
          const SizedBox(height: 16),
          _IdeaCard(),

 // Facts
          const SizedBox(height: 16),
          _FactsGrid(),
        ],
      ),
    );
  }
}

class _MovesList extends StatelessWidget {
  _MovesList();

  final List<String> _moves = ['1. e4', 'e5', '2. Nf3', 'Nc6', '3. Bc4', 'Bc5'];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: _moves.map((move) => _MoveChip(move: move)).toList(),
    );
  }
}

class _MoveChip extends StatelessWidget {
  const _MoveChip({required this.move});

  final String move;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: cm.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: cm.line),
      ),
      child: Text(
        move,
        style: const TextStyle(
          fontFamily: 'monospace',
          fontSize: 9,
          fontWeight: FontWeight.w600,
          color: Color(0xFF334155),
        ),
      ),
    );
  }
}

class _IdeaCard extends StatelessWidget {
  _IdeaCard();

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cm.goldSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cm.goldBorder),
      ),
      child: Row(
        children: [
          Icon(Icons.lightbulb_rounded, size: 18, color: cm.gold),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  language.t('openings.idea'),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: cm.gold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  language.t('openings.ideaText'),
                  style: TextStyle(
                    fontSize: 9,
                    color: cm.mutedLight,
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

class _FactsGrid extends StatelessWidget {
  _FactsGrid();

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      children: [
        _FactCard(
          label: language.t('openings.style'),
          value: language.t('openings.classical'),
          icon: Icons.terrain_rounded,
          tone: 'green',
        ),
        _FactCard(
          label: language.t('openings.plans'),
          value: language.t('openings.plansValue'),
          icon: Icons.lightbulb_rounded,
          tone: 'gold',
        ),
        _FactCard(
          label: language.t('openings.famous'),
          value: 'Fischer\'s Game',
          icon: Icons.star_rounded,
          tone: 'blue',
        ),
        _FactCard(
          label: language.t('openings.popularity'),
          value: '3.2M games',
          icon: Icons trending_rounded,
          tone: 'slate',
        ),
      ],
    );
  }
}

class _FactCard extends StatelessWidget {
  const _FactCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.tone,
  });

  final String label;
  final String value;
  final IconData icon;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final color = cm.accent(tone);
    return CmPanel(
      padding: const EdgeInsets.all(10),
      radius: CmRadius.sm,
      color: cm.accentSoft(tone),
      border: Border.all(color: color.withValues(alpha: 0.3)),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureGrid extends StatelessWidget {
  const _FeatureGrid({
    required this.language,
    required this.cm,
    required this.tt,
  });

  final LanguageService language;
  final CmColors cm;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    return CmPanel(
      padding: const EdgeInsets.all(16),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            language.t('openings.toolsTitle'),
            style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          // Feature cards grid
          Row(
            children: [
              _FeatureCard(
                icon: Icons.account_tree_rounded,
                title: language.t('openings.o1Title'),
                text: language.t('openings.o1Text'),
                tone: 'blue',
              ),
              const SizedBox(width: 12),
              _FeatureCard(
                icon: Icons.bookmarks_rounded,
                title: language.t('openings.o2Title'),
                text: language.t('openings.o2Text'),
                tone: 'gold',
              ),
              const SizedBox(width: 12),
              _FeatureCard(
                icon: Icons.repeat_rounded,
                title: language.t('openings.o3Title'),
                text: language.t('openings.o3Text'),
                tone: 'green',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.text,
    required this.tone,
  });

  final IconData icon;
  final String title;
  final String text;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return Expanded(
      child: CmPanel(
        padding: const EdgeInsets.all(14),
        radius: CmRadius.md,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CmIconTile(icon, tone: tone, size: 32, iconSize: 16),
            const SizedBox(height: 8),
            Text(title, style: tt.labelLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(text, style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.5)),
          ],
        ),
      ),
    );
  }
}