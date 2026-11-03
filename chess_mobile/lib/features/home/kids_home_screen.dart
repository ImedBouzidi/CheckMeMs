import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../features/kids/kid_pieces.dart';
import '../../features/kids/kids_copy.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/kids_widgets.dart';

/// Kids landing page, the mobile counterpart of
/// `chess-web/src/app/features/home/kids-home.component.ts`: hero with the
/// bouncing knight mascot, three big choices, the six-piece guide and the
/// three-step how-to.
class KidsHomeScreen extends StatelessWidget {
  const KidsHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();

    return KidsWorld(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          KidHeader(
            languages: language.languages,
            selectedLanguage: language.code,
            onLanguage: language.setLanguage,
            onLogo: () => context.go(AppRoutes.kids),
            onPlay: () => context.go(AppRoutes.kidsPlay),
            onLearn: () => context.go(AppRoutes.kidsLearn),
            onGrownUps: () => context.go(AppRoutes.home),
            playLabel: language.kids('common.play'),
            learnLabel: language.kids('common.learn'),
            grownUpsLabel: language.kids('common.grownUps'),
            grownUpsTooltip: language.kids('common.backToNormalHome'),
          ),
          const SizedBox(height: 22),
          _Hero(language: language, onPlay: () => context.go(AppRoutes.kidsPlay)),
          const SizedBox(height: 26),
          _ChoiceGrid(language: language),
          const SizedBox(height: 34),
          _PieceGuide(language: language),
          const SizedBox(height: 28),
          _HowTo(language: language, onPlay: () => context.go(AppRoutes.kidsPlay)),
          const SizedBox(height: 24),
          _KidsFooter(language: language),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.language, required this.onPlay});

  final LanguageService language;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final stacked = constraints.maxWidth < 860;
        final text = KidPanel(
          padding: const EdgeInsets.fromLTRB(26, 26, 26, 24),
          radius: 32,
          child: Column(
            crossAxisAlignment: stacked ? CrossAxisAlignment.center : CrossAxisAlignment.start,
            children: [
              _Badge(label: language.kids('home.kidsMode')),
              const SizedBox(height: 14),
              _RainbowHeadline(
                line1: language.kids('home.heroLine1'),
                line2: language.kids('home.heroLine2'),
                center: stacked,
              ),
              const SizedBox(height: 12),
              Text(language.kids('home.heroSub'),
                  textAlign: stacked ? TextAlign.center : TextAlign.start,
                  style: const TextStyle(fontSize: 17, color: kKidSlate, height: 1.5)),
              const SizedBox(height: 20),
              KidMegaButton(
                label: language.kids('home.playWithBuddy'),
                emoji: '🤖',
                onTap: onPlay,
                expanded: stacked,
              ),
              const SizedBox(height: 14),
              Text(language.kids('home.stuckHint'),
                  textAlign: stacked ? TextAlign.center : TextAlign.start,
                  style: const TextStyle(fontSize: 13.5, color: kKidMuted, height: 1.5)),
            ],
          ),
        );

        final mascot = const _Mascot();
        if (stacked) {
          return Column(
            children: [
              const _Mascot(),
              const SizedBox(height: 12),
              text,
            ],
          );
        }
        // IntrinsicHeight gives the stretch a finite reference height: inside
        // KidsWorld's scrollable the incoming height is unbounded and a bare
        // stretched Row would force infinite height onto its children.
        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(flex: 12, child: text),
              const SizedBox(width: 22),
              Expanded(flex: 8, child: Center(child: mascot)),
            ],
          ),
        );
      },
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: kKidWhite,
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [BoxShadow(color: Color(0xFFDDD6FE), offset: Offset(0, 3))],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: kKidViolet,
            fontWeight: FontWeight.w800,
            fontSize: 12.5,
            letterSpacing: 0.8,
            height: 1.3,
          ),
        ),
      ),
    );
  }
}

/// `heroLine1` in slate over `heroLine2` painted with the moving rainbow.
class _RainbowHeadline extends StatefulWidget {
  const _RainbowHeadline({
    required this.line1,
    required this.line2,
    required this.center,
  });

  final String line1;
  final String line2;
  final bool center;

  @override
  State<_RainbowHeadline> createState() => _RainbowHeadlineState();
}

class _RainbowHeadlineState extends State<_RainbowHeadline> with SingleTickerProviderStateMixin {
  late final AnimationController _slide =
      AnimationController(vsync: this, duration: const Duration(seconds: 5))..repeat();

  @override
  void dispose() {
    _slide.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final alignment = widget.center ? TextAlign.center : TextAlign.start;
    return Column(
      crossAxisAlignment: widget.center ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        Text(widget.line1,
            textAlign: alignment,
            style: const TextStyle(
                fontSize: 34, fontWeight: FontWeight.w800, color: kKidText, height: 1.15)),
        AnimatedBuilder(
          animation: _slide,
          builder: (context, child) => ShaderMask(
            shaderCallback: (bounds) => LinearGradient(
              colors: const [
                kKidAmber,
                kKidPink,
                kKidPurple,
                Color(0xFF3B82F6),
                Color(0xFF10B981),
              ],
              begin: Alignment(-1 - 4 * _slide.value, 0),
              end: Alignment(1 - 4 * _slide.value, 0),
              tileMode: TileMode.mirror,
            ).createShader(bounds),
            child: child,
          ),
          child: Text(widget.line2,
              textAlign: alignment,
              style: const TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  color: kKidWhite,
                  height: 1.15)),
        ),
      ],
    );
  }
}

/// Knight mascot with halo, face and sparkles.
class _Mascot extends StatefulWidget {
  const _Mascot();

  @override
  State<_Mascot> createState() => _MascotState();
}

class _MascotState extends State<_Mascot> with TickerProviderStateMixin {
  late final AnimationController _bounce =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 2800))
        ..repeat(reverse: true);
  late final AnimationController _halo =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 3500))
        ..repeat(reverse: true);
  late final AnimationController _wink =
      AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat();

  @override
  void dispose() {
    _bounce.dispose();
    _halo.dispose();
    _wink.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      height: 240,
      child: Stack(
        alignment: Alignment.center,
        children: [
          AnimatedBuilder(
            animation: _halo,
            builder: (context, _) => Transform.scale(
              scale: 0.95 + 0.13 * _halo.value,
              child: Opacity(
                opacity: 0.8 + 0.2 * _halo.value,
                child: Container(
                  width: 210,
                  height: 210,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [Color(0xFFFDE68A), Color(0xFFFBCFE8), Colors.transparent],
                      stops: [0, 0.55, 0.72],
                    ),
                  ),
                ),
              ),
            ),
          ),
          AnimatedBuilder(
            animation: _bounce,
            builder: (context, child) => Transform.translate(
              offset: Offset(0, -16 * _bounce.value),
              child: Transform.rotate(angle: (-2 + 4 * _bounce.value) * math.pi / 180, child: child),
            ),
            child: kidSvg(kidPieceAsset('wN'), 170, 170),
          ),
          Positioned(
            top: 82,
            right: 34,
            child: AnimatedBuilder(
              animation: _wink,
              builder: (context, child) {
                final p = _wink.value;
                final pop = (p > 0.8 && p < 0.92) ? 1.2 : 1.0;
                return Transform.scale(scale: pop, child: child);
              },
              child: const Text('😊', style: TextStyle(fontSize: 30, height: 1.2)),
            ),
          ),
          const _Sparkle('✨', Offset(28, 26), 0),
          const _Sparkle('⭐', Offset(196, 44), 0.8),
          const _Sparkle('✨', Offset(62, 196), 1.6),
        ],
      ),
    );
  }
}

class _Sparkle extends StatefulWidget {
  const _Sparkle(this.glyph, this.offset, this.delay);
  final String glyph;
  final Offset offset;
  final double delay;

  @override
  State<_Sparkle> createState() => _SparkleState();
}

class _SparkleState extends State<_Sparkle> with SingleTickerProviderStateMixin {
  late final AnimationController _twinkle =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))
        ..repeat();

  @override
  void dispose() {
    _twinkle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = (widget.delay / 2.4 + _twinkle.value) % 1.0;
    final wave = (1 - math.cos(p * 2 * math.pi)) / 2;
    return Positioned(
      left: widget.offset.dx,
      top: widget.offset.dy,
      child: Opacity(
        opacity: 0.25 + 0.75 * wave,
        child: Transform.scale(
          scale: 0.8 + 0.35 * wave,
          child: Text(widget.glyph, style: const TextStyle(fontSize: 24, height: 1.2)),
        ),
      ),
    );
  }
}

class _ChoiceGrid extends StatelessWidget {
  const _ChoiceGrid({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cards = [
      KidChoiceCard(
        emoji: '🤖',
        title: language.kids('home.playChessTitle'),
        text: language.kids('home.playChessText'),
        cta: language.kids('home.playChessCta'),
        palette: KidChoicePalette.play,
        onTap: () => context.go(AppRoutes.kidsPlay),
      ),
      KidChoiceCard(
        emoji: '🧩',
        title: language.kids('home.learnPiecesTitle'),
        text: language.kids('home.learnPiecesText'),
        cta: language.kids('home.learnPiecesCta'),
        palette: KidChoicePalette.learn,
        onTap: () => context.go(AppRoutes.kidsLearn),
      ),
      KidChoiceCard(
        emoji: '🌟',
        title: language.kids('home.funPuzzlesTitle'),
        text: language.kids('home.funPuzzlesText'),
        cta: language.kids('home.funPuzzlesCta'),
        palette: KidChoicePalette.puzzle,
        onTap: () => context.go(AppRoutes.puzzles),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        if (!wide) {
          return Column(
            children: [
              for (final card in cards) ...[card, const SizedBox(height: 20)],
            ],
          );
        }
        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final card in cards)
                Expanded(child: card)
            ].withSeparators(const SizedBox(width: 22)),
          ),
        );
      },
    );
  }
}

class _PieceGuide extends StatelessWidget {
  const _PieceGuide({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    return KidPanel(
      padding: const EdgeInsets.fromLTRB(22, 26, 22, 24),
      radius: 32,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          KidSectionTitle(
            title: language.kids('home.meetPiecesTitle'),
            subtitle: language.kids('home.meetPiecesSub'),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = (constraints.maxWidth / 170).floor().clamp(2, 6);
              const spacing = 14.0;
              final width = (constraints.maxWidth - spacing * (columns - 1)) / columns;
              return Wrap(
                spacing: spacing,
                runSpacing: spacing,
                children: [
                  for (final piece in kidPieces)
                    SizedBox(
                      width: width,
                      child: KidPieceCard(
                        piece: piece,
                        label: language.pieceLabel(piece.name),
                        tapLabel: language.kids('home.tapToLearn'),
                        onTap: () => showKidPiecePopup(context, piece: piece),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _HowTo extends StatelessWidget {
  const _HowTo({required this.language, required this.onPlay});

  final LanguageService language;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    final steps = [
      (emoji: '👆', text: language.kids('home.step1')),
      (emoji: '🟢', text: language.kids('home.step2')),
      (emoji: '👑', text: language.kids('home.step3')),
    ];

    return Container(
      padding: const EdgeInsets.fromLTRB(22, 28, 22, 30),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xD9FFFFFF), Color(0xD9FEF3C7)],
        ),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: kKidWhite, width: 4),
        boxShadow: const [BoxShadow(color: Color(0xBFFDE68A), offset: Offset(0, 16))],
      ),
      child: Column(
        children: [
          KidSectionTitle(title: language.kids('home.howToPlayTitle'), center: true),
          const SizedBox(height: 24),
          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 720) {
                return Column(
                  children: [
                    for (var i = 0; i < steps.length; i++) ...[
                      KidStepCard(number: i + 1, emoji: steps[i].emoji, text: steps[i].text),
                      if (i != steps.length - 1) const SizedBox(height: 20),
                    ],
                  ],
                );
              }
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < steps.length; i++)
                      Expanded(
                        child: KidStepCard(
                            number: i + 1, emoji: steps[i].emoji, text: steps[i].text),
                      )
                  ].withSeparators(const SizedBox(width: 16)),
                ),
              );
            },
          ),
          const SizedBox(height: 26),
          KidMegaButton(
            label: language.kids('home.startPlaying'),
            emoji: '▶️',
            secondary: true,
            compact: true,
            onTap: onPlay,
          ),
        ],
      ),
    );
  }
}

class _KidsFooter extends StatelessWidget {
  const _KidsFooter({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 14,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(language.kids('home.footer'),
            style: const TextStyle(fontSize: 14, color: kKidMuted, height: 1.4)),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => context.go(AppRoutes.home),
            child: Text(
              language.kids('common.backToNormalHome'),
              style: const TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w700, color: kKidViolet, height: 1.4),
            ),
          ),
        ),
      ],
    );
  }
}

extension on List<Widget> {
  /// Interleave a fixed spacer between the children of a Row.
  List<Widget> withSeparators(Widget separator) {
    final result = <Widget>[];
    for (var i = 0; i < length; i++) {
      if (i > 0) result.add(separator);
      result.add(this[i]);
    }
    return result;
  }
}
