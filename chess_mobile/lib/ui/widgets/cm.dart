import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Page container mirroring `.cm-page`: constrained width, generous padding
/// and the web app's fade/slide enter animation.
class CmPage extends StatelessWidget {
  const CmPage({super.key, required this.child, this.maxWidth = 1120, this.padding});

  final Widget child;
  final double maxWidth;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOut,
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(offset: Offset(0, 12 * (1 - value)), child: child),
      ),
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: padding ?? const EdgeInsets.fromLTRB(16, 20, 16, 40),
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// White (or dark) rounded card with border + soft shadow (`.cm-panel`).
class CmPanel extends StatelessWidget {
  const CmPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.radius = CmRadius.lg,
    this.color,
    this.border,
    this.shadow = true,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? color;
  final Color? border;
  final bool shadow;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? cm.surface.withValues(alpha: cm.isDark ? 1 : 0.92),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: border ?? cm.line),
        boxShadow: shadow ? CmShadow.md(cm) : null,
      ),
      child: child,
    );
    if (onTap == null) return card;
    return GestureDetector(onTap: onTap, child: card);
  }
}

/// Uppercase eyebrow label (`.cm-eyebrow`).
class CmEyebrow extends StatelessWidget {
  const CmEyebrow(this.text, {super.key, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: color ?? cm.primaryDark,
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.4,
      ),
    );
  }
}

/// Eyebrow + title + copy header used above sections (`.cm-section-header`).
class CmSectionHeader extends StatelessWidget {
  const CmSectionHeader({
    super.key,
    this.eyebrow,
    required this.title,
    this.copy,
    this.actions,
  });

  final String? eyebrow;
  final String title;
  final String? copy;
  final Widget? actions;

  @override
  Widget build(BuildContext context) {
    final tt = context.tt;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (eyebrow != null) ...[
            CmEyebrow(eyebrow!),
            const SizedBox(height: 8),
          ],
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.w700, height: 1.2),
                ),
              ),
              if (actions != null) actions!,
            ],
          ),
          if (copy != null) ...[
            const SizedBox(height: 8),
            Text(copy!, style: tt.bodyMedium?.copyWith(color: context.cm.muted, height: 1.5)),
          ],
        ],
      ),
    );
  }
}

/// Small pill label (`.cm-tag`).
class CmTag extends StatelessWidget {
  const CmTag(this.text, {super.key, this.tone = 'blue', this.icon, this.dense = false});

  final String text;

  /// blue | gold | green | slate | danger.
  final String tone;
  final IconData? icon;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final color = cm.accent(tone);
    final soft = cm.accentSoft(tone);
    return Container(
      padding: dense ? const EdgeInsets.symmetric(horizontal: 8, vertical: 3) : const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: soft,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: dense ? 12 : 14, color: color),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: dense ? 11 : 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Rounded icon tile (`.cm-icon-tile`), used across dashboards and lists.
class CmIconTile extends StatelessWidget {
  const CmIconTile(this.icon, {super.key, this.tone = 'blue', this.size = 44, this.iconSize});

  final IconData icon;

  /// blue | gold | green | slate | danger.
  final String tone;
  final double size;
  final double? iconSize;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: cm.accentSoft(tone),
        borderRadius: BorderRadius.circular(CmRadius.sm),
      ),
      child: Icon(icon, color: cm.accent(tone), size: iconSize ?? size * 0.5),
    );
  }
}

/// Primary pill button with the product's blue gradient.
class CmPrimaryButton extends StatelessWidget {
  const CmPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.expanded = false,
    this.loading = false,
    this.small = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expanded;
  final bool loading;

  /// Compact density (dashboard quick actions, inline CTAs).
  final bool small;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final enabled = onPressed != null && !loading;
    final button = DecoratedBox(
      decoration: BoxDecoration(
        gradient: enabled
            ? LinearGradient(
                colors: [cm.primary, cm.primaryDark],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: enabled ? null : cm.surfaceMuted,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: loading ? null : onPressed,
          borderRadius: BorderRadius.circular(999),
          child: Padding(
            padding: small
                ? const EdgeInsets.symmetric(horizontal: 15, vertical: 9)
                : const EdgeInsets.symmetric(horizontal: 24, vertical: 15),
            child: loading
                ? SizedBox(
                    width: small ? 15 : 20,
                    height: small ? 15 : 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (icon != null) ...[
                        Icon(
                          icon,
                          size: small ? 15 : 19,
                          color: enabled ? Colors.white : cm.mutedLight,
                        ),
                        const SizedBox(width: small ? 5 : 8),
                      ],
                      Text(
                        label,
                        style: TextStyle(
                          color: enabled ? Colors.white : cm.mutedLight,
                          fontWeight: FontWeight.w700,
                          fontSize: small ? 13 : 15,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
    if (!expanded) return button;
    return SizedBox(width: double.infinity, child: button);
  }
}

/// Outlined secondary pill button.
class CmSecondaryButton extends StatelessWidget {
  const CmSecondaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.expanded = false,
    this.small = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expanded;

  /// Compact density, pairing with [CmPrimaryButton.small].
  final bool small;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final button = OutlinedButton.icon(
      onPressed: onPressed,
      icon: icon == null ? const SizedBox.shrink() : Icon(icon, size: small ? 15 : 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: cm.inkSoft,
        side: BorderSide(color: cm.lineStrong),
        visualDensity: small ? VisualDensity.compact : VisualDensity.standard,
        textStyle: (small ? tt.labelMedium : tt.labelLarge)?.copyWith(fontWeight: FontWeight.w600),
      ),
    );
    if (!expanded) return button;
    return SizedBox(width: double.infinity, child: button);
  }
}

/// Gradient progress bar (`.cm-progress > .progress-track > span`).
class CmProgressBar extends StatelessWidget {
  const CmProgressBar({super.key, required this.percent, this.height = 8, this.gradient});

  /// 0–100.
  final double percent;
  final double height;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final clamped = percent.clamp(0, 100) / 100;
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: cm.line,
        borderRadius: BorderRadius.circular(999),
      ),
      child: FractionallySizedBox(
        alignment: AlignmentDirectional.centerStart,
        widthFactor: clamped == 0 ? 0.001 : clamped,
        child: Container(
          decoration: BoxDecoration(
            gradient: gradient ??
                const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF22C55E)]),
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ),
    );
  }
}

/// Info strip with icon (`.cm-note`).
class CmNote extends StatelessWidget {
  const CmNote(this.text, {super.key, this.tone = 'blue', this.icon});

  final String text;

  /// blue | gold | green | danger | slate.
  final String tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final color = cm.accent(tone);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cm.accentSoft(tone),
        borderRadius: BorderRadius.circular(CmRadius.sm),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon ?? Icons.info_outline, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: cm.inkSoft, fontSize: 13.5, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}

/// Centered empty state with icon, copy and CTA (`.cm-empty-state`).
class CmEmptyState extends StatelessWidget {
  const CmEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.text,
    this.actionLabel,
    this.onAction,
    this.tone = 'blue',
  });

  final IconData icon;
  final String title;
  final String text;
  final String? actionLabel;
  final VoidCallback? onAction;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CmIconTile(icon, tone: tone, size: 62, iconSize: 30),
            const SizedBox(height: 14),
            Text(title, style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(
              text,
              textAlign: TextAlign.center,
              style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.5),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              CmPrimaryButton(label: actionLabel!, onPressed: onAction),
            ],
          ],
        ),
      ),
    );
  }
}

/// Compact stat card: big value + label + icon (dashboard KPI tiles).
class CmStatCard extends StatelessWidget {
  const CmStatCard({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    this.tone = 'blue',
  });

  final IconData icon;
  final String value;
  final String label;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return CmPanel(
      padding: const EdgeInsets.all(14),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CmIconTile(icon, tone: tone, size: 36, iconSize: 18),
          const SizedBox(height: 12),
          Text(value, style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.w800, height: 1)),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: tt.bodySmall?.copyWith(color: cm.muted, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

/// Confirmation dialog mirroring the web `ConfirmDialog` (icon, title,
/// message, cancel/confirm, primary or danger tone).
Future<bool> showCmConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  String? confirmLabel,
  String? cancelLabel,
  IconData icon = Icons.help_outline,
  String tone = 'primary',
  String okLabel = 'OK',
  String cancelDefault = 'Cancel',
}) async {
  final cm = context.cm;
  final danger = tone == 'danger';
  final accent = danger ? cm.danger : cm.primary;

  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      icon: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: danger ? cm.dangerSoft : cm.primarySoft,
          borderRadius: BorderRadius.circular(CmRadius.sm),
        ),
        child: Icon(icon, color: accent, size: 26),
      ),
      title: Text(title, textAlign: TextAlign.center),
      content: Text(message, textAlign: TextAlign.center),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(cancelLabel ?? cancelDefault, style: TextStyle(color: cm.muted)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: accent),
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(confirmLabel ?? okLabel),
        ),
      ],
    ),
  );
  return result ?? false;
}

/// Styled snackbar (the web app's MatSnackBar equivalent).
void cmSnackBar(BuildContext context, String message, {bool error = false}) {
  final cm = context.cm;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(error ? Icons.error_outline : Icons.check_circle_outline,
                size: 18, color: error ? cm.danger : cm.success),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: cm.ink,
      ),
    );
}

/// Uppercase section label used in the navigation drawer.
class CmNavSectionLabel extends StatelessWidget {
  const CmNavSectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          color: context.cm.mutedLight,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

/// Formats milliseconds as `m:ss` (clocks).
String formatClock(Duration duration) {
  final minutes = duration.inMinutes;
  final seconds = duration.inSeconds % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}

/// Formats milliseconds with tenths below 20 s (`12.4`), like the web clocks.
String formatClockPrecise(Duration duration) {
  if (duration.inSeconds < 20) {
    final tenths = (duration.inMilliseconds % 1000) ~/ 100;
    return '${duration.inSeconds}.$tenths';
  }
  return formatClock(duration);
}
