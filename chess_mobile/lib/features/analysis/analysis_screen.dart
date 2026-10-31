import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/game_history.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/game_history_service.dart';
import '../../core/services/move_analysis_api_service.dart';
import '../../core/services/premium_service.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/cm.dart';

/// Analysis/review screen, mirroring `chess-web/src/app/features/analysis/analysis.component.ts`:
class AnalysisScreen extends StatefulWidget {
  const AnalysisScreen({super.key});

  @override
  State<AnalysisScreen> createState() => _AnalysisScreenState();
}

class _AnalysisScreenState extends State<AnalysisScreen> {
  // State mirroring the web AnalysisComponent
  String? _requestId;
  String? _side;
  int? _plies;
  String _status = '';
  String _progress = '';
  String _eval = '—';
  List<String> _moves = [];
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;

    // If we have a requestId from the route, try to load it
    final args = GoRouteState.of(context);
    final uri = args.uri;
    final params = uri.queryParameters;
    final requestIdFromRoute = params['requestId'] ?? params['id'];
    final sideFromRoute = params['side'];
    final pliesFromRoute = params['plies'];

    if (requestIdFromRoute != null) {
      _requestId = requestIdFromRoute;
      _side = sideFromRoute ?? 'white';
      _plies = int.tryParse(pliesFromRoute ?? '0');
    }

    return CmPage(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Page header
          Container(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: cm.line)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CmEyebrow(language.t('analysis.eyebrow')),
                      const SizedBox(height: 10),
                      Text(
                        _requestId != null
                            ? language.t('analysis.reportTitle')
                            : language.t('analysis.title'),
                        style: tt.headlineLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                          height: 1.02,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _requestId != null
                            ? language.t('analysis.subtitleReport')
                            : language.t('analysis.subtitle'),
                        style: tt.bodyLarge?.copyWith(color: cm.inkSoft, height: 1.5),
                      ),
                    ],
                  ),
                ),
                // Premium/lock tag
                if (_requestId != null) ...[
                  const SizedBox(width: 16),
                  CmTag(
                    language.t(_status == 'completed' ? 'common.preview' : 'common.inDevelopment'),
                    tone: _status == 'completed' ? 'gold' : 'slate',
                    icon: _status == 'completed' ? Icons.check_circle_rounded : Icons.lock_open_rounded,
                  ),
                ],
              ],
            ),
          ),

          // Main content
          Expanded(
            child: _buildContent(_requestId, language, cm, tt),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(String? requestId, LanguageService language, CmColors cm, TextTheme tt) {
    if (requestId == null) {
      return _buildStartState();
    }
    return _buildReviewState(requestId, language, cm, tt);
  }

  Widget _buildStartState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Import panel
          _ImportPanel(),

          const SizedBox(height: 24),

          // Review preview
          _ReviewPreview(language: language, cm: cm, tt: tt),
        ],
      ),
    );
  }

  Widget _buildReviewState(String requestId, LanguageService language, CmColors cm, TextTheme tt) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Progress area
          _ProgressArea(
            status: _status,
            progress: _progress,
            eval: _eval,
            language: language,
            cm: cm,
            tt: tt,
          ),

 const SizedBox(height: 24),

          // Move navigation
          _MoveNavigation(language: language, cm: cm, tt: tt,

           ),
        ],
      ),
    );
  }

  Widget _ImportPanel() {
    return CmPanel(
      padding: const EdgeInsets.all(24),
      radius: CmRadius.md,
      color: cm.surfaceMuted,
      border: Border.all(color: cm.line),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CmEyebrow(language.t('analysis.import')),
          const SizedBox(height: 12),
          Text(
            language.t('analysis.importText'),
            style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.5),
          ),
          const SizedBox(height: 16),
          // Buttons row
          Row(
            children: [
              Expanded(
                child: CmPrimaryButton(
                  label: language.t('analysis.choosePgn'),
                  onPressed: () {},
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CmSecondaryButton(
                  label: language.t('analysis.savedGames'),
                  onPressed: () {},
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          CmNote(
            language.t('analysis.botHint'),
            tone: 'blue',
            icon: Icons.info_outline_rounded,
          ),
        ],
      ),
    );
  }

  Widget _ReviewPreview({required LanguageService language, required CmColors cm, required TextTheme tt}) {
    return CmPanel(
      padding: const EdgeInsets.all(24),
      radius: CmRadius.md,
      color: linearGradientColor(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF8FAFC), Color(0xFFE2E8F0)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CmTag(language.t('analysis.reportEyebrow'), tone: 'blue', icon: Icons.bookmark_border_rounded),
              const SizedBox(width: 8),
              Text(
                language.t('analysis.reportTitle'),
                style: tt.headlineMedium?.copyWith(fontWeight: FontWeight.w700, color: cm.ink),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            language.t('analysis.pending'),
            style: tt.bodySmall?.copyWith(color: cm.mutedLight),
          ),
        ],
      ),
    );
  }

  Widget _ProgressArea({
    required String status,
    required String progress,
    required String eval,
    required LanguageService language,
    required CmColors cm,
    required TextTheme tt,
  }) {
    return CmPanel(
      padding: const EdgeInsets.all(24),
      radius: CmRadius.md,
      color: cm.surface,
      border: Border.all(color: cm.line),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                status == 'running' || status == 'submitting'
                    ? Icons.hourglass_top_rounded
                    : status == 'completed'
                        ? Icons.check_circle_rounded
                        : Icons.error_outline_rounded,
                color: status == 'running' || status == 'submitting'
                    ? cm.primary
                    : status == 'completed'
                        ? cm.success
                        : cm.danger,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                language.t('analysis.progress') + ':',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700, color: cm.ink),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            language.t('analysis.progressSubtitle', {'status': status, 'progress': progress}),
            style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.4),
          ),
          const SizedBox(height: 8),
          if (eval != '—') ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  language.t('analysis.engineEvaluation'),
                  style: tt.labelLarge?.copyWith(fontWeight: FontWeight.w700, color: cm.primary),
                ),
                Text(
                  eval,
                  style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: cm.primary),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: _parseEvalFactor(eval),
              backgroundColor: cm.line,
              minHeight: 6,
              color: cm.primary,
            ),
          ],
          const SizedBox(height: 16),
          // Move list preview
          Text(
            language.t('analysis.moveHistory', {'count': _moves.length}),
            style: tt.labelSmall?.copyWith(color: cm.mutedLight),
          ),
          const SizedBox(height: 8),
          ..._moves.take(5).map((move) => _MoveChip(move: move)),
        ],
      ),
    );
  }

  double _parseEvalFactor(String eval) {
    if (eval == '—' || eval.isEmpty) return 0.5;
    try {
      final value = eval.replaceAll('M', '').replaceAll('+', '').replaceAll('-', '').trim();
      final num = double.parse(value);
      // Convert centipawns to 0-1 range: positive = white advantage, negative = black advantage
      return (0.5 + num / 2000).clamp(0.0, 1.0);
    } catch (_) {
      return 0.5;
    }
  }
}

class _MoveChip extends StatelessWidget {
  const _MoveChip({required this.move});

  final String move;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: cm.surface,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: cm.line),
        ),
        child: Text(
          move,
          style: const TextStyle(
            fontFamily: 'monospace',
            fontSize: 9,
            color: Color(0xFF334155),
          ),
        ),
      ),
    );
  }
}

/// Extension for gradient colors in build methods
extension GradientX on Object {
  static Widget linearGradientColor({
    required AlignmentAlignment begin,
    required AlignmentAlignment end,
    required List<Color> colors,
  }) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: colors,
          begin: begin,
          end: end,
        ),
      ),
    );
  }
}