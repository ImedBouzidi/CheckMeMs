import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../features/kids/kid_pieces.dart';
import '../../features/kids/kids_copy.dart';

/// Kids palette, ported from the `styles` blocks of
/// `chess-web/src/app/features/home/kids-home.component.ts` and
/// `kids-piece-popup.component.ts`.
const Color kKidText = Color(0xFF1E293B);
const Color kKidTextStrong = Color(0xFF0F172A);
const Color kKidBody = Color(0xFF334155);
const Color kKidSlate = Color(0xFF475569);
const Color kKidMuted = Color(0xFF64748B);
const Color kKidViolet = Color(0xFF7C3AED);
const Color kKidPurple = Color(0xFF8B5CF6);
const Color kKidPurpleDeep = Color(0xFF6D28D9);
const Color kKidPink = Color(0xFFEC4899);
const Color kKidAmber = Color(0xFFF59E0B);
const Color kKidBrown = Color(0xFF7C2D12);
const Color kKidCream = Color(0xFFFEF3C7);
const Color kKidWhite = Color(0xFFFFFFFF);
const Color kKidSlateShadow = Color(0x5A94A3B8);
const Color kKidBoardBorder = Color(0xFFA78BFA);
const Color kKidLearnGreen = Color(0xFF22C55E);

/// False when the platform asks for reduced motion, the counterpart of the
/// `@media (prefers-reduced-motion: reduce)` blocks that stop the CSS
/// animations.
bool kidsMotionEnabled(BuildContext context) =>
    !(MediaQuery.maybeOf(context)?.disableAnimations ?? false);

/// Every kids piece/logo image, drawn through this wrapper so a missing or
/// malformed SVG can never propagate an exception upward and blank the page:
/// a broken asset degrades to a friendly emoji tile of the same footprint.
Widget kidSvg(String asset, double width, double height) {
  return SvgPicture.asset(
    asset,
    width: width,
    height: height,
    errorBuilder: (context, error, stack) => DecoratedBox(
      decoration: const BoxDecoration(
        color: Color(0xFFF3E8FF),
        borderRadius: BorderRadius.all(Radius.circular(10)),
      ),
      child: Center(
        child: Text('🐴',
            style: TextStyle(fontSize: math.min(width, height) * 0.55)),
      ),
    ),
  );
}

/// `linear-gradient(135deg, #fef3c7, #fce7f3, #dbeafe, #d1fae5, #fef3c7)`
/// slid around with `background-size: 400%`.
const List<Color> kKidWorldColors = [
  Color(0xFFFEF3C7),
  Color(0xFFFCE7F3),
  Color(0xFFDBEAFE),
  Color(0xFFD1FAE5),
  Color(0xFFFEF3C7),
];

/// Full-screen kids world: animated pastel gradient with drifting pieces,
/// rising bubbles and twinkling stars behind scrolling content.

/// Which floating decorations a kids page uses, matching the three `*-sky`
/// blocks of the web kids pages.
enum KidWorldDecor { home, play, learn }

class KidsWorld extends StatefulWidget {
  const KidsWorld({
    super.key,
    required this.child,
    this.maxWidth = 1200,
    this.padding = const EdgeInsets.fromLTRB(16, 8, 16, 24),
    this.decor = KidWorldDecor.home,
  });

  final Widget child;
  final double maxWidth;
  final EdgeInsets padding;
  final KidWorldDecor decor;

  @override
  State<KidsWorld> createState() => _KidsWorldState();
}

class _KidsWorldState extends State<KidsWorld>
    with SingleTickerProviderStateMixin {
  /// One master clock; every decorative element divides it into its own speed,
  /// the way CSS `animation-duration` / `animation-delay` pairs do.
  static const double _cycleSeconds = 22;

  late final AnimationController _clock = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 22),
  );

  bool get _reducedMotion =>
      MediaQuery.maybeOf(context)?.disableAnimations ?? false;

  @override
  void dispose() {
    _clock.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _clock.repeat();
  }

  @override
  Widget build(BuildContext context) {
    final frozen = _reducedMotion;
    if (frozen && _clock.isAnimating) _clock.stop();

    return Stack(
      children: [
        Positioned.fill(
          child: RepaintBoundary(
            child: AnimatedBuilder(
              animation: _clock,
              builder: (context, _) => _KidBackdrop(
                progress: frozen ? 0.14 : _clock.value,
                decor: widget.decor,
              ),
            ),
          ),
        ),
        SafeArea(
          bottom: false,
          child: SingleChildScrollView(
            padding: widget.padding,
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: widget.maxWidth),
                child: widget.child,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _KidBackdrop extends StatelessWidget {
  const _KidBackdrop({required this.progress, required this.decor});

  /// 0..1 of the master cycle.
  final double progress;
  final KidWorldDecor decor;

  static const List<_Bubble> _bubbles = [
    _Bubble(0.06, 90, 0, 16, Color(0xFFFCA5A5)),
    _Bubble(0.28, 60, 5, 20, Color(0xFF93C5FD)),
    _Bubble(0.62, 120, 2, 22, Color(0xFFFCD34D)),
    _Bubble(0.85, 70, 9, 18, Color(0xFF6EE7B7)),
  ];

  static const List<_Drifter> _homeDrifters = [
    _Drifter('wN', 54, _Anchor(left: 0.04, top: 0.14), 0, 0.35, 12, 8, 22),
    _Drifter('bQ', 44, _Anchor(left: 0.08, top: 0.60), 2, 0.35, 12, 8, 22),
    _Drifter('wR', 54, _Anchor(right: 0.05, top: 0.22), 4, 0.35, 12, 8, 22),
    _Drifter('bP', 40, _Anchor(right: 0.10, bottom: 0.18), 1, 0.35, 12, 8, 22),
  ];

  static const List<_Drifter> _playDrifters = [
    _Drifter('wK', 46, _Anchor(left: 0.02, top: 0.24), 0, 0.22, 11, 10, 22),
    _Drifter('bN', 46, _Anchor(right: 0.04, bottom: 0.12), 2, 0.22, 11, 10, 22),
  ];

  static const List<_Drifter> _learnDrifters = [
    _Drifter('wB', 48, _Anchor(right: 0.03, top: 0.20), 0, 0.2, 11, 9, 20),
    _Drifter('bR', 48, _Anchor(left: 0.03, bottom: 0.28), 2, 0.2, 11, 9, 20),
    _Drifter('wQ', 38, _Anchor(right: 0.18, top: 0.58), 3.5, 0.2, 11, 9, 20),
  ];

  static const List<_Glyph> _playGlyphs = [
    _Glyph('⭐', _Anchor(right: 0.08, top: 0.14), 0, 28),
    _Glyph('✨', _Anchor(left: 0.04, top: 0.52), 1.2, 22),
    _Glyph('🌈', _Anchor(right: 0.12, bottom: 0.18), 2.4, 34),
    _Glyph('🎈', _Anchor(left: 0.10, top: 0.72), 3.2, 30),
  ];

  static const List<_Glyph> _learnGlyphs = [
    _Glyph('⭐', _Anchor(left: 0.05, top: 0.12), 0, 28),
    _Glyph('✨', _Anchor(right: 0.06, top: 0.46), 1.2, 22),
    _Glyph('☁️', _Anchor(left: 0.09, bottom: 0.16), 2.4, 34),
    _Glyph('🎈', _Anchor(right: 0.12, top: 0.72), 3.2, 28),
  ];

  static const List<_Cloud> _clouds = [
    _Cloud(_Anchor(left: -0.10, top: 0.08), 64, 0, 30),
    _Cloud(_Anchor(left: -0.18, top: 0.32), 46, 8, 36),
    _Cloud(_Anchor(left: -0.14, top: 0.68), 54, 16, 32),
  ];

  static const List<_Twinkle> _stars = [
    _Twinkle(_Anchor(left: 0.45, top: 0.10), 0, 24),
    _Twinkle(_Anchor(right: 0.22, top: 0.46), 1, 18),
    _Twinkle(_Anchor(left: 0.38, bottom: 0.22), 2, 20),
  ];

  /// `0% {0} 10% {.55} 90% {.35} 100% {0}`
  double _bubbleOpacity(double p) {
    if (p < 0.1) return 0.55 * (p / 0.1);
    if (p < 0.9) return 0.55 - 0.2 * ((p - 0.1) / 0.8);
    return 0.35 * (1 - (p - 0.9) / 0.1);
  }

  double _wave(double p) => (1 - math.cos(p * 2 * math.pi)) / 2;

  double _phase(double durationSeconds, double delaySeconds) =>
      (progress * (_KidsWorldState._cycleSeconds / durationSeconds) +
          delaySeconds / durationSeconds) %
      1.0;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : 900.0;
        final height = constraints.maxHeight.isFinite
            ? constraints.maxHeight
            : 1400.0;

        return Stack(
          children: [
            Positioned.fill(child: _gradient()),
            ..._decorations(width, height),
          ],
        );
      },
    );
  }

  Widget _gradient() {
    if (decor == KidWorldDecor.learn) {
      return const DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFEEF2FF), Color(0xFFFDF2F8), Color(0xFFECFEFF)],
            stops: [0, 0.55, 1],
          ),
        ),
      );
    }

    final shift = progress * 0.65;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: kKidWorldColors,
          stops: List.generate(
            kKidWorldColors.length,
            (i) => (shift + i * 0.35 / (kKidWorldColors.length - 1))
                .clamp(0.0, 1.0)
                .toDouble(),
          ),
        ),
      ),
    );
  }

  List<Widget> _decorations(double width, double height) {
    return switch (decor) {
      KidWorldDecor.home => [
        for (final bubble in _bubbles)
          Positioned(
            left: bubble.left * width,
            top:
                height +
                bubble.size -
                _phase(bubble.duration, bubble.delay) *
                    (height * 1.35 + bubble.size * 2),
            child: _rising(bubble),
          ),
        for (final piece in _homeDrifters) _driftedPiece(piece, width, height),
        for (final star in _stars) _twinklingStar(star, width, height),
      ],
      KidWorldDecor.play => [
        for (final cloud in _clouds) _cloud(cloud, width, height),
        for (final glyph in _playGlyphs) _floatingGlyph(glyph, width, height),
        for (final piece in _playDrifters) _driftedPiece(piece, width, height),
      ],
      KidWorldDecor.learn => [
        for (final glyph in _learnGlyphs) _floatingGlyph(glyph, width, height),
        for (final piece in _learnDrifters) _driftedPiece(piece, width, height),
      ],
    };
  }

  Widget _at(
    _Anchor anchor,
    double width,
    double height, {
    required Widget child,
  }) {
    return Positioned(
      left: anchor.left != 0 ? anchor.left * width : null,
      right: anchor.right != 0 ? anchor.right * width : null,
      top: anchor.top != 0 ? anchor.top * height : null,
      bottom: anchor.bottom != 0 ? anchor.bottom * height : null,
      child: child,
    );
  }

  /// `float-up`: rise from below the fold, fade in and out, grow on the way.
  Widget _rising(_Bubble bubble) {
    final p = _phase(bubble.duration, bubble.delay);
    return Opacity(
      opacity: _bubbleOpacity(p),
      child: Transform.scale(
        scale: 0.8 + 0.35 * p,
        child: Container(
          width: bubble.size,
          height: bubble.size,
          decoration: BoxDecoration(
            color: bubble.color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: bubble.color.withValues(alpha: 0.5),
                blurRadius: 8,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _cloud(_Cloud cloud, double width, double height) {
    final p = _phase(cloud.duration, cloud.delay);
    return Positioned(
      left: cloud.anchor.left * width,
      top: cloud.anchor.top * height,
      child: Transform.translate(
        offset: Offset(p * width * 1.3, 0),
        child: Opacity(
          opacity: 0.55,
          child: Text('☁️', style: TextStyle(fontSize: cloud.size, height: 1)),
        ),
      ),
    );
  }

  /// `emoji-float` / `sky-float`: bob and rock in place.
  Widget _floatingGlyph(_Glyph glyph, double width, double height) {
    final wave = _wave(_phase(7, glyph.delay));
    return _at(
      glyph.anchor,
      width,
      height,
      child: Opacity(
        opacity: 0.7,
        child: Transform.translate(
          offset: Offset(0, -18 * wave),
          child: Transform.rotate(
            angle: (-6 + 14 * wave) * math.pi / 180,
            child: Text(
              glyph.glyph,
              style: TextStyle(fontSize: glyph.size, height: 1),
            ),
          ),
        ),
      ),
    );
  }

  Widget _driftedPiece(_Drifter piece, double width, double height) {
    final wave = _wave(_phase(piece.duration, piece.delay));
    final lift = piece.anchor.bottom != 0
        ? piece.lift * wave
        : -piece.lift * wave;
    return _at(
      piece.anchor,
      width,
      height,
      child: Opacity(
        opacity: piece.opacity,
        child: Transform.translate(
          offset: Offset(0, lift),
          child: Transform.rotate(
            angle: (-piece.degrees + 2 * piece.degrees * wave) * math.pi / 180,
            child: kidSvg(
              kidPieceAsset(piece.image),
              piece.size,
              piece.size,
            ),
          ),
        ),
      ),
    );
  }

  Widget _twinklingStar(_Twinkle star, double width, double height) {
    final wave = _wave(_phase(3, star.delay));
    return _at(
      star.anchor,
      width,
      height,
      child: Opacity(
        opacity: 0.25 + 0.75 * wave,
        child: Transform.scale(
          scale: 0.8 + 0.35 * wave,
          child: Text(
            '✦',
            style: TextStyle(fontSize: star.size, color: kKidAmber, height: 1),
          ),
        ),
      ),
    );
  }
}

class _Bubble {
  const _Bubble(this.left, this.size, this.delay, this.duration, this.color);
  final double left;
  final double size;
  final double delay;
  final double duration;
  final Color color;
}

class _Cloud {
  const _Cloud(this.anchor, this.size, this.delay, this.duration);
  final _Anchor anchor;
  final double size;
  final double delay;
  final double duration;
}

class _Glyph {
  const _Glyph(this.glyph, this.anchor, this.delay, this.size);
  final String glyph;
  final _Anchor anchor;
  final double delay;
  final double size;
}

class _Anchor {
  const _Anchor({this.left = 0, this.top = 0, this.right = 0, this.bottom = 0});
  final double left;
  final double top;
  final double right;
  final double bottom;
}

class _Drifter {
  const _Drifter(
    this.image,
    this.size,
    this.anchor,
    this.delay,
    this.opacity,
    this.duration,
    this.degrees,
    this.lift,
  );
  final String image;
  final double size;
  final _Anchor anchor;
  final double delay;
  final double opacity;
  final double duration;

  /// Rock amplitude of `piece-drift` / `drift`.
  final double degrees;
  final double lift;
}

class _Twinkle {
  const _Twinkle(this.anchor, this.delay, this.size);
  final _Anchor anchor;
  final double delay;
  final double size;
}

/// Rounded translucent panel with the thick white border and soft violet drop
/// shadow every kids section uses.
class KidPanel extends StatelessWidget {
  const KidPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(22),
    this.radius = 30,
    this.color = const Color(0xB8FFFFFF),
    this.shadowColor = const Color(0xFF6366F1),
    this.shadowOffset = 16,
  });

  final Widget child;
  final EdgeInsets padding;
  final double radius;
  final Color color;
  final Color shadowColor;
  final double shadowOffset;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: kKidWhite, width: 4),
        boxShadow: [
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.16),
            offset: Offset(0, shadowOffset),
          ),
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.3),
            blurRadius: 42,
            offset: Offset(0, shadowOffset + 14),
          ),
        ],
      ),
      child: child,
    );
  }
}

/// Small pill used by the kids header, CTA chips and toggles.
class KidPill extends StatelessWidget {
  const KidPill({
    super.key,
    required this.label,
    this.emoji,
    this.onTap,
    this.background = const Color(0xB3FFFFFF),
    this.color = kKidSlate,
    this.shadowColor = kKidSlateShadow,
    this.child,
  });

  final String label;
  final String? emoji;
  final VoidCallback? onTap;
  final Color background;
  final Color color;
  final Color shadowColor;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [BoxShadow(color: shadowColor, offset: const Offset(0, 3))],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
            child:
                child ??
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (emoji != null) ...[
                      Text(
                        emoji!,
                        style: const TextStyle(fontSize: 15, height: 1.2),
                      ),
                      const SizedBox(width: 6),
                    ],
                    Text(
                      label,
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
          ),
        ),
      ),
    );
  }
}

/// The big play button: green/cyan (violet/pink when [secondary]) with a solid
/// 3D base and a gentle breathing motion.
class KidMegaButton extends StatefulWidget {
  const KidMegaButton({
    super.key,
    required this.label,
    required this.onTap,
    this.emoji,
    this.secondary = false,
    this.expanded = false,
    this.compact = false,
  });

  final String label;
  final VoidCallback? onTap;
  final String? emoji;
  final bool secondary;
  final bool expanded;

  /// Rounded-16 tile instead of the full-height pill.
  final bool compact;

  @override
  State<KidMegaButton> createState() => _KidMegaButtonState();
}

class _KidMegaButtonState extends State<KidMegaButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  )..repeat(reverse: true);
  bool _pressed = false;

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final top = widget.secondary ? kKidPurple : kKidLearnGreen;
    final bottom = widget.secondary ? kKidPink : const Color(0xFF06B6D4);
    final base = widget.secondary ? kKidPurpleDeep : const Color(0xFF15803D);

    final button = AnimatedBuilder(
      animation: _breath,
      builder: (context, child) => Transform.translate(
        offset: Offset(0, _pressed ? 5 : -2 * _breath.value),
        child: child,
      ),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: widget.compact ? 20 : 28,
          vertical: widget.compact ? 13 : 17,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [top, bottom],
          ),
          borderRadius: BorderRadius.circular(widget.compact ? 16 : 999),
          boxShadow: [
            BoxShadow(color: base, offset: Offset(0, widget.compact ? 6 : 8)),
            BoxShadow(
              color: top.withValues(alpha: 0.55),
              blurRadius: 26,
              offset: const Offset(0, 14),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: widget.expanded ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: widget.expanded
              ? MainAxisAlignment.center
              : MainAxisAlignment.start,
          children: [
            if (widget.emoji != null) ...[
              Text(
                widget.emoji!,
                style: TextStyle(
                  fontSize: widget.compact ? 20 : 24,
                  height: 1.2,
                ),
              ),
              const SizedBox(width: 10),
            ],
            Flexible(
              child: Text(
                widget.label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: kKidWhite,
                  fontWeight: FontWeight.w800,
                  fontSize: widget.compact ? 17 : 19,
                  height: 1.3,
                ),
              ),
            ),
          ],
        ),
      ),
    );

    final tappable = GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: button,
    );

    return widget.expanded
        ? SizedBox(width: double.infinity, child: tappable)
        : tappable;
  }
}

/// The three big choices on the kids home page.
class KidChoiceCard extends StatelessWidget {
  const KidChoiceCard({
    super.key,
    required this.emoji,
    required this.title,
    required this.text,
    required this.cta,
    required this.onTap,
    this.palette = KidChoicePalette.play,
  });

  final String emoji;
  final String title;
  final String text;
  final String cta;
  final VoidCallback onTap;
  final KidChoicePalette palette;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: const Alignment(0.6, 1),
          colors: palette.colors,
        ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: kKidWhite, width: 4),
        boxShadow: [
          BoxShadow(color: palette.base, offset: const Offset(0, 12)),
          BoxShadow(
            color: palette.glow,
            blurRadius: 36,
            offset: const Offset(0, 22),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(28),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 210),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                // Shrink-wrap the height (required inside a scrollable),
                // while still filling stretched Row heights.
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    emoji,
                    style: const TextStyle(fontSize: 42, height: 1.15),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: kKidTextStrong,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Flexible (loose fit), not Expanded: the card must be able
                  // to shrink-wrap its height inside a scrollable, while still
                  // filling the remaining space when it is stretched by a Row.
                  Flexible(
                    child: Text(
                      text,
                      style: const TextStyle(
                        fontSize: 15,
                        color: kKidBody,
                        height: 1.45,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: kKidWhite.withValues(alpha: 0.75),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 7,
                      ),
                      child: Text(
                        cta,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: kKidTextStrong,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum KidChoicePalette {
  play(
    [Color(0xFFD1FAE5), Color(0xFFA7F3D0)],
    Color(0xFF6EE7B7),
    Color(0x9910B981),
  ),
  learn(
    [Color(0xFFDBEAFE), Color(0xFFBFDBFE)],
    Color(0xFF93C5FD),
    Color(0x993B82F6),
  ),
  puzzle(
    [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
    Color(0xFFFCD34D),
    Color(0x99F59E0B),
  );

  const KidChoicePalette(this.colors, this.base, this.glow);
  final List<Color> colors;
  final Color base;
  final Color glow;
}

/// Piece tile of the "Meet the pieces" grid and of the trainer sidebar.
class KidPieceCard extends StatelessWidget {
  const KidPieceCard({
    super.key,
    required this.piece,
    required this.label,
    required this.tapLabel,
    required this.onTap,
    this.compact = false,
  });

  final KidPiece piece;
  final String label;
  final String tapLabel;
  final VoidCallback onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: const Alignment(0.6, 1),
          colors: [kKidWhite, piece.tint],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: kKidWhite, width: 3),
        boxShadow: const [
          BoxShadow(color: kKidSlateShadow, offset: Offset(0, 7)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: 12,
              vertical: compact ? 12 : 16,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  piece.emoji,
                  style: const TextStyle(fontSize: 21, height: 1.2),
                ),
                kidSvg(
                  kidPieceAsset(piece.image),
                  compact ? 46 : 66,
                  compact ? 46 : 66,
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: kKidText,
                    height: 1.25,
                  ),
                ),
                if (!compact)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: kKidWhite.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 3,
                        ),
                        child: Text(
                          tapLabel,
                          style: const TextStyle(
                            color: kKidViolet,
                            fontWeight: FontWeight.w800,
                            fontSize: 12.5,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Numbered "how to play" card.
class KidStepCard extends StatelessWidget {
  const KidStepCard({
    super.key,
    required this.number,
    required this.emoji,
    required this.text,
  });

  final int number;
  final String emoji;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(18, 22, 18, 20),
          decoration: BoxDecoration(
            color: kKidWhite,
            borderRadius: BorderRadius.circular(22),
            boxShadow: const [
              BoxShadow(color: Color(0x4094A3B8), offset: Offset(0, 6)),
            ],
          ),
          child: Column(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 30, height: 1.2)),
              const SizedBox(height: 6),
              Text(
                text,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: kKidBody,
                  fontSize: 15,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
        Positioned(
          top: -10,
          left: -6,
          child: Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              color: kKidPurple,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: kKidPurpleDeep, offset: Offset(0, 3)),
              ],
            ),
            child: Text(
              '$number',
              style: const TextStyle(
                color: kKidWhite,
                fontWeight: FontWeight.w800,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Section heading + sub copy.
class KidSectionTitle extends StatelessWidget {
  const KidSectionTitle({
    super.key,
    required this.title,
    this.subtitle,
    this.center = false,
  });

  final String title;
  final String? subtitle;
  final bool center;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: center
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        Text(
          title,
          textAlign: center ? TextAlign.center : TextAlign.start,
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: kKidText,
            height: 1.25,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            textAlign: center ? TextAlign.center : TextAlign.start,
            style: const TextStyle(
              fontSize: 15,
              color: kKidMuted,
              height: 1.45,
            ),
          ),
        ],
      ],
    );
  }
}

/// Purple frame around a board, like the kids cm-chessboard border.
class KidBoardFrame extends StatelessWidget {
  const KidBoardFrame({super.key, required this.child, this.coach = false});

  final Widget child;

  /// Yellow frame: the piece the child is practising.
  final bool coach;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: coach ? const Color(0xFFFBBF24) : kKidBoardBorder,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: (coach ? const Color(0xFFF59E0B) : kKidBoardBorder)
                .withValues(alpha: 0.5),
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(borderRadius: BorderRadius.circular(12), child: child),
    );
  }
}

/// 5x5 teaching grid: piece on the centre square, green dots for moves, pink
/// ring for captures.
class KidMiniBoard extends StatefulWidget {
  const KidMiniBoard({
    super.key,
    required this.piece,
    this.enemyPawnLabel = '',
  });

  final KidPiece piece;
  final String enemyPawnLabel;

  @override
  State<KidMiniBoard> createState() => _KidMiniBoardState();
}

class _KidMiniBoardState extends State<KidMiniBoard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: kKidBoardBorder, width: 4),
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(color: Color(0x80A78BFA), offset: Offset(0, 6)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: AspectRatio(
        aspectRatio: 1,
        child: AnimatedBuilder(
          animation: _pulse,
          builder: (context, _) {
            final wave = _pulse.value;
            return Column(
              children: [
                for (var row = 0; row < kidPieceGridSize; row++)
                  Expanded(
                    child: Row(
                      children: [
                        for (var col = 0; col < kidPieceGridSize; col++)
                          Expanded(child: _square(col, row, wave)),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _square(int col, int row, double wave) {
    final center = isCenterSquare(col, row);
    final capture = widget.piece.isCaptureSquare(col, row);
    final move = widget.piece.isMoveSquare(col, row);
    final dark = (row + col) % 2 == 1;

    final background = center
        ? const Color(0xFFFEF08A)
        : dark
        ? const Color(0xFFC4B5FD)
        : const Color(0xFFFFF7CC);

    return LayoutBuilder(
      builder: (context, constraints) {
        final side = constraints.maxWidth;
        return Container(
          color: background,
          foregroundDecoration: center
              ? BoxDecoration(
                  border: Border.all(
                    color: kKidAmber,
                    width: (side * 0.075).clamp(2.0, 6.0),
                  ),
                  borderRadius: BorderRadius.circular(2),
                )
              : null,
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (center)
                Transform.translate(
                  offset: Offset(0, -side * 0.05 * wave),
                  child: Transform.scale(
                    scale: 1 + 0.05 * wave,
                    child: kidSvg(
                      kidPieceAsset(widget.piece.image),
                      side * 0.78,
                      side * 0.78,
                    ),
                  ),
                ),
              if (!center && capture)
                Semantics(
                  label: widget.enemyPawnLabel,
                  child: kidSvg(
                    'assets/pieces/bp.svg',
                    side * 0.64,
                    side * 0.64,
                  ),
                ),
              if (!center && capture)
                Transform.scale(
                  scale: 0.92 + 0.14 * wave,
                  child: Opacity(
                    opacity: 0.7 + 0.3 * wave,
                    child: Container(
                      width: side * 0.74,
                      height: side * 0.74,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: kKidPink,
                          width: (side * 0.09).clamp(2.0, 6.0),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: kKidWhite.withValues(alpha: 0.75),
                            spreadRadius: 2.5,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              if (!center && move)
                Transform.scale(
                  scale: 0.85 + 0.35 * wave,
                  child: Opacity(
                    opacity: 0.7 + 0.3 * wave,
                    child: Container(
                      width: side * 0.32,
                      height: side * 0.32,
                      decoration: BoxDecoration(
                        color: kKidLearnGreen,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: kKidWhite.withValues(alpha: 0.75),
                            spreadRadius: 2.5,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// Green dot / pink ring legend under the mini board.
class KidMoveLegend extends StatelessWidget {
  const KidMoveLegend({
    super.key,
    required this.moveLabel,
    required this.captureLabel,
  });

  final String moveLabel;
  final String captureLabel;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 18,
      runSpacing: 6,
      children: [
        _item(
          Container(
            width: 12,
            height: 12,
            decoration: const BoxDecoration(
              color: kKidLearnGreen,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Color(0x4022C55E), spreadRadius: 2)],
            ),
          ),
          moveLabel,
        ),
        _item(
          Container(
            width: 15,
            height: 15,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: kKidPink, width: 3),
            ),
          ),
          captureLabel,
        ),
      ],
    );
  }

  Widget _item(Widget swatch, String label) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      swatch,
      const SizedBox(width: 6),
      Text(
        label,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: kKidSlate,
        ),
      ),
    ],
  );
}

/// "How it moves" / "How it captures" explainer boxes.
class KidInfoBox extends StatelessWidget {
  const KidInfoBox({
    super.key,
    required this.emoji,
    required this.title,
    required this.text,
    required this.capture,
  });

  final String emoji;
  final String title;
  final String text;
  final bool capture;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: capture ? const Color(0xFFFDF2F8) : const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: capture ? const Color(0xFFFBCFE8) : const Color(0xFFA7F3D0),
          width: 2,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 21, height: 1.1)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: kKidText,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  text,
                  style: const TextStyle(
                    fontSize: 13.5,
                    color: kKidSlate,
                    height: 1.4,
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

/// The web piece popup as a modal. Returns the piece when the child taps
/// "Try me!", null when it is simply closed.
Future<KidPiece?> showKidPiecePopup(
  BuildContext context, {
  required KidPiece piece,
  bool showTryMe = false,
}) {
  final language = context.read<LanguageService>();
  return showGeneralDialog<KidPiece?>(
    context: context,
    barrierDismissible: true,
    barrierLabel: language.kids('popup.close'),
    barrierColor: kKidText.withValues(alpha: 0.55),
    transitionDuration: const Duration(milliseconds: 320),
    pageBuilder: (dialogContext, _, _) =>
        _KidPieceDialog(piece: piece, showTryMe: showTryMe),
    transitionBuilder: (context, animation, _, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutBack,
      );
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.85, end: 1).animate(curved),
          child: child,
        ),
      );
    },
  );
}

class _KidPieceDialog extends StatelessWidget {
  const _KidPieceDialog({required this.piece, required this.showTryMe});

  final KidPiece piece;
  final bool showTryMe;

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final label = language.pieceLabel(piece.name);

    return PopScope(
      canPop: true,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Container(
              padding: const EdgeInsets.fromLTRB(22, 24, 22, 20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [kKidWhite, Color(0xFFFDF2F8), Color(0xFFEEF2FF)],
                  stops: [0, 0.55, 1],
                ),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: kKidWhite, width: 4),
                boxShadow: [
                  const BoxShadow(
                    color: Color(0xD9C4B5FD),
                    offset: Offset(0, 16),
                  ),
                  BoxShadow(
                    color: kKidText.withValues(alpha: 0.5),
                    blurRadius: 70,
                    offset: const Offset(0, 40),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 44),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Halo(
                              child: kidSvg(
                                kidPieceAsset(piece.image),
                                88,
                                88,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    piece.emoji,
                                    style: const TextStyle(
                                      fontSize: 20,
                                      height: 1.2,
                                    ),
                                  ),
                                  Text(
                                    label,
                                    style: const TextStyle(
                                      fontSize: 27,
                                      fontWeight: FontWeight.w800,
                                      color: kKidText,
                                      height: 1.2,
                                    ),
                                  ),
                                  Text(
                                    language.pieceCopy(piece.name, 'tip'),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: kKidMuted,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: kKidWhite,
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0xFFF3E8FF),
                              spreadRadius: 3,
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 320),
                              child: KidMiniBoard(
                                piece: piece,
                                enemyPawnLabel: language.kids(
                                  'popup.enemyPawn',
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            KidMoveLegend(
                              moveLabel: language.kids('popup.canMoveHere'),
                              captureLabel: language.kids(
                                'popup.canCaptureHere',
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      KidInfoBox(
                        emoji: '🟢',
                        title: language.kids('popup.howItMoves'),
                        text: language.pieceCopy(piece.name, 'moveText'),
                        capture: false,
                      ),
                      const SizedBox(height: 12),
                      KidInfoBox(
                        emoji: '🎯',
                        title: language.kids('popup.howItCaptures'),
                        text: language.pieceCopy(piece.name, 'captureText'),
                        capture: true,
                      ),
                      const SizedBox(height: 16),
                      if (showTryMe) ...[
                        KidDialogButton(
                          label: language.kids('popup.tryMe'),
                          onTap: () => Navigator.of(context).pop(piece),
                        ),
                        const SizedBox(height: 10),
                      ],
                      KidDialogButton(
                        label: language.kids('popup.gotIt'),
                        outline: showTryMe,
                        onTap: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Semantics(
                      button: true,
                      label: language.kids('popup.close'),
                      child: Material(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(999),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(999),
                          onTap: () => Navigator.of(context).pop(),
                          child: Container(
                            width: 38,
                            height: 38,
                            alignment: Alignment.center,
                            decoration: const BoxDecoration(
                              color: kKidCream,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Color(0xFFFCD34D),
                                  offset: Offset(0, 3),
                                ),
                              ],
                            ),
                            child: const Text(
                              '✕',
                              style: TextStyle(
                                color: kKidBrown,
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Full-width dialog action, green/cyan or a white outline variant.
class KidDialogButton extends StatelessWidget {
  const KidDialogButton({
    super.key,
    required this.label,
    required this.onTap,
    this.outline = false,
    this.pink = false,
  });

  final String label;
  final VoidCallback? onTap;
  final bool outline;

  /// Violet/pink gradient instead of green/cyan.
  final bool pink;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          gradient: outline
              ? null
              : LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: pink
                      ? [kKidPurple, kKidPink]
                      : [kKidLearnGreen, const Color(0xFF06B6D4)],
                ),
          color: outline ? kKidWhite : null,
          borderRadius: BorderRadius.circular(16),
          border: outline
              ? Border.all(color: const Color(0xFFDDD6FE), width: 2)
              : null,
          boxShadow: [
            BoxShadow(
              color: outline
                  ? const Color(0xFFDDD6FE)
                  : pink
                  ? kKidPurpleDeep
                  : const Color(0xFF15803D),
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: outline ? kKidPurpleDeep : kKidWhite,
            fontWeight: FontWeight.w800,
            fontSize: 17,
            height: 1.3,
          ),
        ),
      ),
    );
  }
}

/// Radial yellow/pink halo behind the featured piece.
class _Halo extends StatelessWidget {
  const _Halo({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  Color(0xFFFDE68A),
                  Color(0xFFFBCFE8),
                  Colors.transparent,
                ],
                stops: [0, 0.55, 0.72],
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

/// The kids header row: logo, nav pills, language picker, grown-ups exit.
class KidHeader extends StatelessWidget {
  const KidHeader({
    super.key,
    required this.languages,
    required this.selectedLanguage,
    required this.onLanguage,
    required this.onLogo,
    required this.onPlay,
    required this.onLearn,
    required this.onGrownUps,
    this.playLabel,
    this.learnLabel,
    this.grownUpsLabel,
    this.grownUpsTooltip,
  });

  final List<AppLanguage> languages;

  /// Language code of the active locale.
  final String selectedLanguage;
  final ValueChanged<String> onLanguage;
  final VoidCallback onLogo;
  final VoidCallback onPlay;
  final VoidCallback onLearn;
  final VoidCallback onGrownUps;
  final String? playLabel;
  final String? learnLabel;
  final String? grownUpsLabel;
  final String? grownUpsTooltip;

  @override
  Widget build(BuildContext context) {
    final selected = languages.firstWhere(
      (item) => item.code == selectedLanguage,
      orElse: () => languages.first,
    );

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        _logo(),
        KidPill(label: playLabel ?? '', onTap: onPlay),
        KidPill(label: learnLabel ?? '', onTap: onLearn),
        KidPill(
          label: selected.name,
          child: KidLanguagePicker(
            languages: languages,
            selected: selectedLanguage,
            onSelected: onLanguage,
          ),
        ),
        Tooltip(
          message: grownUpsTooltip ?? '',
          child: KidPill(
            label: grownUpsLabel ?? '',
            emoji: '🏠',
            color: kKidBrown,
            background: kKidCream,
            onTap: onGrownUps,
          ),
        ),
      ],
    );
  }

  Widget _logo() {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onLogo,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 42,
                height: 42,
                padding: const EdgeInsets.all(5),
                decoration: const BoxDecoration(
                  color: kKidWhite,
                  borderRadius: BorderRadius.all(Radius.circular(14)),
                  boxShadow: [
                    BoxShadow(color: Color(0xFFC084FC), offset: Offset(0, 4)),
                  ],
                ),
                child: SvgPicture.asset(
                  'assets/logo/knight-dark.svg',
                  width: 32,
                  height: 32,
                  // Never let an asset problem escape: knight logo → piece →
                  // emoji horse, so the header always renders something.
                  errorBuilder: (context, error, stack) => kidSvg(
                    'assets/pieces/wn.svg',
                    32,
                    32,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'CheckMe ',
                style: TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w700,
                  color: kKidText,
                ),
              ),
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [kKidPink, kKidPurple, Color(0xFF3B82F6)],
                ).createShader(bounds),
                child: const Text(
                  'Kids',
                  style: TextStyle(
                    color: kKidWhite,
                    fontWeight: FontWeight.w800,
                    fontSize: 21,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The 🌍 language pill used by the kids pages; the web equivalent is the
/// `select` in the kids header. Menu values are language codes.
class KidLanguagePicker extends StatelessWidget {
  const KidLanguagePicker({
    super.key,
    required this.languages,
    required this.selected,
    required this.onSelected,
  });

  final List<AppLanguage> languages;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final active = languages.firstWhere(
      (item) => item.code == selected,
      orElse: () => languages.first,
    );

    return PopupMenuButton<String>(
      initialValue: active.code,
      onSelected: onSelected,
      color: kKidWhite,
      itemBuilder: (context) => [
        for (final language in languages)
          PopupMenuItem<String>(
            value: language.code,
            child: Text(
              language.name,
              style: const TextStyle(
                color: kKidText,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('🌍', style: TextStyle(fontSize: 15, height: 1.2)),
          const SizedBox(width: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 140),
            child: Text(
              active.name,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: kKidSlate,
                fontWeight: FontWeight.w800,
                fontSize: 14,
                height: 1.2,
              ),
            ),
          ),
          const Icon(Icons.arrow_drop_down_rounded, color: kKidSlate, size: 20),
        ],
      ),
    );
  }
}

/// Repeats a CSS-like loop, e.g. 0% → 50% → 100% of a keyframe animation.
class KidLoop extends StatefulWidget {
  const KidLoop({
    super.key,
    required this.period,
    required this.builder,
    this.reverse = true,
  });

  final Duration period;

  /// When false the timeline restarts at 1.0 instead of bouncing back, matching
  /// the linear CSS keyframes.
  final bool reverse;
  final Widget Function(BuildContext context, double t) builder;

  @override
  State<KidLoop> createState() => _KidLoopState();
}

class _KidLoopState extends State<KidLoop> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: widget.period,
  );

  @override
  void initState() {
    super.initState();
    _controller.repeat(reverse: widget.reverse);
  }

  @override
  void didUpdateWidget(covariant KidLoop oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.period != widget.period) _controller.duration = widget.period;
    if (oldWidget.reverse != widget.reverse && _controller.isAnimating) {
      _controller
        ..stop()
        ..repeat(reverse: widget.reverse);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!kidsMotionEnabled(context)) {
      if (_controller.isAnimating) _controller.stop();
      return widget.builder(context, 0);
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => widget.builder(context, _controller.value),
    );
  }
}

/// The title emoji animation: `title-wiggle` / `buddy-wiggle` rotate -6° → 6°
/// and grow to 1.12 at the top of each cycle.
class KidWiggle extends StatelessWidget {
  const KidWiggle({
    super.key,
    required this.child,
    this.period = const Duration(milliseconds: 2600),
  });

  final Widget child;
  final Duration period;

  @override
  Widget build(BuildContext context) {
    return KidLoop(
      period: period,
      builder: (context, t) {
        final wave = math.sin(t * math.pi);
        return Transform.rotate(
          angle: (-6 + 12 * wave) * math.pi / 180,
          alignment: Alignment.center,
          child: Transform.scale(scale: 1 + 0.12 * wave, child: child),
        );
      },
    );
  }
}
