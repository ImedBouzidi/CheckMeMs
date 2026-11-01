import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/theme/app_theme.dart';
import '../../ui/widgets/cm.dart';

/// Puzzles screen, mirroring `chess-web/src/app/features/puzzles/puzzles.component.ts`.
/// The web release ships this page as an "in development" preview, so the
/// mobile app mirrors the same hero + feature overview.
class PuzzlesScreen extends StatelessWidget {
  const PuzzlesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;

    return CmPage(
      maxWidth: 1080,
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
                        Icon(Icons.extension_rounded, size: 15, color: cm.primaryDark),
                        const SizedBox(width: 6),
                        CmEyebrow(language.t('puzzles.eyebrow')),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      language.t('puzzles.title'),
                      style: tt.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        height: 1.02,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      language.t('puzzles.subtitle'),
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
          _PuzzleStage(language: language),
          const SizedBox(height: 34),
          CmSectionHeader(
            title: language.t('puzzles.featuresTitle'),
            copy: language.t('puzzles.featuresCopy'),
          ),
          const SizedBox(height: 6),
          _FeatureGrid(language: language),
        ],
      ),
    );
  }
}

class _PuzzleStage extends StatelessWidget {
  const _PuzzleStage({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 850;
        final copy = _PuzzleCopy(language: language);
        final art = const _PuzzleBoardArt();

        return Container(
          padding: EdgeInsets.all(wide ? 44 : 22),
          decoration: BoxDecoration(
            border: Border.all(color: cm.goldBorder),
            borderRadius: BorderRadius.circular(wide ? 28 : 24),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: cm.isDark
                  ? [cm.goldSoft, cm.surface, cm.primarySoft]
                  : const [Color(0xFFFFFEF8), Color(0xFFFFFCF2), Color(0xFFF8FBFF)],
            ),
            boxShadow: CmShadow.lg(cm),
          ),
          child: wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(flex: 21, child: copy),
                    const SizedBox(width: 48),
                    Expanded(flex: 19, child: art),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    copy,
                    const SizedBox(height: 26),
                    art,
                  ],
                ),
        );
      },
    );
  }
}

class _PuzzleCopy extends StatelessWidget {
  const _PuzzleCopy({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
          decoration: BoxDecoration(
            color: cm.goldSoft,
            border: Border.all(color: cm.goldBorder),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.today_rounded, size: 15, color: cm.gold),
              const SizedBox(width: 6),
              Text(
                language.t('puzzles.daily').toUpperCase(),
                style: TextStyle(
                  color: cm.gold,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.7,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 17),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(text: '${language.t('puzzles.titleA')}\n'),
              TextSpan(
                text: language.t('puzzles.titleB'),
                style: TextStyle(color: cm.gold),
              ),
            ],
          ),
          style: tt.headlineLarge?.copyWith(
            fontWeight: FontWeight.w800,
            height: 1.02,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 13),
        Text(
          language.t('puzzles.text'),
          style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.7),
        ),
        const SizedBox(height: 24),
        Wrap(
          spacing: 12,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            CmPrimaryButton(
              label: language.t('puzzles.start'),
              icon: Icons.play_arrow_rounded,
              onPressed: null,
            ),
            Text(
              language.t('puzzles.note'),
              style: tt.bodySmall?.copyWith(color: cm.muted),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Semantics(
          label: language.t('puzzles.themesAria'),
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final key in const [
                'puzzles.fork',
                'puzzles.pin',
                'puzzles.backRank',
                'puzzles.discovered',
                'puzzles.endgame',
              ])
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: cm.surface.withValues(alpha: 0.72),
                    border: Border.all(color: cm.line),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    language.t(key),
                    style: TextStyle(
                      color: cm.muted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Decorative puzzle board (a static illustration, hidden from a11y).
class _PuzzleBoardArt extends StatelessWidget {
  const _PuzzleBoardArt();

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;

    return ExcludeSemantics(
      child: Stack(
        alignment: Alignment.center,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Transform.rotate(
              angle: 0.052,
              child: AspectRatio(
                aspectRatio: 1,
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: cm.boardFrame, width: 8),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: cm.ink.withValues(alpha: 0.35),
                        blurRadius: 30,
                        offset: const Offset(0, 16),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final size = constraints.maxWidth;
                      Widget piece(String asset, double left, double top, double width) {
                        return Positioned(
                          left: left * size,
                          top: top * size,
                          width: width * size,
                          child: SvgPicture.asset(asset),
                        );
                      }

                      return Stack(
                        children: [
                          const Positioned.fill(child: CustomPaint(painter: _BoardPainter())),
                          piece('assets/pieces/bk.svg', 0.70, 0.06, 0.17),
                          piece('assets/pieces/wq.svg', 0.14, 0.34, 0.22),
                          piece('assets/pieces/bp.svg', 0.54, 0.63, 0.17),
                          piece('assets/pieces/wr.svg', 0.26, 0.73, 0.21),
                          Positioned(
                            left: 0.735 * size,
                            top: 0.44 * size,
                            width: 0.125 * size,
                            height: 0.125 * size,
                            child: Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: cm.danger.withValues(alpha: 0.68),
                                  width: 4,
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: cm.surface.withValues(alpha: 0.9),
                border: Border.all(color: cm.goldBorder),
                borderRadius: BorderRadius.circular(12),
                boxShadow: CmShadow.md(cm),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.bolt_rounded, size: 18, color: cm.gold),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        context.watch<LanguageService>().t('puzzles.streak'),
                        style: TextStyle(
                          color: cm.inkSoft,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        context.watch<LanguageService>().t('puzzles.streakSub'),
                        style: TextStyle(color: cm.muted, fontSize: 10),
                      ),
                    ],
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

class _BoardPainter extends CustomPainter {
  const _BoardPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final light = Paint()..color = const Color(0xFFF8F1E7);
    final dark = Paint()..color = const Color(0xFFE5D9C8);
    final cell = size.width / 8;
    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        canvas.drawRect(
          Rect.fromLTWH(col * cell, row * cell, cell, cell),
          (row + col).isEven ? light : dark,
        );
      }
    }
  }

  @override
  bool shouldRepaint(_BoardPainter oldDelegate) => false;
}

class _FeatureGrid extends StatelessWidget {
  const _FeatureGrid({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cards = [
      _FeatureCard(
        icon: Icons.local_fire_department_rounded,
        tone: 'gold',
        title: language.t('puzzles.f1Title'),
        text: language.t('puzzles.f1Text'),
      ),
      _FeatureCard(
        icon: Icons.category_rounded,
        tone: 'blue',
        title: language.t('puzzles.f2Title'),
        text: language.t('puzzles.f2Text'),
      ),
      _FeatureCard(
        icon: Icons.trending_up_rounded,
        tone: 'green',
        title: language.t('puzzles.f3Title'),
        text: language.t('puzzles.f3Text'),
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

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
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
