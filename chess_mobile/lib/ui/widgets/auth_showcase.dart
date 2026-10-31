import 'dart:async';

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../ui/board/board_theme.dart';
import '../../../ui/board/chess_board_view.dart';
import '../../widgets/cm.dart';

/// The 34-move game the web login/register screens replay on their showcase
/// board (one move every 1.1s, looping).
const String _demoPgn =
    '1. e4 e5 2. d4 exd4 3. Nf3 g6 4. Bc4 Bg7 5. Ng5 Nh6 6. c3 O-O 7. cxd4 d6 8. O-O c6 '
    '9. Nc3 b5 10. Bd3 Bg4 11. f3 Be6 12. e5 dxe5 13. dxe5 Qb6+ 14. Kh1 Nd7 15. Nce4 Nxe5 '
    '16. Nxe6 fxe6 17. Ng5 Rad8 18. Nxe6 Rxd3 19. Qe2 Rf5 20. Bf4 Qd4 21. Nxd4 Rxf4 '
    '22. Nb3 Rd8 23. Nc5 Rfd4 24. f4 Neg4 25. Ne6 Rd2 26. Qe4 Re8 27. Qxc6 Nf2+ 28. Kg1 Rf8 '
    '29. Nxf8 Bxf8 30. Qe6+ Kg7 31. Qe3 Nhg4 32. Qxd2 Bc5 33. Qc3+ Kh6 34. Qxc5 1-0';

/// Self-playing animated board used on the auth screens (and available to the
/// home hero), mirroring the web showcase board.
class DemoBoardShowcase extends StatefulWidget {
  const DemoBoardShowcase({
    super.key,
    this.size,
    this.showCaption = true,
    this.quote,
    this.onMovePlayed,
  });

  /// Fixed board size; fills the available width when null.
  final double? size;
  final bool showCaption;
  final String? quote;
  final void Function()? onMovePlayed;

  @override
  State<DemoBoardShowcase> createState() => _DemoBoardShowcaseState();
}

class _DemoBoardShowcaseState extends State<DemoBoardShowcase> {
  late final List<String> _sans;
  final chess_lib.Chess _game = chess_lib.Chess();
  int _ply = 0;
  Timer? _timer;
  String _fen = chess_lib.Chess().fen;

  @override
  void initState() {
    super.initState();
    final replay = chess_lib.Chess();
    replay.load_pgn(_demoPgn);
    _sans = replay.san_moves().whereType<String>().toList();
    _game.reset();
    _timer = Timer.periodic(const Duration(milliseconds: 1100), (_) => _advance());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _advance() {
    if (_sans.isEmpty) return;
    if (_ply >= _sans.length) {
      // Loop the demo, like the web showcase.
      _game.reset();
      _ply = 0;
    } else {
      _ply += 1;
    }

    final san = _sans[_ply - 1];
    final moved = _game.move(san);
    if (!mounted) return;
    setState(() => _fen = _game.fen);
    if (moved) widget.onMovePlayed?.call();
  }

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    final board = ChessBoardView(
      fen: _fen,
      theme: boardThemes.first,
      showCoordinates: true,
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: widget.size,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: cm.boardFrame,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: cm.line),
            boxShadow: CmShadow.md(cm),
          ),
          child: AspectRatio(aspectRatio: 1, child: board),
        ),
        if (widget.showCaption) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: cm.success, shape: BoxShape.circle),
              ),
              const SizedBox(width: 7),
              Text(
                'Game in progress',
                style: tt.bodySmall?.copyWith(color: cm.muted, fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 10),
              Text(
                'Move ${_ply}/${_sans.length}',
                style: tt.bodySmall?.copyWith(color: cm.primary, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ],
        if (widget.quote != null) ...[
          const SizedBox(height: 12),
          Text(
            widget.quote!,
            textAlign: TextAlign.center,
            style: tt.bodyMedium?.copyWith(color: cm.inkSoft, fontStyle: FontStyle.italic),
          ),
        ],
      ],
    );
  }
}

/// Shared scaffold for the two auth screens: gradient page, "Back to CheckMe"
/// link, card and footer (`.auth-page` of the web app).
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Scaffold(
      body: Stack(
        children: [
          AppTheme.background(cm),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: child,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// "Back to CheckMe" link shown above the auth card.
class AuthBackLink extends StatelessWidget {
  const AuthBackLink({super.key, required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: TextButton.icon(
        onPressed: onTap,
        icon: Icon(Icons.arrow_back, size: 18, color: cm.muted),
        label: Text(label, style: TextStyle(color: cm.muted, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

/// The CheckMe wordmark used at the top of the auth cards.
class AuthBrand extends StatelessWidget {
  const AuthBrand({super.key, required this.subtitle});

  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF60A5FA), Color(0xFF2563EB)]),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF2563EB).withValues(alpha: 0.35),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: const Text('♞', style: TextStyle(color: Colors.white, fontSize: 38)),
        ),
        const SizedBox(height: 14),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: 'Check',
                style: tt.headlineMedium?.copyWith(fontWeight: FontWeight.w800, color: cm.ink),
              ),
              TextSpan(
                text: 'Me',
                style: tt.headlineMedium?.copyWith(fontWeight: FontWeight.w800, color: cm.primary),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.5),
        ),
      ],
    );
  }
}

/// Divider with centered text ("or continue with").
class AuthDivider extends StatelessWidget {
  const AuthDivider({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return Row(
      children: [
        Expanded(child: Container(height: 1, color: cm.line)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(text,
              style: TextStyle(color: cm.mutedLight, fontSize: 12.5, fontWeight: FontWeight.w500)),
        ),
        Expanded(child: Container(height: 1, color: cm.line)),
      ],
    );
  }
}

/// "Continue with Google" button with the four-color G logo.
class GoogleButton extends StatelessWidget {
  const GoogleButton({super.key, required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    return OutlinedButton.icon(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: cm.inkSoft,
        side: BorderSide(color: cm.lineStrong),
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      icon: const SizedBox(
        width: 19,
        height: 19,
        child: _GoogleGlyph(),
      ),
      label: Text(label),
    );
  }
}

class _GoogleGlyph extends StatelessWidget {
  const _GoogleGlyph();

  @override
  Widget build(BuildContext context) {
    return const CustomPaint(painter: _GooglePainter());
  }
}

class _GooglePainter extends CustomPainter {
  const _GooglePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24;
    void drawPath(String data, Color color) {
      final path = Path.parseSvgPathData(data);
      canvas.save();
      canvas.scale(scale);
      canvas.drawPath(path, Paint()..color = color);
      canvas.restore();
    }

    drawPath(
      'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z',
      const Color(0xFF4285F4),
    );
    drawPath(
      'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z',
      const Color(0xFF34A853),
    );
    drawPath(
      'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z',
      const Color(0xFFFBBC05),
    );
    drawPath(
      'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z',
      const Color(0xFFEA4335),
    );
  }

  @override
  bool shouldRepaint(_GooglePainter oldDelegate) => false;
}

/// Footer line of the auth screens.
class AuthFooter extends StatelessWidget {
  const AuthFooter({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: Center(
        child: Text(
          text,
          style: TextStyle(color: context.cm.mutedLight, fontSize: 12.5),
        ),
      ),
    );
  }
}
