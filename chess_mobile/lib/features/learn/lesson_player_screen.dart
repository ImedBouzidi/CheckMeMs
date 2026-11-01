import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/language_service.dart';
import '../../core/models/course.dart';
import '../../core/services/course_service.dart';
import '../../core/services/learning_progress_service.dart';
import '../../core/services/premium_service.dart';
import '../../core/theme/app_theme.dart';
import '../../routing/app_router.dart';
import '../../ui/board/chess_board_view.dart';
import '../../ui/widgets/cm.dart';

/// Lesson player, mirroring
/// `chess-web/src/app/features/learn/lesson-player.component.ts`:
/// text/position/task/PGN steps on a single board, with solution validation,
/// hints, progress persistence and premium locks.
class LessonPlayerScreen extends StatefulWidget {
  const LessonPlayerScreen({super.key, required this.courseId, required this.lessonId});

  final String courseId;
  final String lessonId;

  @override
  State<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends State<LessonPlayerScreen> {
  bool _loaded = false;
  Course? _course;
  LessonRef? _ref;
  String _access = 'loading'; // loading | ok | locked | missing

  int _stepIndex = 0;
  final Set<int> _solved = <int>{};
  ({bool ok, String kind})? _feedback;
  bool _completed = false;

  chess_lib.Chess _taskChess = chess_lib.Chess();
  int _taskCursor = 0;

  String _fen = startFen;
  bool _orientationWhite = true;
  List<BoardArrow> _arrows = const [];
  List<String> _highlights = const [];
  String? _selectedSquare;
  Set<String> _legalTargets = {};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loaded) return;
    _loaded = true;

    final courseService = context.read<CourseService>();
    final premium = context.read<PremiumService>();
    final progress = context.read<LearningProgressService>();

    _course = courseService.getCourse(widget.courseId);
    _ref = courseService.getLessonRef(widget.courseId, widget.lessonId);

    if (_course == null || _ref == null) {
      _access = 'missing';
      return;
    }

    _access = premium.canOpenLesson(_course!, _ref!.lesson, _ref!.index) ? 'ok' : 'locked';
    if (_access == 'ok') {
      progress.markOpened(_course!.id, _ref!.lesson.id);
      _renderStep(notify: false);
    }
  }

  LessonStep? get _step {
    final steps = _ref?.lesson.steps ?? const <LessonStep>[];
    if (_stepIndex < 0 || _stepIndex >= steps.length) return null;
    return steps[_stepIndex];
  }

  TaskStep? get _taskStep {
    final step = _step;
    return step is TaskStep ? step : null;
  }

  int get _totalSteps => _ref?.lesson.steps.length ?? 0;

  bool get _isLastStep => _stepIndex >= _totalSteps - 1;

  bool get _isSolved => _solved.contains(_stepIndex);

  bool get _canAdvance {
    final step = _step;
    if (step == null) return false;
    return step is! TaskStep || _isSolved;
  }

  int get _percent {
    if (_totalSteps <= 1) return 100;
    return ((_stepIndex / (_totalSteps - 1)) * 100).round();
  }

  void _renderStep({bool notify = true}) {
    final step = _step;
    _feedback = null;
    _selectedSquare = null;
    _legalTargets = {};
    _arrows = const [];
    _highlights = const [];

    if (step is TaskStep) {
      _orientationWhite = step.orientation == BoardOrientation.white;
      _taskChess = chess_lib.Chess.fromFEN(step.fen);
      _taskCursor = 0;
      _fen = step.fen;
      if (_isSolved) _feedback = (ok: true, kind: 'success');
    } else if (step is PositionStep) {
      _orientationWhite = step.orientation == BoardOrientation.white;
      _fen = step.fen;
      _arrows = step.arrows;
      _highlights = step.highlights;
    } else if (step is PgnStep) {
      _orientationWhite = true;
      final game = chess_lib.Chess();
      try {
        game.load_pgn(step.pgn);
      } catch (_) {
        game.reset();
      }
      _fen = game.fen;
    } else {
      _orientationWhite = true;
      _fen = startFen;
    }

    if (notify && mounted) setState(() {});
  }

  void _onSquareTap(String square) {
    final step = _taskStep;
    if (step == null || _isSolved) return;

    if (_selectedSquare != null && _legalTargets.contains(square)) {
      _tryTaskMove(_selectedSquare!, square);
      return;
    }

    final piece = _taskChess.get(square);
    if (piece != null && piece.color == _taskChess.turn) {
      final targets = _taskChess
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
    final step = _taskStep;
    if (step == null || _isSolved) return;
    final piece = _taskChess.get(from);
    if (piece == null || piece.color != _taskChess.turn) return;
    final legal = _taskChess
        .moves({'square': from, 'verbose': true})
        .any((move) => move['to'] == to);
    if (!legal) return;
    _tryTaskMove(from, to);
  }

  void _tryTaskMove(String from, String to) {
    final step = _taskStep;
    if (step == null) return;

    if (_taskCursor >= step.solution.length) return;
    final expected = _normalizeSan(step.solution[_taskCursor]);
    if (expected.isEmpty) return;

    final probe = chess_lib.Chess.fromFEN(_taskChess.fen);
    final legal = probe.move({
      'from': from,
      'to': to,
      'promotion': 'q',
    });
    if (!legal) return;

    final history = probe.history;
    final played = _normalizeSan(
      history.isEmpty ? '' : probe.move_to_san(history.last.move),
    );

    if (played != expected) {
      setState(() {
        _feedback = (ok: false, kind: 'tryAgain');
        _selectedSquare = null;
        _legalTargets = {};
      });
      return;
    }

    _taskChess.move({'from': from, 'to': to, 'promotion': 'q'});
    var cursor = _taskCursor + 1;

    // Odd indices are scripted opponent replies.
    if (cursor < step.solution.length) {
      try {
        _taskChess.move(step.solution[cursor]);
      } catch (_) {
        cursor = step.solution.length;
      }
      cursor += 1;
    }
    _taskCursor = cursor;

    if (_taskCursor >= step.solution.length) {
      _solved.add(_stepIndex);
      setState(() {
        _fen = _taskChess.fen;
        _selectedSquare = null;
        _legalTargets = {};
        _feedback = (ok: true, kind: 'success');
      });
      return;
    }

    setState(() {
      _fen = _taskChess.fen;
      _selectedSquare = null;
      _legalTargets = {};
      _feedback = (ok: true, kind: 'correct');
    });
  }

  static String _normalizeSan(String san) =>
      san.replaceAll(RegExp(r'[+#!?]'), '').trim();

  void _next() {
    if (!_canAdvance) return;
    if (_isLastStep) {
      _finishLesson();
      return;
    }
    _stepIndex += 1;
    _renderStep();
  }

  void _previous() {
    if (_stepIndex == 0) return;
    _stepIndex -= 1;
    _renderStep();
  }

  void _practiceAgain() {
    setState(() {
      _completed = false;
      _solved.clear();
      _stepIndex = 0;
    });
    _renderStep();
  }

  void _finishLesson() {
    final ref = _ref;
    if (ref == null) return;
    context.read<LearningProgressService>().completeLesson(ref.course.id, ref.lesson.id);
    setState(() {
      _completed = true;
      _selectedSquare = null;
      _legalTargets = {};
    });
  }

  String _feedbackMessage(LanguageService language, TaskStep task) {
    final feedback = _feedback;
    if (feedback == null) return '';
    if (feedback.kind == 'tryAgain') return language.t('learn.player.tryAgain');
    if (feedback.kind == 'success') {
      return task.success ?? language.t('learn.player.correct');
    }
    return language.t('learn.player.correct');
  }

  @override
  Widget build(BuildContext context) {
    final language = context.watch<LanguageService>();
    final cm = context.cm;
    final tt = context.tt;

    return CmPage(
      maxWidth: 1180,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(
            language: language,
            course: _course,
            ref: _ref,
            access: _access,
            completed: _completed,
            stepIndex: _stepIndex,
            totalSteps: _totalSteps,
          ),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 1000;
              final board = _BoardPanel(
                fen: _fen,
                orientationWhite: _orientationWhite,
                interactive: _access == 'ok' && _taskStep != null && !_isSolved,
                selectedSquare: _selectedSquare,
                legalTargets: _legalTargets,
                highlights: _highlights,
                arrows: _arrows,
                dimmed: _access != 'ok',
                onSquareTap: _onSquareTap,
                onMoveAttempt: _onMoveAttempt,
                language: language,
              );
              final panel = _buildStepPanel(context, language, cm, tt);

              if (!wide) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [board, const SizedBox(height: 18), panel],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 27, child: board),
                  const SizedBox(width: 26),
                  Expanded(flex: 23, child: panel),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStepPanel(
    BuildContext context,
    LanguageService language,
    CmColors cm,
    TextTheme tt,
  ) {
    if (_access == 'missing') {
      return _StateCard(
        icon: Icons.explore_off_rounded,
        title: language.t('learn.player.notFound'),
        text: language.t('learn.player.notFoundText'),
        actionLabel: language.t('learn.player.back'),
        onAction: () => context.go(AppRoutes.learn),
      );
    }
    if (_access == 'locked') {
      return _StateCard(
        icon: Icons.lock_rounded,
        tone: 'gold',
        title: language.t('learn.player.locked'),
        text: language.t('learn.player.lockedText'),
        actionLabel: language.t('learn.player.back'),
        onAction: () => context.go(AppRoutes.learn),
      );
    }
    if (_completed) {
      return _CompletionCard(
        language: language,
        nextRef: _nextRef,
        nextLocked: _nextLocked,
        onNext: _nextRef == null
            ? null
            : () => context.go(
                  AppRoutes.lesson(_nextRef!.course.id, _nextRef!.lesson.id),
                ),
        onPracticeAgain: _practiceAgain,
      );
    }

    final step = _step;
    if (step == null) {
      return const SizedBox.shrink();
    }

    final task = _taskStep;
    final solved = _isSolved;

    return CmPanel(
      padding: const EdgeInsets.all(26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            children: [
              CmTag(
                language.t('learn.player.step', {
                  'current': _stepIndex + 1,
                  'total': _totalSteps,
                }),
                tone: 'blue',
              ),
              if (task != null)
                CmTag(
                  solved
                      ? language.t('learn.player.solved')
                      : language.t('learn.player.yourMove'),
                  tone: solved ? 'green' : 'slate',
                  icon: solved
                      ? Icons.check_circle_rounded
                      : Icons.touch_app_rounded,
                ),
            ],
          ),
          const SizedBox(height: 18),
          CmProgressBar(percent: _percent.toDouble(), height: 5),
          const SizedBox(height: 22),
          if (step.title != null) ...[
            Text(
              step.title!,
              style: tt.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                height: 1.2,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 10),
          ],
          if (step.text != null)
            Text(
              step.text!,
              style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.7),
            ),
          if (task != null) ...[
            const SizedBox(height: 20),
            _TaskPanel(
              language: language,
              task: task,
              feedback: _feedback,
              feedbackMessage: _feedbackMessage(language, task),
            ),
          ],
          const SizedBox(height: 26),
          Row(
            children: [
              Expanded(
                child: CmSecondaryButton(
                  label: language.t('learn.player.previous'),
                  onPressed: _stepIndex == 0 ? null : _previous,
                  expanded: true,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CmPrimaryButton(
                  label: _isLastStep
                      ? language.t('learn.player.finish')
                      : language.t('learn.player.next'),
                  onPressed: _canAdvance ? _next : null,
                  expanded: true,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  LessonRef? get _nextRef {
    final ref = _ref;
    if (ref == null) return null;
    return context.read<CourseService>().nextLesson(ref.course.id, ref.lesson.id);
  }

  bool get _nextLocked {
    final next = _nextRef;
    if (next == null) return false;
    return !context.read<PremiumService>().canOpenLesson(
      next.course,
      next.lesson,
      next.index,
    );
  }
}

/* --------------------------------- widgets ---------------------------------- */

class _Header extends StatelessWidget {
  const _Header({
    required this.language,
    required this.course,
    required this.ref,
    required this.access,
    required this.completed,
    required this.stepIndex,
    required this.totalSteps,
  });

  final LanguageService language;
  final Course? course;
  final LessonRef? ref;
  final String access;
  final bool completed;
  final int stepIndex;
  final int totalSteps;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return Wrap(
      spacing: 18,
      runSpacing: 10,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        TextButton.icon(
          onPressed: () => context.go(AppRoutes.learn),
          icon: const Icon(Icons.arrow_back_rounded, size: 18),
          label: Text(language.t('learn.player.back')),
          style: TextButton.styleFrom(foregroundColor: cm.muted),
        ),
        SizedBox(
          width: 320,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (course != null)
                Text(
                  course!.title.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: cm.primaryDark,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
              const SizedBox(height: 4),
              Text(
                ref?.lesson.title ?? language.t('learn.player.notFound'),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: tt.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),
            ],
          ),
        ),
        if (access == 'ok' && !completed)
          CmTag(
            language.t('learn.player.step', {
              'current': stepIndex + 1,
              'total': totalSteps,
            }),
            tone: 'blue',
          ),
      ],
    );
  }
}

class _BoardPanel extends StatelessWidget {
  const _BoardPanel({
    required this.fen,
    required this.orientationWhite,
    required this.interactive,
    required this.selectedSquare,
    required this.legalTargets,
    required this.highlights,
    required this.arrows,
    required this.dimmed,
    required this.onSquareTap,
    required this.onMoveAttempt,
    required this.language,
  });

  final String fen;
  final bool orientationWhite;
  final bool interactive;
  final String? selectedSquare;
  final Set<String> legalTargets;
  final List<String> highlights;
  final List<BoardArrow> arrows;
  final bool dimmed;
  final void Function(String square) onSquareTap;
  final void Function(String from, String to) onMoveAttempt;
  final LanguageService language;

  @override
  Widget build(BuildContext context) {
    return CmPanel(
      padding: const EdgeInsets.all(14),
      child: Semantics(
        label: language.t('learn.player.boardAria'),
        child: Opacity(
          opacity: dimmed ? 0.45 : 1,
          child: IgnorePointer(
            ignoring: dimmed,
            child: AspectRatio(
              aspectRatio: 1,
              child: ChessBoardView(
                fen: fen,
                orientationWhite: orientationWhite,
                interactive: interactive,
                selectedSquare: selectedSquare,
                legalTargets: legalTargets,
                extraHighlights: highlights,
                arrows: arrows,
                onSquareTap: onSquareTap,
                onMoveAttempt: onMoveAttempt,
                showCoordinates: true,
                pieceMargin: 0.05,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TaskPanel extends StatelessWidget {
  const _TaskPanel({
    required this.language,
    required this.task,
    required this.feedback,
    required this.feedbackMessage,
  });

  final LanguageService language;
  final TaskStep task;
  final ({bool ok, String kind})? feedback;
  final String feedbackMessage;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;

    if (feedback != null) {
      final ok = feedback!.ok;
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: ok ? cm.successSoft : cm.dangerSoft,
          border: Border.all(color: ok ? cm.successBorder : cm.dangerBorder),
          borderRadius: BorderRadius.circular(CmRadius.sm),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              ok ? Icons.check_circle_rounded : Icons.error_outline_rounded,
              size: 18,
              color: ok ? cm.success : cm.danger,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                feedbackMessage,
                style: TextStyle(
                  color: ok ? cm.success : cm.danger,
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (task.hint != null) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cm.goldSoft,
          border: Border.all(color: cm.goldBorder),
          borderRadius: BorderRadius.circular(CmRadius.sm),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.lightbulb_rounded, size: 18, color: cm.gold),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                task.hint!,
                style: TextStyle(
                  color: cm.inkSoft,
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }
}

class _StateCard extends StatelessWidget {
  const _StateCard({
    required this.icon,
    required this.title,
    required this.text,
    required this.actionLabel,
    required this.onAction,
    this.tone = 'blue',
  });

  final IconData icon;
  final String title;
  final String text;
  final String actionLabel;
  final VoidCallback onAction;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return CmPanel(
      padding: const EdgeInsets.all(28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          CmIconTile(icon, tone: tone, size: 58, iconSize: 30),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            text,
            textAlign: TextAlign.center,
            style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.65),
          ),
          const SizedBox(height: 18),
          CmPrimaryButton(label: actionLabel, onPressed: onAction),
        ],
      ),
    );
  }
}

class _CompletionCard extends StatelessWidget {
  const _CompletionCard({
    required this.language,
    required this.nextRef,
    required this.nextLocked,
    required this.onNext,
    required this.onPracticeAgain,
  });

  final LanguageService language;
  final LessonRef? nextRef;
  final bool nextLocked;
  final VoidCallback? onNext;
  final VoidCallback onPracticeAgain;

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;

    return CmPanel(
      padding: const EdgeInsets.all(28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          CmIconTile(Icons.emoji_events_rounded, tone: 'green', size: 58, iconSize: 30),
          const SizedBox(height: 16),
          Text(
            language.t('learn.player.complete'),
            textAlign: TextAlign.center,
            style: tt.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            language.t('learn.player.completeText'),
            textAlign: TextAlign.center,
            style: tt.bodyMedium?.copyWith(color: cm.muted, height: 1.65),
          ),
          const SizedBox(height: 20),
          if (nextRef != null)
            nextLocked
                ? CmTag(
                    language.t('learn.player.locked'),
                    tone: 'gold',
                    icon: Icons.lock_rounded,
                  )
                : CmPrimaryButton(
                    label: language.t('learn.player.nextLesson'),
                    icon: Icons.arrow_forward_rounded,
                    onPressed: onNext,
                  ),
          const SizedBox(height: 10),
          CmSecondaryButton(
            label: language.t('learn.player.reviewLesson'),
            onPressed: onPracticeAgain,
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: () => context.go(AppRoutes.learn),
            child: Text(
              language.t('learn.player.backToCourse'),
              style: TextStyle(color: cm.muted),
            ),
          ),
        ],
      ),
    );
  }
}
