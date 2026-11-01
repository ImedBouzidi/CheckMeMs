import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/theme/app_theme.dart';
import '../../ui/widgets/cm.dart';

/// Opening explorer, mirroring `chess-web/src/app/features/openings/openings.component.ts`.
/// Like the web release this is an "in development" preview of the explorer.
class OpeningsScreen extends StatelessWidget {
  const OpeningsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;

    return CmPage(
      maxWidth: 1160,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.auto_stories_rounded, size: 15, color: cm.primaryDark),
                        const SizedBox(width: 6),
                        CmEyebrow(language.t('openings.eyebrow')),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      language.t('openings.title'),
                      style: tt.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        height: 1.02,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      language.t('openings.subtitle'),
                      style: tt.bodyLarge?.copyWith(color: cm.inkSoft, height: 1.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              CmTag(language.t('common.inDevelopment'), tone: 'gold'),
            ],
          ),
          const SizedBox(height: 24),
          LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 920;
              if (!wide) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _ExplorerPanel(language: language),
                    const SizedBox(height: 18),
                    _LinePreview(language: language),
                  ],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(flex: 23, child: _ExplorerPanel(language: language)),
                  const SizedBox(width: 22),
                  Expanded(flex: 17, child: _LinePreview(language: language)),
                ],
              );
            },
          ),
          const SizedBox(height: 34),
          CmSectionHeader(title: language.t('openings.toolsTitle')),
          const SizedBox(height: 6),
          _ToolsGrid(language: language),
        ],
      ),
    );
  }
}

class _ExplorerPanel extends StatelessWidget {
  const _ExplorerPanel({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    final rows = [
      ('e4', 'openings.kingsPawn', 'openings.kingsPawnSub', '1.e4'),
      ('d4', 'openings.queensPawn', 'openings.queensPawnSub', '1.d4'),
      ('c4', 'openings.english', 'openings.englishSub', '1.c4'),
      ('Nf3', 'openings.reti', 'openings.retiSub', '1.Nf3'),
    ];

    return CmPanel(
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  constraints: const BoxConstraints(minHeight: 42),
                  padding: const EdgeInsets.symmetric(horizontal: 13),
                  decoration: BoxDecoration(
                    color: cm.surfaceMuted,
                    border: Border.all(color: cm.line),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.search_rounded, size: 18, color: cm.mutedLight),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          language.t('openings.search'),
                          style: tt.bodySmall?.copyWith(color: cm.mutedLight),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: cm.surface,
                          border: Border.all(color: cm.line),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          '⌘ K',
                          style: TextStyle(
                            color: cm.mutedLight,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              CmTag(language.t('openings.preview')),
            ],
          ),
          const SizedBox(height: 22),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 0, 10, 9),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  language.t('openings.popular').toUpperCase(),
                  style: TextStyle(
                    color: cm.mutedLight,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                  ),
                ),
                Text(
                  language.t('openings.lines').toUpperCase(),
                  style: TextStyle(
                    color: cm.mutedLight,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                  ),
                ),
              ],
            ),
          ),
          Semantics(
            label: language.t('openings.explorerAria'),
            child: Column(
              children: [
                for (var i = 0; i < rows.length; i++)
                  _OpeningRow(
                    glyph: rows[i].$1,
                    name: language.t(rows[i].$2),
                    sub: language.t(rows[i].$3),
                    count: rows[i].$4,
                    active: i == 0,
                    showDivider: i > 0,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OpeningRow extends StatelessWidget {
  const _OpeningRow({
    required this.glyph,
    required this.name,
    required this.sub,
    required this.count,
    required this.active,
    required this.showDivider,
  });

  final String glyph;
  final String name;
  final String sub;
  final String count;
  final bool active;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
      decoration: BoxDecoration(
        color: active ? cm.primarySoft : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: showDivider && !active
            ? Border(top: BorderSide(color: cm.line.withValues(alpha: 0.6)))
            : null,
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: cm.surface,
              border: Border.all(color: cm.line),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              glyph,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: cm.primaryDark,
              ),
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: tt.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  sub,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: tt.bodySmall?.copyWith(color: cm.muted, fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            count,
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 11,
              color: cm.mutedLight,
            ),
          ),
        ],
      ),
    );
  }
}

class _LinePreview extends StatelessWidget {
  const _LinePreview({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    const moves = ['1. e4', 'e5', '2. Nf3', 'Nc6', '3. Bc4', 'Bc5'];

    return CmPanel(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              CmTag(language.t('openings.exampleLine'), tone: 'blue'),
              Icon(Icons.bookmark_border_rounded, size: 19, color: cm.mutedLight),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            language.t('openings.italian'),
            style: tt.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            language.t('openings.family'),
            style: tt.bodySmall?.copyWith(color: cm.mutedLight, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 22),
          Semantics(
            label: language.t('openings.movesAria'),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final move in moves)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: cm.surfaceMuted,
                      border: Border.all(color: cm.line),
                      borderRadius: BorderRadius.circular(7),
                    ),
                    child: Text(
                      move,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: cm.inkSoft,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: cm.goldSoft,
              border: Border.all(color: cm.goldBorder),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lightbulb_rounded, size: 19, color: cm.gold),
                const SizedBox(width: 9),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        language.t('openings.idea'),
                        style: TextStyle(
                          color: cm.gold,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        language.t('openings.ideaText'),
                        style: TextStyle(
                          color: cm.muted,
                          fontSize: 11.5,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _FactChip(
                  label: language.t('openings.style'),
                  value: language.t('openings.classical'),
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: _FactChip(
                  label: language.t('openings.plans'),
                  value: language.t('openings.plansValue'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FactChip extends StatelessWidget {
  const _FactChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: cm.surfaceMuted,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              color: cm.mutedLight,
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              color: cm.inkSoft,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ToolsGrid extends StatelessWidget {
  const _ToolsGrid({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cards = [
      _ToolCard(
        icon: Icons.account_tree_rounded,
        tone: 'blue',
        title: language.t('openings.o1Title'),
        text: language.t('openings.o1Text'),
      ),
      _ToolCard(
        icon: Icons.bookmarks_rounded,
        tone: 'gold',
        title: language.t('openings.o2Title'),
        text: language.t('openings.o2Text'),
      ),
      _ToolCard(
        icon: Icons.repeat_rounded,
        tone: 'green',
        title: language.t('openings.o3Title'),
        text: language.t('openings.o3Text'),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 760) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < cards.length; i++) ...[
                if (i > 0) const SizedBox(width: 14),
                Expanded(child: cards[i]),
              ],
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < cards.length; i++) ...[
              if (i > 0) const SizedBox(height: 12),
              cards[i],
            ],
          ],
        );
      },
    );
  }
}

class _ToolCard extends StatelessWidget {
  const _ToolCard({
    required this.icon,
    required this.tone,
    required this.title,
    required this.text,
  });

  final IconData icon;
  final String tone;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return CmPanel(
      padding: const EdgeInsets.all(18),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CmIconTile(icon, tone: tone),
          const SizedBox(height: 14),
          Text(title, style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(text, style: tt.bodySmall?.copyWith(color: cm.muted, height: 1.5)),
        ],
      ),
    );
  }
}
