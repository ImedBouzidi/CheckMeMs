import 'dart:async';

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/theme/app_theme.dart';
import '../board/board_theme.dart';
import '../board/chess_board_view.dart';

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
                'Move $_ply/${_sans.length}',
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

  static const String _svg = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>
''';

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(_svg, width: 19, height: 19);
  }
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
