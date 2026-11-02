import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/models/course.dart' show ArrowTone, BoardArrow;
import 'board_theme.dart';

/// Paint recipe for the legal-target markers of the selected piece.
class BoardMarkers {
  const BoardMarkers({
    required this.moveColor,
    required this.captureColor,
    this.dotRadius = 0.16,
    this.dotAlpha = 0.35,
    this.ringAlpha = 0.35,
    this.ringWidth = 0.09,
    this.tintSquares = false,
    this.tintAlpha = 0.25,
    this.captureBevel = false,
    this.pulseGain = 0,
    this.pulseAlpha = 0,
  });

  final Color moveColor;
  final Color captureColor;
  final double dotRadius;
  final double dotAlpha;
  final double ringAlpha;
  final double ringWidth;

  /// Fills the whole square instead of drawing a dot (piece trainer).
  final bool tintSquares;
  final double tintAlpha;

  /// Second, lighter ring inside a capture ring.
  final bool captureBevel;

  /// Extra radius and opacity added at the peak of the pulse.
  final double pulseGain;
  final double pulseAlpha;
}

/// Adult boards: static navy dots and rings.
const BoardMarkers kClassicBoardMarkers = BoardMarkers(
  moveColor: kTargetDotColor,
  captureColor: kTargetDotColor,
);

/// Kids boards: pink dots and rings that breathe while it is the child's turn.
const BoardMarkers kKidsBoardMarkers = BoardMarkers(
  moveColor: kKidsPulseColor,
  captureColor: kKidsPulseColor,
  dotRadius: 0.18,
  dotAlpha: 0.55,
  ringAlpha: 0.7,
  ringWidth: 0.11,
  pulseGain: 0.35,
  pulseAlpha: 0.3,
);

/// Piece trainer: every square the piece may go to is tinted, captures get a
/// bevelled pink ring.
const BoardMarkers kKidsLearnBoardMarkers = BoardMarkers(
  moveColor: kKidsLearnMoveColor,
  captureColor: kKidsLearnCaptureColor,
  dotAlpha: 0.3,
  ringAlpha: 0.75,
  ringWidth: 0.10,
  tintSquares: true,
  tintAlpha: 0.22,
  captureBevel: true,
);

/// Interactive chess board — the mobile counterpart of the web app's
/// cm-chessboard (staunty pieces, green style, markers + arrows extensions).
///
/// The board is deliberately "stateless about rules": the owning screen passes
/// the FEN plus decorations (selection, legal targets, last move, check) and
/// receives raw gestures, so a single source of truth (the screen's [chess_lib.Chess])
/// always decides legality — exactly like cm-chessboard's `enableMoveInput`.
class ChessBoardView extends StatefulWidget {
  const ChessBoardView({
    super.key,
    required this.fen,
    this.orientationWhite = true,
    this.interactive = false,
    this.selectedSquare,
    this.legalTargets = const {},
    this.lastMoveFrom,
    this.lastMoveTo,
    this.checkSquare,
    this.extraHighlights = const [],
    this.arrows = const [],
    this.theme = kDefaultBoardTheme,
    this.markers = kClassicBoardMarkers,
    this.pulseMarkers = false,
    this.hintArrowColor = kHintArrowColor,
    this.showCoordinates = true,
    this.onSquareTap,
    this.onMoveAttempt,
    this.onDragStarted,
    this.pieceMargin = 0.06,
  });

  /// Position to render.
  final String fen;

  /// True when White plays from the bottom.
  final bool orientationWhite;

  /// Enables taps and drag-and-drop.
  final bool interactive;

  /// Square framed as selected (yellow marker).
  final String? selectedSquare;

  /// Legal destinations of the selected piece (dots / capture rings).
  final Set<String> legalTargets;

  /// Last move markers (olive).
  final String? lastMoveFrom;
  final String? lastMoveTo;

  /// King in check (red glow).
  final String? checkSquare;

  /// Extra framed squares (lesson highlights).
  final List<String> extraHighlights;

  /// Arrows (lesson guidance, engine hints).
  final List<BoardArrow> arrows;

  final BoardTheme theme;

  /// How legal-target markers are painted. Adults use [kClassicBoardMarkers];
  /// kids mode passes a pink pulsing set, the piece trainer a tinted set.
  final BoardMarkers markers;

  /// Grows and fades the legal-target dots, like the kids board in the web app.
  final bool pulseMarkers;

  /// Color of [ArrowTone.defaultTone] arrows; kids mode uses orange.
  final Color hintArrowColor;

  final bool showCoordinates;

  /// Tap anywhere on a square (selection handled by the screen).
  final void Function(String square)? onSquareTap;

  /// Drag completion `from -> to`; the screen validates the move.
  final void Function(String from, String to)? onMoveAttempt;

  /// Called when a drag begins on [square], before [onMoveAttempt].
  final void Function(String square)? onDragStarted;

  /// Piece inset inside its square (0..0.5).
  final double pieceMargin;

  @override
  State<ChessBoardView> createState() => _ChessBoardViewState();
}

class _ChessBoardViewState extends State<ChessBoardView>
    with SingleTickerProviderStateMixin {
  String? _dragFrom;
  Offset _dragOffset = Offset.zero;
  AnimationController? _pulse;

  static const List<String> _files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  @override
  void initState() {
    super.initState();
    if (widget.pulseMarkers) _startPulse();
  }

  @override
  void didUpdateWidget(ChessBoardView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.pulseMarkers) {
      _pulse?.dispose();
      _pulse = null;
      return;
    }
    if (_pulse == null) _startPulse();
  }

  void _startPulse() {
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 620),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final side = math.min(constraints.maxWidth, constraints.maxHeight);
        if (!side.isFinite || side <= 0) return const SizedBox.shrink();
        final squareSize = side / 8;

        return SizedBox(
          width: side,
          height: side,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // Squares + markers.
              Positioned.fill(
                child: CustomPaint(
                  painter: _BoardPainter(
                    fen: widget.fen,
                    orientationWhite: widget.orientationWhite,
                    selectedSquare: widget.selectedSquare,
                    legalTargets: widget.legalTargets,
                    lastMoveFrom: widget.lastMoveFrom,
                    lastMoveTo: widget.lastMoveTo,
                    checkSquare: widget.checkSquare,
                    extraHighlights: widget.extraHighlights,
                    theme: widget.theme,
                    markers: widget.markers,
                    pulseAnimation: _pulse,
                    showCoordinates: widget.showCoordinates,
                    squareSize: squareSize,
                  ),
                ),
              ),
              // Pieces (the dragged one is lifted).
              for (final entry in _pieces(squareSize))
                Positioned(
                  left: entry.col * squareSize,
                  top: entry.row * squareSize,
                  width: squareSize,
                  height: squareSize,
                  child: IgnorePointer(
                    child: Padding(
                      padding: EdgeInsets.all(squareSize * widget.pieceMargin),
                      child: SvgPicture.asset(
                        'assets/pieces/${entry.asset}.svg',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),
              // Arrows above everything.
              Positioned.fill(
                child: IgnorePointer(
                  child: CustomPaint(
                    painter: _ArrowPainter(
                      arrows: widget.arrows,
                      orientationWhite: widget.orientationWhite,
                      squareSize: squareSize,
                      hintColor: widget.hintArrowColor,
                      pulseAnimation: _pulse,
                      pulseGain: _pulse == null ? 0 : 0.45,
                    ),
                  ),
                ),
              ),
              // Gesture layer.
              if (widget.interactive && side > 0)
                Positioned.fill(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapUp: widget.onSquareTap == null
                        ? null
                        : (details) {
                            final square = _squareAt(
                              details.localPosition,
                              squareSize,
                            );
                            if (square != null) widget.onSquareTap!(square);
                          },
                    onPanStart: widget.onMoveAttempt == null
                        ? null
                        : (details) {
                            final square = _squareAt(
                              details.localPosition,
                              squareSize,
                            );
                            if (square == null) return;
                            setState(() {
                              _dragFrom = square;
                              _dragOffset =
                                  details.localPosition -
                                  _centerOf(square, squareSize);
                            });
                            widget.onDragStarted?.call(square);
                            widget.onSquareTap?.call(square);
                          },
                    onPanUpdate: (details) {
                      if (_dragFrom == null) return;
                      setState(() {
                        _dragOffset =
                            details.localPosition -
                            _centerOf(_dragFrom!, squareSize);
                      });
                    },
                    onPanEnd: (details) {
                      final from = _dragFrom;
                      if (from == null) return;
                      final target = _squareAt(
                        _centerOf(from, squareSize) + _dragOffset,
                        squareSize,
                      );
                      setState(() {
                        _dragFrom = null;
                        _dragOffset = Offset.zero;
                      });
                      if (target != null && target != from) {
                        widget.onMoveAttempt!(from, target);
                      }
                    },
                    onPanCancel: () {
                      if (_dragFrom == null) return;
                      setState(() {
                        _dragFrom = null;
                        _dragOffset = Offset.zero;
                      });
                    },
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  List<_PiecePlacement> _pieces(double squareSize) {
    final placement = widget.fen.split(' ').first;
    final pieces = <_PiecePlacement>[];
    var rank = 8;
    var file = 0;
    for (final token in placement.split('')) {
      if (token == '/') {
        rank -= 1;
        file = 0;
        continue;
      }
      final digit = int.tryParse(token);
      if (digit != null) {
        file += digit;
        continue;
      }
      final square = '${_files[file]}$rank';
      final position = _cellOf(square);
      final lifted = _dragFrom == square;
      final liftCol = lifted ? _dragOffset.dx / squareSize : 0.0;
      final liftRow = lifted ? _dragOffset.dy / squareSize : 0.0;
      pieces.add(
        _PiecePlacement(
          asset: _assetFor(token),
          col: position.$1 + liftCol,
          row: position.$2 + liftRow,
          square: square,
          lifted: lifted,
        ),
      );
      file += 1;
    }
    return pieces;
  }

  String _assetFor(String token) {
    final color = token == token.toUpperCase() ? 'w' : 'b';
    return '$color${token.toLowerCase()}';
  }

  /// Grid cell (column, row) of a square in the current orientation.
  (int, int) _cellOf(String square) {
    final file = _files.indexOf(square[0]);
    final rank = int.parse(square.substring(1));
    return widget.orientationWhite ? (file, 8 - rank) : (7 - file, rank - 1);
  }

  Offset _centerOf(String square, double squareSize) {
    final cell = _cellOf(square);
    return Offset((cell.$1 + 0.5) * squareSize, (cell.$2 + 0.5) * squareSize);
  }

  String? _squareAt(Offset offset, double squareSize) {
    final col = (offset.dx / squareSize).floor();
    final row = (offset.dy / squareSize).floor();
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    final file = _files[widget.orientationWhite ? col : 7 - col];
    final rank = widget.orientationWhite ? 8 - row : row + 1;
    return '$file$rank';
  }
}

class _PiecePlacement {
  const _PiecePlacement({
    required this.asset,
    required this.col,
    required this.row,
    required this.square,
    required this.lifted,
  });

  final String asset;
  final double col;
  final double row;
  final String square;
  final bool lifted;
}

/// Paints squares, coordinate labels and every marker (selection, last move,
/// check, legal targets, lesson highlights).
class _BoardPainter extends CustomPainter {
  _BoardPainter({
    required this.fen,
    required this.orientationWhite,
    required this.selectedSquare,
    required this.legalTargets,
    required this.lastMoveFrom,
    required this.lastMoveTo,
    required this.checkSquare,
    required this.extraHighlights,
    required this.theme,
    required this.markers,
    required this.pulseAnimation,
    required this.showCoordinates,
    required this.squareSize,
  }) : super(repaint: pulseAnimation);

  final String fen;
  final bool orientationWhite;
  final String? selectedSquare;
  final Set<String> legalTargets;
  final String? lastMoveFrom;
  final String? lastMoveTo;
  final String? checkSquare;
  final List<String> extraHighlights;
  final BoardTheme theme;
  final BoardMarkers markers;

  /// 0..1 pulse phase; null when the markers stay static.
  final Animation<double>? pulseAnimation;
  double get pulse => pulseAnimation?.value ?? 0;
  final bool showCoordinates;
  final double squareSize;

  static const List<String> _files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  @override
  void paint(Canvas canvas, Size size) {
    final occupancy = _occupancy();

    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        final rect = Rect.fromLTWH(
          col * squareSize,
          row * squareSize,
          squareSize,
          squareSize,
        );
        final square = _squareAt(col, row);
        final isLight = _isLight(col, row);

        canvas.drawRect(
          rect,
          Paint()..color = isLight ? theme.light : theme.dark,
        );

        // Last move.
        if (square == lastMoveFrom || square == lastMoveTo) {
          canvas.drawRect(
            rect,
            Paint()..color = kLastMoveColor.withValues(alpha: 0.65),
          );
        }

        // Lesson highlights.
        if (extraHighlights.contains(square)) {
          canvas.drawRect(
            rect,
            Paint()
              ..color = kSelectedSquareColor.withValues(alpha: 0.45)
              ..style = PaintingStyle.stroke
              ..strokeWidth = 3,
          );
        }

        // Selection.
        if (square == selectedSquare) {
          canvas.drawRect(
            rect,
            Paint()..color = kSelectedSquareColor.withValues(alpha: 0.65),
          );
        }

        // Check glow.
        if (square == checkSquare) {
          final paint = Paint()
            ..shader = RadialGradient(
              colors: [
                kCheckColor.withValues(alpha: 0.85),
                kCheckColor.withValues(alpha: 0.0),
              ],
            ).createShader(rect);
          canvas.drawRect(rect, paint);
        }

        // Legal targets: dot for empty squares, ring for captures.
        if (legalTargets.contains(square)) {
          final center = Offset(
            (col + 0.5) * squareSize,
            (row + 0.5) * squareSize,
          );
          final grow = 1 + markers.pulseGain * pulse;
          final empty = occupancy[square] == null;
          final color = empty ? markers.moveColor : markers.captureColor;
          final alpha =
              (empty ? markers.dotAlpha : markers.ringAlpha) +
              markers.pulseAlpha * pulse;

          if (markers.tintSquares) {
            canvas.drawRect(
              rect,
              Paint()
                ..color = color.withValues(
                  alpha: markers.tintAlpha + markers.pulseAlpha * pulse,
                ),
            );
            if (!empty) {
              canvas.drawCircle(
                center,
                squareSize * 0.42,
                Paint()
                  ..color = markers.captureColor.withValues(
                    alpha: markers.ringAlpha,
                  )
                  ..style = PaintingStyle.stroke
                  ..strokeWidth = squareSize * markers.ringWidth,
              );
              if (markers.captureBevel) {
                canvas.drawCircle(
                  center,
                  squareSize * 0.34,
                  Paint()
                    ..color = markers.captureColor.withValues(
                      alpha: markers.ringAlpha * 0.45,
                    )
                    ..style = PaintingStyle.stroke
                    ..strokeWidth = squareSize * 0.035,
                );
              }
            }
          } else if (empty) {
            canvas.drawCircle(
              center,
              squareSize * markers.dotRadius * grow,
              Paint()..color = color.withValues(alpha: alpha.clamp(0.0, 1.0)),
            );
          } else {
            canvas.drawCircle(
              center,
              squareSize * 0.42 * grow,
              Paint()
                ..color = color.withValues(alpha: alpha.clamp(0.0, 1.0))
                ..style = PaintingStyle.stroke
                ..strokeWidth = squareSize * markers.ringWidth,
            );
            if (markers.captureBevel) {
              canvas.drawCircle(
                center,
                squareSize * 0.34 * grow,
                Paint()
                  ..color = color.withValues(
                    alpha: (alpha * 0.45).clamp(0.0, 1.0),
                  )
                  ..style = PaintingStyle.stroke
                  ..strokeWidth = squareSize * 0.035,
              );
            }
          }
        }
      }
    }

    if (showCoordinates) _paintCoordinates(canvas, size);
  }

  void _paintCoordinates(Canvas canvas, Size size) {
    final style = TextStyle(
      fontSize: math.max(9, squareSize * 0.22),
      fontWeight: FontWeight.w700,
      height: 1,
    );

    for (var col = 0; col < 8; col++) {
      final file = _files[orientationWhite ? col : 7 - col];
      final isLight = _isLight(col, 7);
      final painter = TextPainter(
        text: TextSpan(
          text: file,
          style: style.copyWith(
            color: (isLight ? theme.dark : theme.light).withValues(alpha: 0.85),
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      painter.paint(
        canvas,
        Offset(
          (col + 1) * squareSize - painter.width - 3,
          size.height - painter.height - 2,
        ),
      );
    }

    for (var row = 0; row < 8; row++) {
      final rank = orientationWhite ? 8 - row : row + 1;
      final isLight = _isLight(0, row);
      final painter = TextPainter(
        text: TextSpan(
          text: '$rank',
          style: style.copyWith(
            color: (isLight ? theme.dark : theme.light).withValues(alpha: 0.85),
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      painter.paint(canvas, Offset(3, row * squareSize + 2));
    }
  }

  /// Which squares hold a piece (for capture rings).
  Map<String, String> _occupancy() {
    final occupancy = <String, String>{};
    final placement = fen.split(' ').first;
    var rank = 8;
    var file = 0;
    for (final token in placement.split('')) {
      if (token == '/') {
        rank -= 1;
        file = 0;
        continue;
      }
      final digit = int.tryParse(token);
      if (digit != null) {
        file += digit;
        continue;
      }
      occupancy['${_files[file]}$rank'] = token;
      file += 1;
    }
    return occupancy;
  }

  String _squareAt(int col, int row) {
    final file = _files[orientationWhite ? col : 7 - col];
    final rank = orientationWhite ? 8 - row : row + 1;
    return '$file$rank';
  }

  /// The classic "dark on light, light on dark" checkering.
  bool _isLight(int col, int row) {
    final square = _squareAt(col, row);
    final file = _files.indexOf(square[0]);
    final rank = int.parse(square.substring(1));
    return (file + rank) % 2 == 1;
  }

  @override
  bool shouldRepaint(_BoardPainter oldDelegate) => true;
}

/// Paints arrows with rounded shafts and triangular heads, colored by tone.
class _ArrowPainter extends CustomPainter {
  _ArrowPainter({
    required this.arrows,
    required this.orientationWhite,
    required this.squareSize,
    this.hintColor = kHintArrowColor,
    this.pulseAnimation,
    this.pulseGain = 0,
  }) : super(repaint: pulseAnimation);

  final List<BoardArrow> arrows;
  final bool orientationWhite;
  final double squareSize;
  final Color hintColor;

  /// When set, the arrow fades and re-strengthens with the kids pulse beat.
  final Animation<double>? pulseAnimation;
  final double pulseGain;

  static const List<String> _files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  @override
  void paint(Canvas canvas, Size size) {
    for (final arrow in arrows) {
      final from = _centerOf(arrow.from);
      final to = _centerOf(arrow.to);
      final color = _colorFor(arrow.tone);
      final alpha = (0.85 - pulseGain * (1 - (pulseAnimation?.value ?? 1)))
          .clamp(0.2, 1.0)
          .toDouble();

      final direction = to - from;
      final distance = direction.distance;
      if (distance <= 0) continue;
      final unit = direction / distance;

      // Shorten the shaft so the head sits inside the target square.
      final headLength = squareSize * 0.32;
      final shaftEnd = to - unit * headLength;

      final shaftPaint = Paint()
        ..color = color.withValues(alpha: alpha)
        ..strokeCap = StrokeCap.round
        ..strokeWidth = squareSize * 0.16;
      canvas.drawLine(from, shaftEnd, shaftPaint);

      // Arrowhead triangle.
      final headWidth = squareSize * 0.30;
      final perpendicular = Offset(-unit.dy, unit.dx);
      final tip = to - unit * (squareSize * 0.06);
      final path = Path()
        ..moveTo(tip.dx, tip.dy)
        ..lineTo(
          shaftEnd.dx + perpendicular.dx * headWidth / 2,
          shaftEnd.dy + perpendicular.dy * headWidth / 2,
        )
        ..lineTo(
          shaftEnd.dx - perpendicular.dx * headWidth / 2,
          shaftEnd.dy - perpendicular.dy * headWidth / 2,
        )
        ..close();
      canvas.drawPath(path, Paint()..color = color.withValues(alpha: alpha));
    }
  }

  Color _colorFor(ArrowTone tone) => switch (tone) {
    ArrowTone.success => const Color(0xFF22C55E),
    ArrowTone.warning => const Color(0xFFF59E0B),
    ArrowTone.danger => const Color(0xFFEF4444),
    ArrowTone.info => const Color(0xFF3B82F6),
    ArrowTone.secondary => const Color(0xFF64748B),
    _ => hintColor,
  };

  Offset _centerOf(String square) {
    final file = _files.indexOf(square[0]);
    final rank = int.parse(square.substring(1));
    final col = orientationWhite ? file : 7 - file;
    final row = orientationWhite ? 8 - rank : rank - 1;
    return Offset((col + 0.5) * squareSize, (row + 0.5) * squareSize);
  }

  @override
  bool shouldRepaint(_ArrowPainter oldDelegate) => true;
}
