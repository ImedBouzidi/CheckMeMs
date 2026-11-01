import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../routing/app_router.dart';
import '../../ui/board/board_theme.dart';
import '../../ui/board/chess_board_view.dart';
import '../../ui/widgets/cm.dart';

import '../../core/theme/app_theme.dart';
import 'game_utils.dart';


/// Pass-and-play local board, mirroring the web local-game feature.
class GameLocalScreen extends StatefulWidget {
  const GameLocalScreen({super.key});

  @override
  State<GameLocalScreen> createState() => _GameLocalScreenState();
}

class _GameLocalScreenState extends State<GameLocalScreen> {
  final chess_lib.Chess _game = chess_lib.Chess();
  String? _selectedSquare;
  Set<String> _legalTargets = {};
  String? _lastMoveFrom;
  String? _lastMoveTo;
  ({String from, String to})? _pendingPromotion;
  bool _orientationWhite = true;
  BoardTheme _boardTheme = boardThemes.first;
  final List<String> _sans = [];

  bool get _isWhiteTurn => _game.turn == chess_lib.Color.WHITE;

  void _onSquareTap(String square) {
    if (_pendingPromotion != null) return;
    if (_selectedSquare != null && _legalTargets.contains(square)) {
      if (_needsPromotion(_selectedSquare!, square)) {
        setState(() => _pendingPromotion = (from: _selectedSquare!, to: square));
        return;
      }
      _play(square);
      return;
    }
    final piece = _game.get(square);
    if (piece != null && piece.color == _game.turn) {
      final targets = _game
          .moves({'square': square, 'verbose': true})
          .map((move) => move['to'] as String)
          .toSet();
      setState(() {
        _selectedSquare = square;
        _legalTargets = targets;
      });
    } else {
      setState(() {
        _selectedSquare = null;
        _legalTargets = {};
      });
    }
  }

  void _onMoveAttempt(String from, String to) {
    if (_pendingPromotion != null) return;
    final piece = _game.get(from);
    if (piece == null || piece.color != _game.turn) return;
    final legal = _game.moves({'square': from, 'verbose': true}).any((move) => move['to'] == to);
    if (!legal) return;
    if (_needsPromotion(from, to)) {
      setState(() => _pendingPromotion = (from: from, to: to));
      return;
    }
    _play(to);
  }

  bool _needsPromotion(String from, String to) {
    final piece = _game.get(from);
    if (piece == null || piece.type != chess_lib.PieceType.PAWN) return false;
    return to.endsWith('8') || to.endsWith('1');
  }

  void _play(String to, {String? promotion}) {
    final from = _pendingPromotion?.from ?? _selectedSquare!;
    final ok = _game.move({
      'from': from,
      'to': to,
      'promotion': ?promotion,
    });
    if (!ok) return;
    final history = _game.history;
    setState(() {
      if (history.isNotEmpty) _sans.add(_game.move_to_san(history.last.move));
      _selectedSquare = null;
      _legalTargets = {};
      _lastMoveFrom = from;
      _lastMoveTo = to;
      _pendingPromotion = null;
    });
  }

  void _reset() {
    _game.reset();
    setState(() {
      _selectedSquare = null;
      _legalTargets = {};
      _lastMoveFrom = null;
      _lastMoveTo = null;
      _pendingPromotion = null;
      _sans.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;
    final captured = CapturedPieces.fromGame(_game, _isWhiteTurn ? 'black' : 'white');
    final checkSquare = _game.in_check ? _kingSquare(_game.turn) : null;

    return Scaffold(
      body: SafeArea(
        child: CmPage(
          maxWidth: 1120,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: () => context.go(AppRoutes.play),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          language.t('local.title'),
                          style: tt.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          language.t('local.turnToMove', {
                            'color': language.t(_isWhiteTurn ? 'common.white' : 'common.black'),
                          }),
                          style: tt.labelMedium?.copyWith(color: cm.muted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                language.t('local.subtitle'),
                style: tt.bodySmall?.copyWith(color: cm.muted, height: 1.5),
              ),
              const SizedBox(height: 14),

              // Top player (opponent of the side at the bottom).
              _playerBar(
                cm,
                tt,
                language,
                isWhite: !_isWhiteTurn,
                captured: captured.botCaptured,
                material: captured.botMaterialAdvantage,
              ),
              const SizedBox(height: 8),
              AspectRatio(
                aspectRatio: 1,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: cm.boardFrame,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: cm.line),
                    boxShadow: CmShadow.md(cm),
                  ),
                  child: ChessBoardView(
                    fen: _game.fen,
                    orientationWhite: _orientationWhite,
                    interactive: true,
                    theme: _boardTheme,
                    selectedSquare: _selectedSquare,
                    legalTargets: _legalTargets,
                    lastMoveFrom: _lastMoveFrom,
                    lastMoveTo: _lastMoveTo,
                    checkSquare: checkSquare,
                    onSquareTap: _onSquareTap,
                    onMoveAttempt: _onMoveAttempt,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              _playerBar(
                cm,
                tt,
                language,
                isWhite: _isWhiteTurn,
                captured: captured.userCaptured,
                material: captured.userMaterialAdvantage,
              ),
              const SizedBox(height: 14),

              // Controls.
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  CmSecondaryButton(
                    small: true,
                    label: language.t('local.flip'),
                    icon: Icons.flip_rounded,
                    onPressed: () => setState(() => _orientationWhite = !_orientationWhite),
                  ),
                  CmSecondaryButton(
                    small: true,
                    label: language.t('local.reset'),
                    icon: Icons.refresh_rounded,
                    onPressed: _reset,
                  ),
                  for (final theme in boardThemes)
                    ChoiceChip(
                      label: Text(language.t(theme.labelKey)),
                      selected: _boardTheme.id == theme.id,
                      onSelected: (_) => setState(() => _boardTheme = theme),
                    ),
                ],
              ),
              const SizedBox(height: 14),

              // Details.
              CmPanel(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      language.t('local.details'),
                      style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    _detailRow(
                      cm,
                      tt,
                      language.t('local.sideToMove'),
                      language.t(_isWhiteTurn ? 'common.white' : 'common.black'),
                    ),
                    _detailRow(
                      cm,
                      tt,
                      language.t('local.board'),
                      language.t(_orientationWhite ? 'local.whiteView' : 'local.blackView'),
                    ),
                    _detailRow(
                      cm,
                      tt,
                      language.t('local.currentFen'),
                      _sans.isEmpty ? language.t('local.startingPosition') : _game.fen,
                      mono: true,
                    ),
                    if (_sans.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        _sans.asMap().entries.map((entry) {
                          final moveNo = (entry.key ~/ 2) + 1;
                          final prefix = entry.key.isEven ? '$moveNo. ' : '';
                          return '$prefix${entry.value}';
                        }).join('  '),
                        style: tt.bodySmall?.copyWith(height: 1.5),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
              CmNote(language.t('local.note'), tone: 'blue', icon: Icons.info_outline_rounded),
              const SizedBox(height: 10),
              CmPrimaryButton(
                label: language.t('local.playStockfish'),
                icon: Icons.smart_toy_rounded,
                onPressed: () => context.go(AppRoutes.play),
              ),
            ],
          ),
        ),
      ),
      bottomSheet: _pendingPromotion == null ? null : _promotionSheet(language, cm, tt),
    );
  }

  String? _kingSquare(chess_lib.Color color) {
    for (final rank in '12345678'.split('')) {
      for (final file in 'abcdefgh'.split('')) {
        final piece = _game.get('$file$rank');
        if (piece != null && piece.type == chess_lib.PieceType.KING && piece.color == color) {
          return '$file$rank';
        }
      }
    }
    return null;
  }

  Widget _playerBar(
    dynamic cm,
    TextTheme tt,
    LanguageService language, {
    required bool isWhite,
    required List<String> captured,
    required int material,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: cm.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cm.line),
      ),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: isWhite ? Colors.white : const Color(0xFF334155),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: cm.lineStrong),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  language.t(isWhite ? 'common.white' : 'common.black'),
                  style: tt.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Wrap(
                  spacing: 4,
                  runSpacing: 2,
                  children: [
                    for (final asset in captured)
                      SvgPicture.asset('assets/pieces/$asset.svg', width: 14, height: 14),
                    if (material > 0)
                      Text(
                        '+$material',
                        style: tt.labelSmall?.copyWith(
                          color: cm.success,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(dynamic cm, TextTheme tt, String label, String value, {bool mono = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: tt.labelMedium?.copyWith(color: cm.muted)),
          ),
          Expanded(
            child: Text(
              value,
              style: mono
                  ? tt.labelSmall?.copyWith(fontFamily: 'monospace')
                  : tt.labelMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _promotionSheet(LanguageService language, dynamic cm, TextTheme tt) {
    const pieces = [
      ('q', 'bot.queen'),
      ('r', 'bot.rook'),
      ('b', 'bot.bishop'),
      ('n', 'bot.knight'),
    ];
    final colorAsset = _isWhiteTurn ? 'w' : 'b';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cm.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(color: cm.line),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            language.t('bot.promotePawn'),
            textAlign: TextAlign.center,
            style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (final entry in pieces) ...[
                InkWell(
                  onTap: () {
                    final pending = _pendingPromotion;
                    if (pending == null) return;
                    _play(pending.to, promotion: entry.$1);
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 62,
                    height: 62,
                    decoration: BoxDecoration(
                      color: cm.surfaceMuted,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cm.lineStrong),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SvgPicture.asset(
                          'assets/pieces/$colorAsset${entry.$1}.svg',
                          width: 34,
                          height: 34,
                        ),
                        Text(language.t(entry.$2), style: tt.labelSmall?.copyWith(fontSize: 9)),
                      ],
                    ),
                  ),
                ),
                if (entry != pieces.last) const SizedBox(width: 10),
              ],
            ],
          ),
          const SizedBox(height: 10),
          CmSecondaryButton(
            label: language.t('common.cancel'),
            onPressed: () => setState(() => _pendingPromotion = null),
          ),
        ],
      ),
    );
  }
}
