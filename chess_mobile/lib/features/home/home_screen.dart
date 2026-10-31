import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/services/auth_service.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/cm.dart';

/// Home page, mirroring `chess-web/src/app/features/home/home.component.ts`:
/// hero, tools grid and the kids-mode strip.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final auth = context.watch<AuthService>();
    final cm = context.cm;
    final tt = context.tt;

    return CmPage(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Hero(language: language),
          const SizedBox(height: 26),
          _SectionHeading(
            title: language.t('home.toolsTitle'),
            copy: language.t('home.toolsCopy'),
            actionLabel: language.t('home.openPlayHub'),
            onAction: () => context.go(AppRoutes.play),
          ),
          const SizedBox(height: 6),
          _FeatureCard(
            tone: 'blue',
            icon: Icons.sports_esports_rounded,
            tag: language.t('home.playTag'),
            title: language.t('home.playTitle'),
            text: language.t('home.playText'),
            cta: language.t('home.playCta'),
            meta: language.t('home.playMeta'),
            primaryCta: true,
            onTap: () => context.go(AppRoutes.play),
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            tone: 'gold',
            icon: Icons.extension_rounded,
            tag: language.t('home.puzzlesTag'),
            title: language.t('home.puzzlesTitle'),
            text: language.t('home.puzzlesText'),
            cta: language.t('home.puzzlesCta'),
            onTap: () => context.go(AppRoutes.puzzles),
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            tone: 'slate',
            icon: Icons.auto_stories_rounded,
            tag: language.t('home.openingsTag'),
            title: language.t('home.openingsTitle'),
            text: language.t('home.openingsText'),
            cta: language.t('home.openingsCta'),
            onTap: () => context.go(AppRoutes.openings),
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            tone: 'green',
            icon: Icons.insights_rounded,
            tag: language.t('home.reviewTag'),
            title: language.t('home.reviewTitle'),
            text: language.t('home.reviewText'),
            cta: language.t('home.reviewCta'),
            onTap: () => context.go(AppRoutes.analysis),
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            tone: 'slate',
            icon: Icons.school_rounded,
            tag: language.t('home.learnTag'),
            title: language.t('home.learnTitle'),
            text: language.t('home.learnText'),
            cta: language.t('home.learnCta'),
            onTap: () => context.go(AppRoutes.learn),
          ),
          const SizedBox(height: 22),
          _KidsStrip(language: language, signedIn: auth.isAuthenticated),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0xFFBFDBFE).withValues(alpha: 0.8)),
        gradient: RadialGradient(
          center: const Alignment(0.9, -1),
          radius: 1.4,
          colors: [
            const Color(0xFFBFDBFE).withValues(alpha: cm.isDark ? 0.18 : 0.72),
            cm.isDark ? const Color(0xFF111C2E) : Colors.white,
          ],
        ),
        boxShadow: CmShadow.lg(cm),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CmEyebrow(language.t('home.eyebrow')),
          const SizedBox(height: 14),
          Text.rich(
            TextSpan(
              style: tt.displaySmall?.copyWith(
                fontWeight: FontWeight.w800,
                height: 1.02,
                letterSpacing: -2.2,
                color: cm.ink,
              ),
              children: [
                TextSpan(text: '${language.t('home.titleA')}\n'),
                TextSpan(
                  text: language.t('home.titleB'),
                  style: TextStyle(
                    foreground: Paint()
                      ..shader = const LinearGradient(
                        colors: [Color(0xFF1D4ED8), Color(0xFF2563EB), Color(0xFF0E7490)],
                      ).createShader(const Rect.fromLTWH(0, 0, 280, 64)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Text(
              language.t('home.subtitle'),
              style: tt.bodyLarge?.copyWith(color: cm.inkSoft, height: 1.65),
            ),
          ),
          const SizedBox(height: 22),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              CmPrimaryButton(
                label: language.t('home.startGame'),
                icon: Icons.play_arrow_rounded,
                onPressed: () => context.go(AppRoutes.play),
              ),
              CmSecondaryButton(
                label: language.t('home.reviewGame'),
                icon: Icons.insights_rounded,
                onPressed: () => context.go(AppRoutes.analysis),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              _point(context, language.t('home.point1')),
              _point(context, language.t('home.point2')),
              _point(context, language.t('home.point3')),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: cm.primarySoft,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: cm.primary.withValues(alpha: 0.25)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.memory_rounded, size: 16, color: cm.primary),
                const SizedBox(width: 8),
                Text(
                  '${language.t('home.engineReady')} · ${language.t('home.engineSub')}',
                  style: tt.labelMedium?.copyWith(color: cm.primary, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _point(BuildContext context, String text) {
    final cm = context.cm;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.check_circle_rounded, size: 16, color: cm.success),
        const SizedBox(width: 6),
        Text(
          text,
          style: context.tt.labelMedium?.copyWith(color: cm.inkSoft, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.title,
    required this.copy,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String copy;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
              TextButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.arrow_forward_rounded, size: 17),
                label: Text(actionLabel!),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(copy, style: context.tt.bodyMedium?.copyWith(color: context.cm.muted, height: 1.5)),
      ],
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
    required this.tone,
    required this.icon,
    required this.tag,
    required this.title,
    required this.text,
    required this.cta,
    required this.onTap,
    this.meta,
    this.primaryCta = false,
  });

  final String tone;
  final IconData icon;
  final String tag;
  final String title;
  final String text;
  final String cta;
  final String? meta;
  final bool primaryCta;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return CmPanel(
      onTap: onTap,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CmIconTile(icon, tone: tone),
              const SizedBox(width: 10),
              CmTag(tag, tone: tone),
              const Spacer(),
              Icon(Icons.arrow_forward_rounded, size: 18, color: cm.mutedLight),
            ],
          ),
          const SizedBox(height: 14),
          Text(title, style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(text, style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.55)),
          const SizedBox(height: 16),
          Row(
            children: [
              primaryCta
                  ? CmPrimaryButton(label: cta, icon: Icons.arrow_forward_rounded, onPressed: onTap)
                  : CmSecondaryButton(label: cta, onPressed: onTap),
              if (meta != null) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    meta!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _KidsStrip extends StatelessWidget {
  const _KidsStrip({required this.language, required this.signedIn});

  final LanguageService language;
  final bool signedIn;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: cm.goldSoft,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: cm.goldBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: cm.gold.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(Icons.child_care_rounded, color: cm.gold, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CmEyebrow(language.t('home.kidsLabel'), color: cm.gold),
                    const SizedBox(height: 6),
                    Text(
                      language.t('home.kidsTitle'),
                      style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      language.t('home.kidsText'),
                      style: tt.bodyMedium?.copyWith(color: cm.inkSoft, height: 1.55),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              CmPrimaryButton(
                label: language.t('home.kidsCta'),
                icon: Icons.arrow_forward_rounded,
                onPressed: () => context.go(AppRoutes.kids),
              ),
              if (signedIn)
                CmSecondaryButton(
                  label: language.t('nav.dashboard'),
                  icon: Icons.grid_view_rounded,
                  onPressed: () => context.go(AppRoutes.dashboard),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
