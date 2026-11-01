import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/analysis.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/move_analysis_api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../routing/app_router.dart';
import '../../ui/board/chess_board_view.dart';
import '../../ui/widgets/cm.dart';

/// Analysis / review screen, mirroring
/// `chess-web/src/app/features/analysis/analysis.component.ts`.
///
/// Phase 2 ships the marketing start state plus a functional report view
/// (progress, board replay, move list and summary). Phase 4 will extend it with
/// the evaluation graph, key-moment jumping and the full parity styling.
class AnalysisScreen extends StatefulWidget {
  const AnalysisScreen({super.key});

  @override
  State<AnalysisScreen> createState() => _AnalysisScreenState();
}

class _AnalysisScreenState extends State<AnalysisScreen> {
  String? _requestId;
  String? _gameId;
  String _side = 'white';
  bool _paramsRead = false;
  Stream<AnalysisReport>? _stream;
  int? _selectedIndex;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_paramsRead) return;
    _paramsRead = true;

    final params = GoRouterState.of(context).uri.queryParameters;
    _requestId = params['requestId'] ?? params['id'];
    _gameId = params['gameId'];
    _side = params['side'] == 'black' ? 'black' : 'white';

    final api = context.read<MoveAnalysisApiService>();
    if (_requestId != null) {
      _stream = api.watch(_requestId!);
    } else if (_gameId != null) {
      _stream = api.watchByGameId(_gameId!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;
    final hasRequest = _requestId != null || _gameId != null;

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
                        Icon(Icons.insights_rounded, size: 15, color: cm.primaryDark),
                        const SizedBox(width: 6),
                        CmEyebrow(language.t('analysis.eyebrow')),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      hasRequest
                          ? language.t('analysis.reviewTitle')
                          : language.t('analysis.title'),
                      style: tt.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        height: 1.02,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      language.t('analysis.subtitle'),
                      style: tt.bodyLarge?.copyWith(color: cm.inkSoft, height: 1.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              if (hasRequest)
                CmSecondaryButton(
                  small: true,
                  label: language.t('analysis.newGame'),
                  icon: Icons.sports_esports_rounded,
                  onPressed: () => context.go(AppRoutes.play),
                )
              else
                CmTag(language.t('common.inDevelopment'), tone: 'gold'),
            ],
          ),
          const SizedBox(height: 24),
          if (!hasRequest)
            _StartState(language: language)
          else
            _buildReportArea(language),
        ],
      ),
    );
  }

  Widget _buildReportArea(LanguageService language) {
    return StreamBuilder<AnalysisReport>(
      stream: _stream,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _FailedState(
            language: language,
            needsSignIn: !context.read<AuthService>().isAuthenticated,
          );
        }
        final report = snapshot.data;
        if (report == null) {
          return _ProgressCard(language: language, report: null);
        }
        if (report.status == AnalysisJobStatus.failed) {
          return _FailedState(language: language, needsSignIn: false);
        }
        if (report.status != AnalysisJobStatus.completed) {
          return _ProgressCard(language: language, report: report);
        }
        return _ReportView(
          report: report,
          side: _side,
          selectedIndex: _selectedIndex,
          onSelect: (index) => setState(() => _selectedIndex = index),
          language: language,
        );
      },
    );
  }
}

/* -------------------------------- start state -------------------------------- */

class _StartState extends StatelessWidget {
  const _StartState({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 900;
            final importPanel = _ImportPanel(language: language);
            final preview = _ReviewPreview(language: language);
            if (!wide) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [importPanel, const SizedBox(height: 18), preview],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(flex: 27, child: importPanel),
                const SizedBox(width: 22),
                Expanded(flex: 23, child: preview),
              ],
            );
          },
        ),
        const SizedBox(height: 34),
        CmSectionHeader(title: language.t('analysis.featuresTitle')),
        const SizedBox(height: 6),
        _FeatureGrid(language: language),
      ],
    );
  }
}

class _ImportPanel extends StatelessWidget {
  const _ImportPanel({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return CmPanel(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: cm.surfaceMuted,
              border: Border.all(color: cm.line),
              borderRadius: BorderRadius.circular(CmRadius.md),
            ),
            child: Column(
              children: [
                CmIconTile(Icons.upload_file_rounded, size: 54, iconSize: 26),
                const SizedBox(height: 14),
                Text(
                  language.t('analysis.import'),
                  style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  language.t('analysis.importText'),
                  textAlign: TextAlign.center,
                  style: tt.bodySmall?.copyWith(color: cm.muted, height: 1.5),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    CmPrimaryButton(
                      small: true,
                      label: language.t('analysis.choosePgn'),
                      onPressed: null,
                    ),
                    CmSecondaryButton(
                      small: true,
                      label: language.t('analysis.savedGames'),
                      onPressed: null,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          CmNote(
            language.t('analysis.botHint'),
            tone: 'blue',
            icon: Icons.info_outline_rounded,
          ),
        ],
      ),
    );
  }
}

class _ReviewPreview extends StatelessWidget {
  const _ReviewPreview({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final rows = [
      ('01', 0.86, 'analysis.best', 'green'),
      ('02', 0.52, 'analysis.book', 'blue'),
      ('03', 0.28, 'analysis.miss', 'danger'),
    ];

    return CmPanel(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CmEyebrow(language.t('analysis.reportEyebrow')),
                    const SizedBox(height: 8),
                    Text(
                      language.t('analysis.reportTitle'),
                      style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              CmTag(language.t('common.preview')),
            ],
          ),
          const SizedBox(height: 20),
          for (final row in rows) ...[
            Row(
              children: [
                SizedBox(
                  width: 24,
                  child: Text(
                    row.$1,
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: cm.mutedLight,
                    ),
                  ),
                ),
                Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: FractionallySizedBox(
                      widthFactor: row.$2,
                      child: Container(
                        height: 7,
                        decoration: BoxDecoration(
                          color: cm.accent(row.$4).withValues(alpha: 0.35),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                CmTag(language.t(row.$3), tone: row.$4, dense: true),
              ],
            ),
            const SizedBox(height: 10),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _PreviewStat(
                  label: language.t('analysis.accuracy'),
                  value: language.t('analysis.comingSoon'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _PreviewStat(
                  label: language.t('analysis.keyMoments'),
                  value: language.t('analysis.moveByMove'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PreviewStat extends StatelessWidget {
  const _PreviewStat({required this.label, required this.value});

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
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: TextStyle(
              color: cm.inkSoft,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

/* ------------------------------- progress state ------------------------------ */

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.language, required this.report});

  final LanguageService language;
  final AnalysisReport? report;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final moves = report?.moves.length ?? 0;
    final expected = report?.moveCount ?? 0;
    final percent = expected > 0 ? (moves / expected * 100).clamp(0, 100).toDouble() : null;
    final recent = report?.moves ?? const <ReviewedMove>[];

    return CmPanel(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CmIconTile(Icons.memory_rounded, tone: 'blue', size: 46),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CmEyebrow(language.t('analysis.progress.eyebrow')),
                    const SizedBox(height: 6),
                    Text(
                      language.t('analysis.progress.titleGrading'),
                      style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      language.t('analysis.progress.subtitle'),
                      style: tt.bodySmall?.copyWith(color: cm.muted, height: 1.5),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: percent,
              minHeight: 6,
              backgroundColor: cm.line,
              color: cm.primary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                language.t('analysis.progress.movesDone', {'done': moves}),
                style: tt.bodySmall?.copyWith(color: cm.muted),
              ),
              if (percent != null)
                Text(
                  '${percent.round()}%',
                  style: tt.bodySmall?.copyWith(color: cm.muted),
                ),
            ],
          ),
          if (recent.isNotEmpty) ...[
            const SizedBox(height: 18),
            Text(
              language.t('analysis.progress.latest'),
              style: tt.labelMedium?.copyWith(
                color: cm.muted,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            for (final move in recent.reversed.take(4))
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _moveLabel(move),
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: cm.inkSoft,
                        ),
                      ),
                    ),
                    _GradeBadge(grade: move.grade, language: language, dense: true),
                    const SizedBox(width: 8),
                    Text(
                      _evalText(move.evalAfterCp, move.evalAfterMate),
                      style: TextStyle(fontSize: 11, color: cm.muted),
                    ),
                  ],
                ),
              ),
          ] else ...[
            const SizedBox(height: 16),
            CmNote(
              language.t('analysis.progress.waiting'),
              tone: 'blue',
              icon: Icons.hourglass_top_rounded,
            ),
          ],
        ],
      ),
    );
  }
}

class _FailedState extends StatelessWidget {
  const _FailedState({required this.language, required this.needsSignIn});

  final LanguageService language;
  final bool needsSignIn;

  @override
  Widget build(BuildContext context) {
    return CmEmptyState(
      icon: needsSignIn ? Icons.lock_rounded : Icons.cloud_off_rounded,
      tone: 'danger',
      title: language.t('analysis.reportTitle'),
      text: language.t(needsSignIn ? 'bot.analysis.needSignIn' : 'analysis.failed'),
      actionLabel: needsSignIn ? language.t('nav.login') : null,
      onAction: needsSignIn
          ? () => context.go(AppRoutes.login(returnTo: '/analysis'))
          : null,
    );
  }
}

/* --------------------------------- report ----------------------------------- */

class _ReportView extends StatelessWidget {
  const _ReportView({
    required this.report,
    required this.side,
    required this.selectedIndex,
    required this.onSelect,
    required this.language,
  });

  final AnalysisReport report;
  final String side;
  final int? selectedIndex;
  final ValueChanged<int> onSelect;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final playerMoves = report.moves
        .where((move) => move.color == side)
        .toList(growable: false);
    final allMoves = report.moves;
    if (allMoves.isEmpty) {
      return CmEmptyState(
        icon: Icons.insights_rounded,
        title: language.t('analysis.reportTitle'),
        text: language.t('analysis.failed'),
      );
    }

    final index = selectedIndex != null && selectedIndex! >= 0 && selectedIndex! < allMoves.length
        ? selectedIndex!
        : allMoves.length - 1;
    final selected = allMoves[index];
    final summary = report.summary;
    final opening = playerOpening(report.opening, side);

    final boardColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: AspectRatio(
              aspectRatio: 1,
              child: ChessBoardView(
                fen: selected.fenAfter.isEmpty ? selected.fenBefore : selected.fenAfter,
                orientationWhite: side == 'white',
                showCoordinates: true,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            IconButton(
              onPressed: index > 0 ? () => onSelect(index - 1) : null,
              icon: const Icon(Icons.chevron_left_rounded),
              tooltip: language.t('analysis.prev'),
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    language.t('analysis.moveCounter', {
                      'current': index + 1,
                      'total': allMoves.length,
                    }),
                    style: TextStyle(fontSize: 12, color: context.cm.muted),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${language.t('analysis.yourMoves')} · ${side == 'white' ? language.t('common.white') : language.t('common.black')}',
                    style: TextStyle(fontSize: 11, color: context.cm.mutedLight),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: index < allMoves.length - 1 ? () => onSelect(index + 1) : null,
              icon: const Icon(Icons.chevron_right_rounded),
              tooltip: language.t('analysis.next'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _EvalCard(move: selected, language: language),
      ],
    );

    final sideColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (opening != null) ...[
          CmPanel(
            padding: const EdgeInsets.all(14),
            radius: CmRadius.md,
            child: Row(
              children: [
                Icon(Icons.menu_book_rounded, size: 18, color: context.cm.primary),
                const SizedBox(width: 8),
                CmTag(language.t(opening.labelKey), tone: 'blue', dense: true),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${opening.eco} · ${opening.name}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: context.cm.inkSoft,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        _SummaryCards(report: report, summary: summary, language: language),
        const SizedBox(height: 12),
        _GradeLegend(moves: playerMoves, language: language),
        const SizedBox(height: 12),
        CmPanel(
          padding: const EdgeInsets.all(14),
          radius: CmRadius.md,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                language.t('analysis.yourMoves'),
                style: TextStyle(
                  color: context.cm.muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              for (var i = 0; i < allMoves.length; i++)
                _MoveLine(
                  move: allMoves[i],
                  selected: i == index,
                  language: language,
                  onTap: () => onSelect(i),
                ),
            ],
          ),
        ),
      ],
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 900) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              boardColumn,
              const SizedBox(height: 18),
              sideColumn,
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: 27, child: boardColumn),
            const SizedBox(width: 22),
            Expanded(flex: 23, child: sideColumn),
          ],
        );
      },
    );
  }
}

class _EvalCard extends StatelessWidget {
  const _EvalCard({required this.move, required this.language});

  final ReviewedMove move;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return CmPanel(
      padding: const EdgeInsets.all(14),
      radius: CmRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                _moveLabel(move),
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: cm.inkSoft,
                ),
              ),
              const Spacer(),
              _GradeBadge(grade: move.grade, language: language),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _EvalCell(
                  label: language.t('analysis.evalBefore'),
                  value: _evalText(move.evalBeforeCp, move.evalBeforeMate),
                ),
              ),
              Expanded(
                child: _EvalCell(
                  label: language.t('analysis.evalAfter'),
                  value: _evalText(move.evalAfterCp, move.evalAfterMate),
                ),
              ),
              Expanded(
                child: _EvalCell(
                  label: language.t('analysis.bestMove'),
                  value: move.bestMoveSan ?? '—',
                ),
              ),
              Expanded(
                child: _EvalCell(
                  label: language.t('analysis.cpLoss'),
                  value: '${move.cpLoss}',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EvalCell extends StatelessWidget {
  const _EvalCell({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: cm.mutedLight,
            fontSize: 9,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: cm.inkSoft,
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _SummaryCards extends StatelessWidget {
  const _SummaryCards({
    required this.report,
    required this.summary,
    required this.language,
  });

  final AnalysisReport report;
  final AnalysisSummary? summary;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final playerMoves = report.moves.where((m) => m.color == 'white').length;
    final avg = summary == null ? '—' : summary!.averageCpLoss.toStringAsFixed(1);
    final depth = summary == null ? '—' : '${summary!.depth}';

    Widget card(String label, String value) => Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: cm.surfaceMuted,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: cm.mutedLight,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: TextStyle(
                    color: cm.inkSoft,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        );

    return Row(
      children: [
        card(language.t('analysis.yourMoves'), '$playerMoves'),
        const SizedBox(width: 8),
        card(language.t('analysis.depthLabel'), depth),
        const SizedBox(width: 8),
        card(language.t('analysis.avgLoss'), avg),
      ],
    );
  }
}

class _GradeLegend extends StatelessWidget {
  const _GradeLegend({required this.moves, required this.language});

  final List<ReviewedMove> moves;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final counts = <MoveGrade, int>{};
    for (final move in moves) {
      counts[move.grade] = (counts[move.grade] ?? 0) + 1;
    }
    final entries = kMoveGrades.where((grade) => (counts[grade] ?? 0) > 0);

    if (entries.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final grade in entries)
          _GradeBadge(
            grade: grade,
            language: language,
            count: counts[grade],
          ),
      ],
    );
  }
}

class _MoveLine extends StatelessWidget {
  const _MoveLine({
    required this.move,
    required this.selected,
    required this.language,
    required this.onTap,
  });

  final ReviewedMove move;
  final bool selected;
  final LanguageService language;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Material(
      color: selected ? cm.primarySoft : Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            children: [
              SizedBox(
                width: 42,
                child: Text(
                  '${move.moveNumber}${move.color == 'white' ? '.' : '…'}',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: cm.mutedLight,
                  ),
                ),
              ),
              SizedBox(
                width: 54,
                child: Text(
                  move.san,
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: cm.inkSoft,
                  ),
                ),
              ),
              Expanded(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: _GradeBadge(grade: move.grade, language: language, dense: true),
                ),
              ),
              Text(
                _evalText(move.evalAfterCp, move.evalAfterMate),
                style: TextStyle(fontSize: 11, color: cm.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GradeBadge extends StatelessWidget {
  const _GradeBadge({
    required this.grade,
    required this.language,
    this.dense = false,
    this.count,
  });

  final MoveGrade grade;
  final LanguageService language;
  final bool dense;
  final int? count;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tone = _gradeTone(grade);
    final label = language.t('analysis.cls.${grade.name}');
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 6 : 8,
        vertical: dense ? 2 : 3,
      ),
      decoration: BoxDecoration(
        color: cm.accentSoft(tone),
        border: Border.all(color: cm.accent(tone).withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_gradeIcon(grade), size: dense ? 10 : 12, color: cm.accent(tone)),
          const SizedBox(width: 3),
          Text(
            count == null ? label : '$label · $count',
            style: TextStyle(
              color: cm.accent(tone),
              fontSize: dense ? 9.5 : 10.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureGrid extends StatelessWidget {
  const _FeatureGrid({required this.language});

  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    final cards = [
      _FeatureCard(
        icon: Icons.route_rounded,
        tone: 'blue',
        title: language.t('analysis.f1Title'),
        text: language.t('analysis.f1Text'),
      ),
      _FeatureCard(
        icon: Icons.show_chart_rounded,
        tone: 'gold',
        title: language.t('analysis.f2Title'),
        text: language.t('analysis.f2Text'),
      ),
      _FeatureCard(
        icon: Icons.auto_awesome_rounded,
        tone: 'green',
        title: language.t('analysis.f3Title'),
        text: language.t('analysis.f3Text'),
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

/* --------------------------------- helpers ---------------------------------- */

String _moveLabel(ReviewedMove move) =>
    '${move.moveNumber}${move.color == 'white' ? '.' : '…'}${move.san}';

String _evalText(int? cp, int? mate) {
  if (mate != null) {
    if (mate == 0) return '#';
    return mate > 0 ? '#$mate' : '#-${mate.abs()}';
  }
  if (cp == null) return '—';
  final pawns = cp / 100;
  final sign = pawns >= 0 ? '+' : '';
  return '$sign${pawns.toStringAsFixed(2)}';
}

String _gradeTone(MoveGrade grade) => switch (grade) {
      MoveGrade.brilliant || MoveGrade.great => 'gold',
      MoveGrade.good => 'green',
      MoveGrade.book || MoveGrade.forced => 'blue',
      MoveGrade.inaccuracy => 'gold',
      MoveGrade.mistake => 'danger',
      MoveGrade.blunder => 'danger',
    };

IconData _gradeIcon(MoveGrade grade) => switch (grade) {
      MoveGrade.brilliant => Icons.auto_awesome_rounded,
      MoveGrade.great => Icons.workspace_premium_rounded,
      MoveGrade.good => Icons.check_circle_rounded,
      MoveGrade.book => Icons.menu_book_rounded,
      MoveGrade.forced => Icons.push_pin_rounded,
      MoveGrade.inaccuracy => Icons.error_outline_rounded,
      MoveGrade.mistake => Icons.warning_amber_rounded,
      MoveGrade.blunder => Icons.dangerous_rounded,
    };
