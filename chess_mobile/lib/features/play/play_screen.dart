import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/engine.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/cm.dart';

/// Options chosen in the "Play vs Stockfish" dialog.
class BotGameSetup {
  const BotGameSetup({
    required this.color,
    required this.skillLevel,
    required this.timeControl,
  });

  /// `white`, `black` or `random`.
  final String color;
  final int skillLevel;
  final String timeControl;
}

/// Play hub, mirroring `chess-web/src/app/features/play/play.component.ts`.
class PlayScreen extends StatelessWidget {
  const PlayScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;

    return CmPage(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CmSectionHeader(
            eyebrow: language.t('play.eyebrow'),
            title: language.t('play.title'),
            copy: language.t('play.subtitle'),
            actions: CmSecondaryButton(
              label: language.t('play.reviewGame'),
              icon: Icons.insights_rounded,
              onPressed: () => context.go(AppRoutes.analysis),
            ),
          ),
          const SizedBox(height: 8),

          // Engine card.
          CmPanel(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: cm.successSoft,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: cm.success.withValues(alpha: 0.35)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.circle, size: 8, color: cm.success),
                          const SizedBox(width: 6),
                          Text(
                            language.t('play.engineStatus'),
                            style: tt.labelSmall?.copyWith(
                              color: cm.success,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  language.t('play.engineTitle'),
                  style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 620),
                  child: Text(
                    language.t('play.engineText'),
                    style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.55),
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    _chip(context, Icons.tune_rounded, language.t('play.levels')),
                    _chip(context, Icons.speed_rounded, language.t('play.clock')),
                    _chip(context, Icons.undo_rounded, language.t('play.takebacks')),
                    _chip(context, Icons.lightbulb_rounded, language.t('play.hints')),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    CmPrimaryButton(
                      label: language.t('play.setup'),
                      icon: Icons.tune_rounded,
                      onPressed: () => _openSetup(context),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '${language.t('play.casualElo')} · ~${skillToElo(5)}',
                        style: tt.labelMedium?.copyWith(color: cm.mutedLight),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // More ways to play.
          Text(
            language.t('play.moreTitle'),
            style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            language.t('play.moreCopy'),
            style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.5),
          ),
          const SizedBox(height: 14),
          CmPanel(
            onTap: () => context.go(AppRoutes.gameLocal),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CmIconTile(Icons.grid_view_rounded, tone: 'green'),
                    const SizedBox(width: 10),
                    CmTag(language.t('play.localTag'), tone: 'green'),
                    const Spacer(),
                    Icon(Icons.arrow_forward_rounded, size: 18, color: cm.mutedLight),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  language.t('play.localTitle'),
                  style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(
                  language.t('play.localText'),
                  style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.55),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    CmPrimaryButton(
                      small: true,
                      label: language.t('play.localCta'),
                      onPressed: () => context.go(AppRoutes.gameLocal),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      language.t('play.localMeta'),
                      style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _ComingSoonCard(
            tag: language.t('play.friendTag'),
            title: language.t('play.friendTitle'),
            text: language.t('play.friendText'),
            cta: language.t('play.friendCta'),
            meta: language.t('play.friendMeta'),
            icon: Icons.link_rounded,
          ),
          const SizedBox(height: 12),
          _ComingSoonCard(
            tag: language.t('play.onlineTag'),
            title: language.t('play.onlineTitle'),
            text: language.t('play.onlineText'),
            cta: language.t('play.onlineCta'),
            meta: language.t('play.onlineMeta'),
            icon: Icons.public_rounded,
          ),
          const SizedBox(height: 16),
          CmNote(language.t('play.note'), tone: 'slate', icon: Icons.info_outline_rounded),
        ],
      ),
    );
  }

  Widget _chip(BuildContext context, IconData icon, String label) {
    final cm = context.cm;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: cm.primary),
        const SizedBox(width: 6),
        Text(
          label,
          style: context.tt.labelMedium?.copyWith(
            color: cm.inkSoft,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Future<void> _openSetup(BuildContext context) async {
    final setup = await showBotSetupDialog(context);
    if (setup == null || !context.mounted) return;
    final uri = Uri(
      path: AppRoutes.gameBot,
      queryParameters: {
        'skill': '${setup.skillLevel}',
        'time': setup.timeControl,
        'color': setup.color,
      },
    );
    context.go(uri.toString());
  }
}

class _ComingSoonCard extends StatelessWidget {
  const _ComingSoonCard({
    required this.tag,
    required this.title,
    required this.text,
    required this.cta,
    required this.meta,
    required this.icon,
  });

  final String tag;
  final String title;
  final String text;
  final String cta;
  final String meta;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final language = context.watch<LanguageService>();
    return CmPanel(
      padding: const EdgeInsets.all(20),
      color: cm.surfaceMuted,
      shadow: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CmIconTile(icon, tone: 'gold'),
              const SizedBox(width: 10),
              CmTag(tag, tone: 'gold'),
            ],
          ),
          const SizedBox(height: 14),
          Text(title, style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(text, style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.55)),
          const SizedBox(height: 16),
          Row(
            children: [
              CmSecondaryButton(label: cta, onPressed: null),
              const SizedBox(width: 10),
              Text(
                meta.isEmpty ? language.t('common.inDevelopment') : meta,
                style: tt.labelSmall?.copyWith(color: cm.mutedLight),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Bottom sheet replicating the web `PlayVsBotDialogComponent`.
Future<BotGameSetup?> showBotSetupDialog(BuildContext context) {
  return showModalBottomSheet<BotGameSetup>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => const _BotSetupSheet(),
  );
}

class _BotSetupSheet extends StatefulWidget {
  const _BotSetupSheet();

  @override
  State<_BotSetupSheet> createState() => _BotSetupSheetState();
}

class _BotSetupSheetState extends State<_BotSetupSheet> {
  String _color = 'white';
  int _skill = 5;
  String _timeControl = 'unlimited';

  static const List<({String value, String labelKey, String descKey, IconData icon})> _colors = [
    (value: 'white', labelKey: 'dialog.white', descKey: 'dialog.whiteDesc', icon: Icons.light_mode_rounded),
    (value: 'black', labelKey: 'dialog.black', descKey: 'dialog.blackDesc', icon: Icons.dark_mode_rounded),
    (value: 'random', labelKey: 'dialog.random', descKey: 'dialog.randomDesc', icon: Icons.casino_rounded),
  ];

  static const List<({String value, String labelKey, String descKey, IconData icon})> _times = [
    (value: 'unlimited', labelKey: 'dialog.unlimited', descKey: 'dialog.noClock', icon: Icons.all_inclusive_rounded),
    (value: '1+0', labelKey: 'bot.type.bullet', descKey: 'dialog.bullet', icon: Icons.flash_on_rounded),
    (value: '3+0', labelKey: 'bot.type.blitz', descKey: 'dialog.blitz', icon: Icons.bolt_rounded),
    (value: '5+0', labelKey: 'bot.type.blitz', descKey: 'dialog.blitz', icon: Icons.bolt_rounded),
    (value: '10+0', labelKey: 'bot.type.rapid', descKey: 'dialog.rapid', icon: Icons.hourglass_bottom_rounded),
    (value: '15+10', labelKey: 'bot.type.rapid', descKey: 'dialog.rapid', icon: Icons.hourglass_bottom_rounded),
  ];

  String _bandKey(int skill) => switch (skill) {
        <= 3 => 'dialog.band.beginner',
        <= 8 => 'dialog.band.casual',
        <= 13 => 'dialog.band.club',
        <= 17 => 'dialog.band.advanced',
        _ => 'dialog.band.master',
      };

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  language.t('dialog.title'),
                  style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  language.t('dialog.subtitle'),
                  style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.5),
                ),
                const SizedBox(height: 20),

                // Side.
                _sectionTitle(context, language.t('dialog.chooseSide')),
                Text(
                  language.t('dialog.randomHint'),
                  style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    for (final option in _colors) ...[
                      Expanded(
                        child: _selectCard(
                          selected: _color == option.value,
                          icon: option.icon,
                          title: language.t(option.labelKey),
                          subtitle: language.t(option.descKey),
                          onTap: () => setState(() => _color = option.value),
                        ),
                      ),
                      if (option != _colors.last) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 20),

                // Strength.
                Row(
                  children: [
                    Expanded(
                      child: _sectionTitle(context, language.t('dialog.botStrength')),
                    ),
                    Text(
                      '${language.t(_bandKey(_skill))} · ${language.t('dialog.level', {'level': _skill})}',
                      style: tt.labelMedium?.copyWith(color: cm.primary, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                Text(
                  language.t('dialog.elo', {'elo': skillToElo(_skill)}),
                  style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                ),
                Slider(
                  value: _skill.toDouble(),
                  min: 0,
                  max: 20,
                  divisions: 20,
                  label: '${language.t(_bandKey(_skill))} · ~${skillToElo(_skill)}',
                  onChanged: (value) => setState(() => _skill = value.round()),
                ),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final preset in const [1, 5, 10, 15, 20])
                      ChoiceChip(
                        label: Text('${language.t('dialog.band.${_bandSuffix(preset)}')} · Lvl $preset'),
                        selected: _skill == preset,
                        onSelected: (_) => setState(() => _skill = preset),
                      ),
                  ],
                ),
                const SizedBox(height: 20),

                // Time control.
                _sectionTitle(context, language.t('dialog.timeControl')),
                Text(
                  language.t('dialog.timeHint'),
                  style: tt.labelSmall?.copyWith(color: cm.mutedLight),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final option in _times)
                      ChoiceChip(
                        avatar: Icon(
                          option.icon,
                          size: 16,
                          color: _timeControl == option.value ? Colors.white : cm.muted,
                        ),
                        label: Text(
                          option.value == 'unlimited'
                              ? language.t(option.labelKey)
                              : '${option.value} ${language.t(option.labelKey)}',
                        ),
                        selected: _timeControl == option.value,
                        onSelected: (_) => setState(() => _timeControl = option.value),
                      ),
                  ],
                ),
                const SizedBox(height: 24),

                CmPrimaryButton(
                  label: language.t('dialog.startGame'),
                  icon: Icons.play_arrow_rounded,
                  onPressed: () {
                    final color = _color == 'random'
                        ? (DateTime.now().millisecondsSinceEpoch.isEven ? 'white' : 'black')
                        : _color;
                    Navigator.of(context).pop(
                      BotGameSetup(color: color, skillLevel: _skill, timeControl: _timeControl),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _bandSuffix(int skill) => switch (skill) {
        1 => 'beginner',
        5 => 'casual',
        10 => 'club',
        15 => 'advanced',
        _ => 'master',
      };

  Widget _sectionTitle(BuildContext context, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text(
          text,
          style: context.tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
      );

  Widget _selectCard({
    required bool selected,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    final cm = context.cm;
    final tt = context.tt;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(CmRadius.md),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? cm.primarySoft : cm.surface,
          borderRadius: BorderRadius.circular(CmRadius.md),
          border: Border.all(
            color: selected ? cm.primary : cm.lineStrong,
            width: selected ? 1.6 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: selected ? cm.primary : cm.muted),
            const SizedBox(height: 8),
            Text(
              title,
              style: tt.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: selected ? cm.primary : cm.inkSoft,
              ),
            ),
            Text(
              subtitle,
              style: tt.labelSmall?.copyWith(color: cm.muted),
            ),
          ],
        ),
      ),
    );
  }
}
