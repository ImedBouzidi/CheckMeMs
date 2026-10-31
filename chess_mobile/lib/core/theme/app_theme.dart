import 'package:flutter/material.dart';

/// Design tokens of the CheckMe product, ported from the CSS custom properties
/// (`--cm-*`) in `chess-web/src/styles.scss`, so the mobile app carries the
/// same visual identity: azure primary, slate ink, soft panels, 10–24px radii.
class CmColors {
  const CmColors({
    required this.brightness,
    required this.bg,
    required this.bgDeep,
    required this.surface,
    required this.surfaceMuted,
    required this.ink,
    required this.inkSoft,
    required this.muted,
    required this.mutedLight,
    required this.line,
    required this.lineStrong,
    required this.primary,
    required this.primaryDark,
    required this.primarySoft,
    required this.gold,
    required this.goldSoft,
    required this.goldBorder,
    required this.success,
    required this.successSoft,
    required this.successBorder,
    required this.danger,
    required this.dangerSoft,
    required this.dangerBorder,
    required this.toolbar,
    required this.toolbarInk,
    required this.boardFrame,
  });

  final Brightness brightness;

  /// Page background (the web body gradient washes over this).
  final Color bg;
  final Color bgDeep;
  final Color surface;
  final Color surfaceMuted;
  final Color ink;
  final Color inkSoft;
  final Color muted;
  final Color mutedLight;
  final Color line;
  final Color lineStrong;
  final Color primary;
  final Color primaryDark;
  final Color primarySoft;
  final Color gold;
  final Color goldSoft;
  final Color goldBorder;
  final Color success;
  final Color successSoft;
  final Color successBorder;
  final Color danger;
  final Color dangerSoft;
  final Color dangerBorder;

  /// Dark slate app bar used in both themes (web shell chrome).
  final Color toolbar;
  final Color toolbarInk;
  final Color boardFrame;

  bool get isDark => brightness == Brightness.dark;

  /// Accent color per tone name used by tiles/tags: blue|gold|green|slate.
  Color accent(String tone) => switch (tone) {
        'gold' => gold,
        'success' || 'green' => success,
        'danger' => danger,
        'slate' => muted,
        _ => primary,
      };

  Color accentSoft(String tone) => switch (tone) {
        'gold' => goldSoft,
        'success' || 'green' => successSoft,
        'danger' => dangerSoft,
        'slate' => surfaceMuted,
        _ => primarySoft,
      };
}

/// Light palette (default `:root` block of styles.scss).
const CmColors cmLight = CmColors(
  brightness: Brightness.light,
  bg: Color(0xFFF3F6FB),
  bgDeep: Color(0xFFE9EEF7),
  surface: Color(0xFFFFFFFF),
  surfaceMuted: Color(0xFFF8FAFC),
  ink: Color(0xFF122033),
  inkSoft: Color(0xFF334155),
  muted: Color(0xFF64748B),
  mutedLight: Color(0xFF94A3B8),
  line: Color(0xFFE2E8F0),
  lineStrong: Color(0xFFCBD5E1),
  primary: Color(0xFF2563EB),
  primaryDark: Color(0xFF1D4ED8),
  primarySoft: Color(0xFFEFF6FF),
  gold: Color(0xFFB7791F),
  goldSoft: Color(0xFFFFFBEB),
  goldBorder: Color(0xFFFDE68A),
  success: Color(0xFF047857),
  successSoft: Color(0xFFECFDF5),
  successBorder: Color(0xFFA7F3D0),
  danger: Color(0xFFB91C1C),
  dangerSoft: Color(0xFFFEF2F2),
  dangerBorder: Color(0xFFFECACA),
  toolbar: Color(0xF20F172A),
  toolbarInk: Color(0xFFF8FAFC),
  boardFrame: Color(0xFFFFFFFF),
);

/// Dark palette (`html.dark-theme` overrides of styles.scss).
const CmColors cmDark = CmColors(
  brightness: Brightness.dark,
  bg: Color(0xFF0B1220),
  bgDeep: Color(0xFF080F1B),
  surface: Color(0xFF111C2E),
  surfaceMuted: Color(0xFF16233A),
  ink: Color(0xFFE8EEFC),
  inkSoft: Color(0xFFB9C6DE),
  muted: Color(0xFF94A3B8),
  mutedLight: Color(0xFF64748B),
  line: Color(0xFF24324A),
  lineStrong: Color(0xFF334155),
  primary: Color(0xFF60A5FA),
  primaryDark: Color(0xFF3B82F6),
  primarySoft: Color(0xFF172554),
  gold: Color(0xFFFBBF24),
  goldSoft: Color(0xFF2A2110),
  goldBorder: Color(0xFF78550E),
  success: Color(0xFF34D399),
  successSoft: Color(0xFF0C2B21),
  successBorder: Color(0xFF065F46),
  danger: Color(0xFFF87171),
  dangerSoft: Color(0xFF35151A),
  dangerBorder: Color(0xFF7F1D1D),
  toolbar: Color(0xF20F172A),
  toolbarInk: Color(0xFFF8FAFC),
  boardFrame: Color(0xFF111C2E),
);

/// Theme extension carrying [CmColors]; access through `context.cm`.
class CmColorsExtension extends ThemeExtension<CmColorsExtension> {
  const CmColorsExtension(this.colors);

  final CmColors colors;

  @override
  CmColorsExtension copyWith({CmColors? colors}) => CmColorsExtension(colors ?? this.colors);

  @override
  CmColorsExtension lerp(ThemeExtension<CmColorsExtension>? other, double t) {
    if (other is! CmColorsExtension) return this;
    return t < 0.5 ? this : other;
  }
}

extension CmTheme on BuildContext {
  /// The CheckMe palette for the active theme.
  CmColors get cm => Theme.of(this).extension<CmColorsExtension>()!.colors;

  /// Shortcut to the Roboto text theme.
  TextTheme get tt => Theme.of(this).textTheme;
}

/// Corner radii (styles.scss `--cm-radius*`).
class CmRadius {
  static const double sm = 10;
  static const double md = 16;
  static const double lg = 24;
}

/// Shared shadow recipes (slate-tinted, layered like the web box-shadows).
class CmShadow {
  static List<BoxShadow> sm(CmColors cm) => [
        BoxShadow(color: cm.ink.withValues(alpha: 0.05), blurRadius: 6, offset: const Offset(0, 1)),
      ];

  static List<BoxShadow> md(CmColors cm) => [
        BoxShadow(color: cm.ink.withValues(alpha: 0.06), blurRadius: 14, offset: const Offset(0, 4)),
        BoxShadow(color: cm.ink.withValues(alpha: 0.04), blurRadius: 3, offset: const Offset(0, 1)),
      ];

  static List<BoxShadow> lg(CmColors cm) => [
        BoxShadow(color: cm.ink.withValues(alpha: 0.10), blurRadius: 30, offset: const Offset(0, 12)),
        BoxShadow(color: cm.ink.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 3)),
      ];
}

/// Builds the light or dark [ThemeData] for the app.
class AppTheme {
  AppTheme._();

  static ThemeData light() => _build(cmLight);
  static ThemeData dark() => _build(cmDark);

  static ThemeData _build(CmColors cm) {
    final scheme = ColorScheme(
      brightness: cm.brightness,
      primary: cm.primary,
      onPrimary: Colors.white,
      primaryContainer: cm.primarySoft,
      onPrimaryContainer: cm.primaryDark,
      secondary: cm.gold,
      onSecondary: Colors.white,
      secondaryContainer: cm.goldSoft,
      onSecondaryContainer: cm.gold,
      tertiary: cm.success,
      onTertiary: Colors.white,
      tertiaryContainer: cm.successSoft,
      onTertiaryContainer: cm.success,
      error: cm.danger,
      onError: Colors.white,
      errorContainer: cm.dangerSoft,
      onErrorContainer: cm.danger,
      surface: cm.surface,
      onSurface: cm.ink,
      onSurfaceVariant: cm.muted,
      surfaceContainerHighest: cm.surfaceMuted,
      surfaceContainerHigh: cm.surfaceMuted,
      surfaceContainerLow: cm.surface,
      surfaceContainer: cm.surface,
      outline: cm.lineStrong,
      outlineVariant: cm.line,
      shadow: const Color(0xFF000000),
      scrim: const Color(0x66000000),
      inverseSurface: cm.ink,
      onInverseSurface: cm.surface,
      inversePrimary: cm.primarySoft,
    );

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: 'Roboto',
      scaffoldBackgroundColor: Colors.transparent,
      splashFactory: InkRipple.splashFactory,
    );

    final textTheme = base.textTheme.apply(
      bodyColor: cm.ink,
      displayColor: cm.ink,
      fontSizeFactor: 1.0,
    );

    return base.copyWith(
      textTheme: textTheme,
      extensions: [CmColorsExtension(cm)],
      appBarTheme: AppBarTheme(
        backgroundColor: cm.toolbar,
        foregroundColor: cm.toolbarInk,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        toolbarHeight: 60,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          color: cm.toolbarInk,
          fontWeight: FontWeight.w700,
          fontSize: 20,
          letterSpacing: -0.2,
        ),
        iconTheme: IconThemeData(color: cm.toolbarInk),
      ),
      cardTheme: CardThemeData(
        color: cm.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(CmRadius.md),
          side: BorderSide(color: cm.line),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: cm.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.lg)),
        titleTextStyle: textTheme.titleLarge?.copyWith(color: cm.ink, fontWeight: FontWeight.w700),
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: cm.inkSoft, height: 1.5),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: cm.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(CmRadius.lg)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: cm.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: cm.surfaceMuted,
          disabledForegroundColor: cm.mutedLight,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 15),
          minimumSize: const Size(0, 48),
          textStyle: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600, fontSize: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: cm.inkSoft,
          side: BorderSide(color: cm.lineStrong),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          minimumSize: const Size(0, 46),
          textStyle: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600, fontSize: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: cm.primary,
          textStyle: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: cm.surfaceMuted,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        hintStyle: textTheme.bodyLarge?.copyWith(color: cm.mutedLight),
        labelStyle: textTheme.bodyMedium?.copyWith(color: cm.muted),
        floatingLabelStyle: textTheme.bodyMedium?.copyWith(color: cm.primary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CmRadius.sm),
          borderSide: BorderSide(color: cm.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CmRadius.sm),
          borderSide: BorderSide(color: cm.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CmRadius.sm),
          borderSide: BorderSide(color: cm.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CmRadius.sm),
          borderSide: BorderSide(color: cm.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CmRadius.sm),
          borderSide: BorderSide(color: cm.danger, width: 1.6),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: cm.surfaceMuted,
        selectedColor: cm.primarySoft,
        labelStyle: textTheme.labelMedium?.copyWith(color: cm.inkSoft),
        side: BorderSide(color: cm.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),
      dividerTheme: DividerThemeData(color: cm.line, thickness: 1, space: 1),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: cm.ink,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: cm.surface),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: cm.primary,
        linearTrackColor: cm.line,
        circularTrackColor: cm.line,
      ),
      listTileTheme: ListTileThemeData(
        iconColor: cm.muted,
        textColor: cm.ink,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.sm)),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? Colors.white : cm.mutedLight,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? cm.primary : cm.line,
        ),
      ),
      sliderTheme: base.sliderTheme.copyWith(
        activeTrackColor: cm.primary,
        thumbColor: cm.primary,
        inactiveTrackColor: cm.line,
        overlayColor: cm.primary.withValues(alpha: 0.12),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: cm.primary,
        unselectedLabelColor: cm.muted,
        indicatorColor: cm.primary,
        dividerColor: cm.line,
      ),
      timePickerTheme: TimePickerThemeData(
        backgroundColor: cm.surface,
        hourMinuteColor: cm.surfaceMuted,
        dayPeriodColor: cm.surfaceMuted,
        dialHandColor: cm.primary,
        dialBackgroundColor: cm.surfaceMuted,
      ),
    );
  }

  /// The page background: the web body's fixed radial + linear gradient wash.
  static Widget background(CmColors cm) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: cm.isDark
              ? const [Color(0xFF0D1524), Color(0xFF080F1B)]
              : [cm.bgDeep, cm.bg],
        ),
      ),
      child: const SizedBox.expand(),
    );
  }
}
