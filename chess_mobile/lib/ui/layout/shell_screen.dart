import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/theme_service.dart';
import '../../core/theme/app_theme.dart';
import '../../routing/app_router.dart' show isLocationActive;
import '../widgets/cm.dart';

/// App chrome: dark toolbar + navigation drawer, the mobile counterpart of the
/// web shell (brand, Kids Mode pill, language, theme toggle, account menu;
/// grouped Play / Train / Review navigation with promo card and footer).
class ShellScreen extends StatelessWidget {
  const ShellScreen({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final auth = context.watch<AuthService>();
    final language = context.watch<LanguageService>();
    final location = GoRouterState.of(context).uri.path;
    // The web toolbar is wide; phones only keep the essentials and fold the
    // Kids pill / auth links into compact controls.
    final compact = MediaQuery.sizeOf(context).width < 720;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 4,
        title: const _Brand(),
        actions: [
          if (compact)
            IconButton(
              tooltip: language.t('nav.kids'),
              icon: const Icon(Icons.child_care_rounded, size: 22),
              onPressed: () => context.go('/kids'),
            )
          else
            const _KidsPill(),
          // Language menu.
          _LanguageMenu(language: language),
          // Theme toggle.
          IconButton(
            tooltip: context.watch<ThemeService>().isDark
                ? language.t('nav.themeToLight')
                : language.t('nav.themeToDark'),
            icon: Icon(
              context.watch<ThemeService>().isDark ? Icons.light_mode : Icons.dark_mode,
              size: 21,
            ),
            onPressed: () => context.read<ThemeService>().toggle(),
          ),
          if (auth.isAuthenticated)
            _AccountMenu(auth: auth, language: language)
          else if (compact)
            _GuestMenu(language: language)
          else ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
              child: TextButton(
                onPressed: () => context.go('/auth/login'),
                child: Text(language.t('nav.login')),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 12, top: 10, bottom: 10),
              child: CmPrimaryButton(
                small: true,
                label: language.t('nav.signup'),
                onPressed: () => context.go('/auth/register'),
              ),
            ),
          ],
        ],
      ),
      drawer: _AppDrawer(location: location),
      body: Stack(
        children: [
          AppTheme.background(cm),
          SafeArea(bottom: false, child: child),
        ],
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/'),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF60A5FA), Color(0xFF2563EB)]),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text('♞', style: TextStyle(color: Colors.white, fontSize: 19)),
          ),
          const SizedBox(width: 9),
          Text(
            'CheckMe',
            style: context.tt.titleLarge?.copyWith(
              color: const Color(0xFFF8FAFC),
              fontWeight: FontWeight.w800,
              fontSize: 19,
            ),
          ),
        ],
      ),
    );
  }
}

class _KidsPill extends StatelessWidget {
  const _KidsPill();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 2),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () => context.go('/kids'),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFBBF24).withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.6)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('🧒', style: TextStyle(fontSize: 13)),
                SizedBox(width: 6),
                Text(
                  'Kids Mode',
                  style: TextStyle(
                    color: Color(0xFFFDE68A),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
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

/// Compact guest menu used on narrow phones where the two auth buttons don't
/// fit in the toolbar.
class _GuestMenu extends StatelessWidget {
  const _GuestMenu({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: language.t('nav.login'),
      icon: const Icon(Icons.person_outline_rounded, size: 22),
      onSelected: (value) {
        if (value == 'login') context.go('/auth/login');
        if (value == 'signup') context.go('/auth/register');
      },
      itemBuilder: (context) => [
        PopupMenuItem<String>(
          value: 'login',
          child: ListTile(
            leading: const Icon(Icons.login_rounded, size: 20),
            title: Text(language.t('nav.login')),
            contentPadding: EdgeInsets.zero,
            dense: true,
          ),
        ),
        PopupMenuItem<String>(
          value: 'signup',
          child: ListTile(
            leading: const Icon(Icons.person_add_alt_1_rounded, size: 20),
            title: Text(language.t('nav.signup')),
            contentPadding: EdgeInsets.zero,
            dense: true,
          ),
        ),
      ],
    );
  }
}

class _LanguageMenu extends StatelessWidget {
  const _LanguageMenu({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: language.t('nav.language'),
      icon: const Icon(Icons.translate, size: 20),
      onSelected: (code) => language.setLanguage(code),
      itemBuilder: (context) => [
        for (final item in language.languages)
          PopupMenuItem<String>(
            value: item.code,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (item.code == language.code)
                  Icon(Icons.check, size: 16, color: context.cm.primary)
                else
                  const SizedBox(width: 16),
                const SizedBox(width: 8),
                Text(item.name),
              ],
            ),
          ),
      ],
    );
  }
}

class _AccountMenu extends StatelessWidget {
  const _AccountMenu({required this.auth, required this.language});

  final AuthService auth;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final name = auth.userDisplayName ?? language.t('nav.chessPlayer');

    return PopupMenuButton<String>(
      tooltip: name,
      onSelected: (value) {
        switch (value) {
          case 'dashboard':
            context.go('/dashboard');
          case 'play':
            context.go('/play');
          case 'review':
            context.go('/analysis');
          case 'logout':
            auth.logout();
            context.go('/auth/login');
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem<String>(
          enabled: false,
          child: Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: cm.primary,
                foregroundColor: Colors.white,
                child: Text(
                  auth.currentUser?.initials ?? '?',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(name,
                        style: const TextStyle(fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
                    Text(
                      auth.currentUser?.email ?? '',
                      style: TextStyle(fontSize: 11.5, color: cm.muted),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem<String>(
          value: 'dashboard',
          child: ListTile(
            leading: const Icon(Icons.dashboard_outlined, size: 20),
            title: Text(language.t('nav.dashboard')),
            contentPadding: EdgeInsets.zero,
            dense: true,
          ),
        ),
        PopupMenuItem<String>(
          value: 'play',
          child: ListTile(
            leading: const Icon(Icons.sports_esports_outlined, size: 20),
            title: Text(language.t('nav.play')),
            contentPadding: EdgeInsets.zero,
            dense: true,
          ),
        ),
        PopupMenuItem<String>(
          value: 'review',
          child: ListTile(
            leading: const Icon(Icons.insights_outlined, size: 20),
            title: Text(language.t('nav.review')),
            contentPadding: EdgeInsets.zero,
            dense: true,
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem<String>(
          value: 'logout',
          child: ListTile(
            leading: Icon(Icons.logout, size: 20, color: cm.danger),
            title: Text(language.t('nav.logout'), style: TextStyle(color: cm.danger)),
            contentPadding: EdgeInsets.zero,
            dense: true,
          ),
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: CircleAvatar(
          radius: 15,
          backgroundColor: const Color(0xFF60A5FA),
          foregroundColor: Colors.white,
          child: Text(
            auth.currentUser?.initials ?? '?',
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.location});

  final String location;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final language = context.watch<LanguageService>();
    final auth = context.watch<AuthService>();

    Widget item({
      required IconData icon,
      required String label,
      required String path,
    }) {
      final active = isLocationActive(location, path);
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              Navigator.of(context).pop();
              context.go(path);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                gradient: active && !cm.isDark
                    ? const LinearGradient(
                        colors: [Color(0xFFE8F1FF), Color(0xFFF3F8FF)],
                      )
                    : null,
                color: active && cm.isDark ? cm.primarySoft : null,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(icon,
                      size: 20,
                      color: active
                          ? cm.primary
                          : cm.isDark
                              ? cm.inkSoft
                              : const Color(0xFF334155)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      label,
                      style: tt.bodyLarge?.copyWith(
                        color: active
                            ? cm.primaryDark
                            : cm.isDark
                                ? cm.inkSoft
                                : const Color(0xFF334155),
                        fontWeight: active ? FontWeight.w700 : FontWeight.w500,
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

    return Drawer(
      backgroundColor: cm.isDark ? cm.surface : const Color(0xFFFFFFFF),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(right: Radius.circular(20)),
      ),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 20),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF60A5FA), Color(0xFF2563EB)]),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: const Text('♞', style: TextStyle(color: Colors.white, fontSize: 21)),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('CheckMe',
                          style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                      Text(
                        language.t('nav.studio'),
                        style: TextStyle(fontSize: 11.5, color: cm.muted),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (!auth.isAuthenticated) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 4),
                child: CmPrimaryButton(
                  label: language.t('nav.login'),
                  expanded: true,
                  onPressed: () {
                    Navigator.of(context).pop();
                    context.go('/auth/login');
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 6, 14, 4),
                child: CmSecondaryButton(
                  label: language.t('nav.signup'),
                  expanded: true,
                  onPressed: () {
                    Navigator.of(context).pop();
                    context.go('/auth/register');
                  },
                ),
              ),
            ],
            CmNavSectionLabel(language.t('nav.playSection')),
            item(icon: Icons.home_outlined, label: language.t('nav.home'), path: '/'),
            item(icon: Icons.dashboard_outlined, label: language.t('nav.dashboard'), path: '/dashboard'),
            item(icon: Icons.sports_esports_outlined, label: language.t('nav.play'), path: '/play'),
            CmNavSectionLabel(language.t('nav.trainSection')),
            item(icon: Icons.extension_outlined, label: language.t('nav.puzzles'), path: '/puzzles'),
            item(icon: Icons.menu_book_outlined, label: language.t('nav.openings'), path: '/openings'),
            item(icon: Icons.school_outlined, label: language.t('nav.learn'), path: '/learn'),
            CmNavSectionLabel(language.t('nav.reviewSection')),
            item(icon: Icons.insights_outlined, label: language.t('nav.review'), path: '/analysis'),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 18, 14, 0),
              child: CmPanel(
                padding: const EdgeInsets.all(16),
                color: cm.isDark ? cm.primarySoft : const Color(0xFFEFF6FF),
                border: cm.isDark ? cm.line : const Color(0xFFBFDBFE),
                shadow: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      language.t('nav.readyTitle'),
                      style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      language.t('nav.readyText'),
                      style: tt.bodySmall?.copyWith(color: cm.inkSoft, height: 1.45),
                    ),
                    const SizedBox(height: 12),
                    CmPrimaryButton(
                      label: language.t('nav.startPlaying'),
                      onPressed: () {
                        Navigator.of(context).pop();
                        context.go('/play');
                      },
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: Text(
                  language.t('nav.footer'),
                  style: TextStyle(
                    color: cm.mutedLight,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
