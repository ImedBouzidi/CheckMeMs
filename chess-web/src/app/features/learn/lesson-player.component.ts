import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chess, Square } from 'chess.js';
import { BORDER_TYPE, Chessboard, COLOR, INPUT_EVENT_TYPE } from 'cm-chessboard';
import { ARROW_TYPE, Arrows } from 'cm-chessboard/src/extensions/arrows/Arrows.js';
import { MARKER_TYPE, Markers } from 'cm-chessboard/src/extensions/markers/Markers.js';
import { LanguageService } from '../../core/i18n/language.service';
import {
  ArrowTone,
  BoardArrow,
  BoardOrientation,
  Course,
  Lesson,
  LessonStep,
  START_FEN,
  TaskStep
} from '../../core/models/course.models';
import { CourseService, LessonRef } from '../../core/services/course.service';
import { LearningProgressService } from '../../core/services/learning-progress.service';
import { PremiumService } from '../../core/services/premium.service';

type AccessState = 'loading' | 'ok' | 'locked' | 'missing';

interface Feedback {
  ok: boolean;
  kind: 'success' | 'correct' | 'tryAgain';
}

function normalizeSan(san: string): string {
  return san.replace(/[+#!?]/g, '').trim();
}

@Component({
  selector: 'app-lesson-player',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="cm-page player-page">
      <header class="player-header">
        <a mat-button class="player-back" routerLink="/learn">
          <mat-icon>arrow_back</mat-icon>
          {{ language.t('learn.player.back') }}
        </a>

        @if (course(); as c) {
          <div class="player-title">
            <span class="player-course">{{ c.title }}</span>
            <h1>{{ lessonRef()?.lesson?.title }}</h1>
          </div>
        }

        @if (access() === 'ok' && !completed()) {
          <span class="cm-tag cm-tag--blue">
            {{ language.t('learn.player.step', { current: stepIndex() + 1, total: totalSteps() }) }}
          </span>
        }
      </header>

      <div class="player-layout">
        <section class="board-panel" [class.board-panel--locked]="access() === 'locked' || access() === 'missing'">
          <div class="lesson-board-frame">
            <div class="indexer-row file-row top" aria-hidden="true">
              <div class="indexer-corner"></div>
              <div class="indexer-files">
                @for (file of files(); track file) {
                  <div class="indexer-label">{{ file }}</div>
                }
              </div>
              <div class="indexer-corner"></div>
            </div>

            <div class="indexer-middle">
              <div class="indexer-ranks left" aria-hidden="true">
                @for (rank of ranks(); track rank) {
                  <div class="indexer-label">{{ rank }}</div>
                }
              </div>

              <div class="chessboard-card">
                <div
                  #boardElement
                  class="lesson-board"
                  role="img"
                  [attr.aria-label]="language.t('learn.player.boardAria')"
                ></div>
              </div>

              <div class="indexer-ranks right" aria-hidden="true">
                @for (rank of ranks(); track rank) {
                  <div class="indexer-label">{{ rank }}</div>
                }
              </div>
            </div>

            <div class="indexer-row file-row bottom" aria-hidden="true">
              <div class="indexer-corner"></div>
              <div class="indexer-files">
                @for (file of files(); track file) {
                  <div class="indexer-label">{{ file }}</div>
                }
              </div>
              <div class="indexer-corner"></div>
            </div>
          </div>
        </section>

        <aside class="step-panel">
          @if (access() === 'loading') {
            <div class="state-card">
              <span class="state-icon"><mat-icon>hourglass_top</mat-icon></span>
              <h2>{{ language.t('learn.player.step', { current: 1, total: 1 }) }}</h2>
            </div>
          } @else if (access() === 'missing') {
            <div class="state-card">
              <span class="state-icon"><mat-icon>explore_off</mat-icon></span>
              <h2>{{ language.t('learn.player.notFound') }}</h2>
              <p>{{ language.t('learn.player.notFoundText') }}</p>
              <a mat-flat-button color="primary" routerLink="/learn">{{ language.t('learn.player.back') }}</a>
            </div>
          } @else if (access() === 'locked') {
            <div class="state-card">
              <span class="state-icon state-icon--gold"><mat-icon>lock</mat-icon></span>
              <h2>{{ language.t('learn.player.locked') }}</h2>
              <p>{{ language.t('learn.player.lockedText') }}</p>
              <a mat-flat-button color="primary" routerLink="/learn">{{ language.t('learn.player.back') }}</a>
            </div>
          } @else if (completed()) {
            <div class="state-card state-card--success">
              <span class="state-icon state-icon--success"><mat-icon>emoji_events</mat-icon></span>
              <h2>{{ language.t('learn.player.complete') }}</h2>
              <p>{{ language.t('learn.player.completeText') }}</p>

              <div class="cm-button-row">
                @if (nextRef(); as next) {
                  @if (nextLocked()) {
                    <span class="cm-tag cm-tag--gold">
                      <mat-icon>lock</mat-icon>
                      {{ language.t('learn.player.locked') }}
                    </span>
                  } @else {
                    <a mat-flat-button color="primary" [routerLink]="['/learn', next.course.id, next.lesson.id]">
                      {{ language.t('learn.player.nextLesson') }}
                      <mat-icon>arrow_forward</mat-icon>
                    </a>
                  }
                }
                <button mat-stroked-button type="button" (click)="practiceAgain()">
                  {{ language.t('learn.player.reviewLesson') }}
                </button>
              </div>

              <a mat-button class="state-back" routerLink="/learn">{{ language.t('learn.player.backToCourse') }}</a>
            </div>
          } @else {
            @if (step(); as s) {
              <div class="step-body">
              <div class="step-top">
                <span class="cm-tag cm-tag--blue">
                  {{ language.t('learn.player.step', { current: stepIndex() + 1, total: totalSteps() }) }}
                </span>
                @if (s.kind === 'task') {
                  <span class="cm-tag" [class.cm-tag--green]="isSolved()">
                    <mat-icon>{{ isSolved() ? 'check_circle' : 'touch_app' }}</mat-icon>
                    {{ isSolved() ? language.t('learn.player.solved') : language.t('learn.player.yourMove') }}
                  </span>
                }
              </div>

              <div class="step-track" role="progressbar" [attr.aria-valuenow]="percent()" aria-valuemin="0" aria-valuemax="100">
                <span [style.width.%]="percent()"></span>
              </div>

              @if (s.title) {
                <h2 class="step-title">{{ s.title }}</h2>
              }
              @if (s.text) {
                <p class="step-text">{{ s.text }}</p>
              }

              @if (taskStep(); as task) {
                <div class="task-panel" [class.task-panel--ok]="isSolved()">
                  @if (feedback(); as f) {
                    <p class="task-feedback" [class.task-feedback--ok]="f.ok">
                      <mat-icon>{{ f.ok ? 'check_circle' : 'error_outline' }}</mat-icon>
                      <span>{{ feedbackMessage(f) }}</span>
                    </p>
                  } @else if (task.hint) {
                    <p class="task-hint">
                      <mat-icon>lightbulb</mat-icon>
                      <span>{{ task.hint }}</span>
                    </p>
                  }
                </div>
              }

              <div class="step-actions">
                <button mat-stroked-button type="button" [disabled]="stepIndex() === 0" (click)="previous()">
                  {{ language.t('learn.player.previous') }}
                </button>
                <button mat-flat-button color="primary" type="button" [disabled]="!canAdvance()" (click)="next()">
                  {{ isLastStep() ? language.t('learn.player.finish') : language.t('learn.player.next') }}
                </button>
              </div>
            </div>
            }
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .player-page {
      max-width: 1180px;
    }

    .player-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 18px;
      margin-bottom: 24px;
    }

    .player-back {
      flex: 0 0 auto;
      margin-inline-start: -12px;
      color: var(--cm-muted);
    }

    .player-title {
      flex: 1 1 240px;
      min-width: 0;
    }

    .player-course {
      display: block;
      color: var(--cm-primary-dark);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .player-title h1 {
      margin: 4px 0 0;
      color: var(--cm-ink);
      font-size: clamp(1.35rem, 2.6vw, 1.9rem);
      font-weight: 750;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }

    .player-layout {
      display: grid;
      grid-template-columns: minmax(320px, 660px) minmax(320px, 1fr);
      gap: clamp(20px, 3vw, 34px);
      align-items: start;
    }

    .board-panel {
      position: sticky;
      top: 84px;
      min-width: 0;
      padding: clamp(10px, 1.6vw, 18px);
      border: 1px solid var(--cm-line);
      border-radius: 24px;
      background: var(--cm-surface);
      box-shadow: var(--cm-shadow);
    }

    .lesson-board-frame {
      display: flex;
      width: 100%;
      max-width: 620px;
      margin-inline: auto;
      flex-direction: column;
      overflow: hidden;
      border: 3px solid #243528;
      border-radius: 12px;
      background: #243528;
      box-shadow:
        0 16px 36px -6px rgba(0, 0, 0, 0.35),
        0 8px 16px rgba(0, 0, 0, 0.2);
      direction: ltr;
    }

    .indexer-row {
      display: flex;
      width: 100%;
      height: 24px;
      align-items: center;
    }

    .indexer-corner {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .indexer-files {
      display: grid;
      flex: 1;
      height: 100%;
      grid-template-columns: repeat(8, 1fr);
    }

    .indexer-middle {
      display: flex;
      width: 100%;
      align-items: stretch;
    }

    .indexer-ranks {
      display: grid;
      width: 24px;
      flex-shrink: 0;
      grid-template-rows: repeat(8, 1fr);
    }

    .indexer-label {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
      font-family: inherit;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
      user-select: none;
    }

    .chessboard-card {
      position: relative;
      flex: 1;
      width: 100%;
      min-width: 0;
      aspect-ratio: 1;
      overflow: hidden;
      background: #243528;
    }

    .lesson-board {
      width: 100%;
      height: 100%;
      aspect-ratio: 1;
    }

    .board-panel--locked .lesson-board-frame {
      filter: blur(3px);
      opacity: 0.5;
    }

    .step-panel {
      min-height: 320px;
      padding: clamp(22px, 3vw, 30px);
      border: 1px solid var(--cm-line);
      border-radius: 24px;
      background: var(--cm-surface);
      box-shadow: var(--cm-shadow-sm);
    }

    .step-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .step-track {
      overflow: hidden;
      height: 5px;
      margin: 18px 0 22px;
      border-radius: 999px;
      background: #eef2f7;
    }

    .step-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #6366f1, #22c55e);
      transition: width 0.3s ease;
    }

    .step-title {
      margin: 0 0 10px;
      color: var(--cm-ink);
      font-size: clamp(1.25rem, 2.2vw, 1.55rem);
      font-weight: 750;
      line-height: 1.2;
      letter-spacing: -0.025em;
    }

    .step-text {
      margin: 0;
      color: var(--cm-muted);
      font-size: 0.95rem;
      line-height: 1.7;
    }

    .task-panel {
      margin-top: 22px;
      padding: 14px 16px;
      border: 1px solid #fde68a;
      border-radius: 14px;
      background: #fffbeb;
    }

    .task-panel--ok {
      border-color: #a7f3d0;
      background: var(--cm-success-soft);
    }

    .task-hint,
    .task-feedback {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0;
      color: #92400e;
      font-size: 0.83rem;
      line-height: 1.5;
    }

    .task-feedback--ok {
      color: var(--cm-success);
    }

    .task-hint mat-icon,
    .task-feedback mat-icon {
      flex: 0 0 auto;
      width: 17px;
      height: 17px;
      font-size: 17px;
    }

    .step-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 28px;
    }

    .state-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      padding: 20px;
      text-align: center;
    }

    .state-card h2 {
      margin: 16px 0 6px;
      color: var(--cm-ink);
      font-size: 1.3rem;
      font-weight: 750;
      letter-spacing: -0.02em;
    }

    .state-card p {
      max-width: 42ch;
      margin: 0 0 18px;
      color: var(--cm-muted);
      font-size: 0.9rem;
      line-height: 1.65;
    }

    .state-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 58px;
      height: 58px;
      border-radius: 18px;
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .state-icon mat-icon {
      width: 30px;
      height: 30px;
      font-size: 30px;
    }

    .state-icon--gold {
      background: var(--cm-gold-soft);
      color: #a16207;
    }

    .state-icon--success {
      background: var(--cm-success-soft);
      color: var(--cm-success);
    }

    .state-card .cm-button-row {
      justify-content: center;
    }

    .state-back {
      margin-top: 10px;
      color: var(--cm-muted);
    }

    @media (max-width: 1200px) {
      .player-layout {
        grid-template-columns: 1fr;
      }

      .board-panel {
        position: static;
      }
    }

    @media (max-width: 520px) {
      .board-panel,
      .step-panel {
        border-radius: 18px;
      }

      .indexer-label {
        font-size: 0.65rem;
      }

      .indexer-row {
        height: 18px;
      }

      .indexer-corner {
        width: 14px;
        height: 18px;
      }

      .indexer-ranks {
        width: 14px;
      }

      .step-actions {
        flex-direction: column-reverse;
      }

      .step-actions button {
        width: 100%;
      }
    }
  `]
})
export class LessonPlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('boardElement', { static: true }) private boardElement!: ElementRef<HTMLElement>;

  readonly language = inject(LanguageService);

  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly progress = inject(LearningProgressService);
  private readonly premium = inject(PremiumService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly courseId = signal<string | null>(null);
  private readonly lessonId = signal<string | null>(null);

  readonly course = computed<Course | null>(() => {
    const courseId = this.courseId();
    return courseId ? this.courseService.getCourse(courseId) : null;
  });
  readonly lessonRef = computed<LessonRef | null>(() => {
    const course = this.course();
    const lessonId = this.lessonId();
    return course && lessonId ? this.courseService.getLessonRef(course.id, lessonId) : null;
  });
  readonly access = signal<AccessState>('loading');
  readonly stepIndex = signal(0);
  readonly solved = signal<ReadonlySet<number>>(new Set<number>());
  readonly feedback = signal<Feedback | null>(null);
  readonly completed = signal(false);

  private readonly taskCursor = signal(0);
  private board: Chessboard | null = null;
  private taskChess = new Chess();
  private pendingMove: { from: string; to: string } | null = null;

  private readonly orientation = signal<BoardOrientation>('white');
  readonly files = computed<ReadonlyArray<string>>(() =>
    this.orientation() === 'black'
      ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
      : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  );
  readonly ranks = computed<ReadonlyArray<string>>(() =>
    this.orientation() === 'black'
      ? ['1', '2', '3', '4', '5', '6', '7', '8']
      : ['8', '7', '6', '5', '4', '3', '2', '1']
  );

  readonly steps = computed<LessonStep[]>(() => this.lessonRef()?.lesson.steps ?? []);
  readonly step = computed<LessonStep | null>(() => this.steps()[this.stepIndex()] ?? null);
  readonly taskStep = computed<TaskStep | null>(() => {
    const step = this.step();
    return step?.kind === 'task' ? step : null;
  });
  readonly totalSteps = computed(() => this.steps().length);
  readonly isLastStep = computed(() => this.stepIndex() >= this.totalSteps() - 1);
  readonly isSolved = computed(() => this.solved().has(this.stepIndex()));

  readonly percent = computed(() => {
    const total = this.totalSteps();
    if (total <= 1) return 100;
    return Math.round((this.stepIndex() / (total - 1)) * 100);
  });

  readonly canAdvance = computed(() => {
    const step = this.step();
    if (!step) return false;
    return step.kind !== 'task' || this.isSolved();
  });

  readonly nextRef = computed<LessonRef | null>(() => {
    const ref = this.lessonRef();
    return ref ? this.courseService.nextLesson(ref.course.id, ref.lesson.id) : null;
  });

  readonly nextLocked = computed(() => {
    const next = this.nextRef();
    return next ? !this.premium.canOpenLesson(next.course, next.lesson, next.index) : false;
  });

  ngAfterViewInit(): void {
    this.initBoard();
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => this.loadLesson(params.get('courseId'), params.get('lessonId')));
  }

  ngOnDestroy(): void {
    if (this.board) {
      try {
        this.board.destroy();
      } catch {
        // Ignore teardown races.
      }
      this.board = null;
    }
  }

  next(): void {
    if (!this.canAdvance()) return;

    if (this.isLastStep()) {
      this.finishLesson();
      return;
    }

    this.stepIndex.update(index => index + 1);
    this.renderStep();
  }

  previous(): void {
    if (this.stepIndex() === 0) return;
    this.stepIndex.update(index => index - 1);
    this.renderStep();
  }

  practiceAgain(): void {
    this.completed.set(false);
    this.solved.set(new Set<number>());
    this.stepIndex.set(0);
    this.renderStep();
  }

  feedbackMessage(feedback: Feedback): string {
    if (feedback.kind === 'tryAgain') return this.language.t('learn.player.tryAgain');
    if (feedback.kind === 'success') {
      return this.taskStep()?.success ?? this.language.t('learn.player.correct');
    }
    return this.language.t('learn.player.correct');
  }

  private initBoard(): void {
    this.board = new Chessboard(this.boardElement.nativeElement, {
      position: START_FEN,
      orientation: COLOR.white,
      assetsUrl: '/assets/cm-chessboard/',
      style: {
        cssClass: 'green',
        showCoordinates: false,
        borderType: BORDER_TYPE.none
      },
      responsive: true,
      extensions: [{ class: Markers }, { class: Arrows, props: { headSize: 8, offsetTo: 0.6 } }]
    });
  }

  private loadLesson(courseId: string | null, lessonId: string | null): void {
    this.completed.set(false);
    this.feedback.set(null);
    this.solved.set(new Set<number>());
    this.stepIndex.set(0);
    this.taskCursor.set(0);
    this.taskChess = new Chess();

    this.courseId.set(courseId);
    this.lessonId.set(lessonId);

    const course = this.course();
    const ref = this.lessonRef();

    if (!course || !ref) {
      this.access.set('missing');
      this.board?.disableMoveInput();
      this.hideLegalMoves();
      this.setBoardOrientation('white');
      void this.board?.setPosition(START_FEN);
      return;
    }

    this.progress.markOpened(course.id, ref.lesson.id);

    const unlocked = this.premium.canOpenLesson(course, ref.lesson, ref.index);
    this.access.set(unlocked ? 'ok' : 'locked');

    if (!unlocked) {
      this.board?.disableMoveInput();
      this.hideLegalMoves();
      this.setBoardOrientation('white');
      void this.board?.setPosition(START_FEN);
      return;
    }

    this.renderStep();
  }

  private renderStep(): void {
    const step = this.step();
    if (!this.board || !step || this.access() !== 'ok') return;

    this.clearDecorations();
    this.feedback.set(null);

    if (step.kind === 'task') {
      this.setBoardOrientation(step.orientation);
      this.taskChess = new Chess(step.fen);
      this.taskCursor.set(0);
      void this.board.setPosition(step.fen, true);

      if (this.isSolved()) {
        this.board.disableMoveInput();
        this.feedback.set({ ok: true, kind: 'success' });
      } else {
        const turn = this.taskChess.turn() === 'b' ? COLOR.black : COLOR.white;
        this.board.enableMoveInput(this.onMoveInput, turn);
      }
      return;
    }

    this.board.disableMoveInput();

    if (step.kind === 'position') {
      this.setBoardOrientation(step.orientation);
      void this.board.setPosition(step.fen, true);
      for (const arrow of step.arrows ?? []) this.drawArrow(arrow);
      for (const square of step.highlights ?? []) this.addHighlight(square);
      return;
    }

    if (step.kind === 'pgn') {
      this.setBoardOrientation('white');
      const chess = new Chess();
      try {
        chess.loadPgn(step.pgn);
      } catch {
        chess.reset();
      }
      void this.board.setPosition(chess.fen(), true);
      return;
    }

    this.setBoardOrientation('white');
    void this.board.setPosition(START_FEN);
  }

  private readonly onMoveInput = (event: any): boolean => {
    switch (event.type) {
      case INPUT_EVENT_TYPE.moveInputStarted: {
        if (!event.squareFrom) return false;
        const piece = this.taskChess.get(event.squareFrom as Square);
        if (!piece || piece.color !== this.taskChess.turn()) {
          this.hideLegalMoves();
          return false;
        }
        this.showLegalMoves(event.squareFrom);
        return true;
      }

      case INPUT_EVENT_TYPE.validateMoveInput: {
        if (!event.squareFrom || !event.squareTo) return false;
        this.pendingMove = { from: event.squareFrom, to: event.squareTo };
        try {
          const probe = new Chess(this.taskChess.fen());
          probe.move({ from: event.squareFrom, to: event.squareTo, promotion: 'q' });
          return true;
        } catch {
          return false;
        }
      }

      case INPUT_EVENT_TYPE.moveInputFinished: {
        this.hideLegalMoves();
        const from = event.squareFrom ?? this.pendingMove?.from;
        const to = event.squareTo ?? this.pendingMove?.to;
        this.pendingMove = null;
        if (from && to) this.tryTaskMove(from, to);
        return true;
      }

      case INPUT_EVENT_TYPE.moveInputCanceled:
        this.hideLegalMoves();
        this.pendingMove = null;
        return true;

      default:
        return true;
    }
  };

  private showLegalMoves(square: string): void {
    const board = this.board as any;
    if (!board?.addLegalMovesMarkers) return;

    board.removeLegalMovesMarkers?.();
    const moves = this.taskChess.moves({ square: square as Square, verbose: true });
    if (moves.length) board.addLegalMovesMarkers(moves);
  }

  private hideLegalMoves(): void {
    (this.board as any)?.removeLegalMovesMarkers?.();
  }

  private tryTaskMove(from: string, to: string): void {
    const step = this.taskStep();
    if (!step) return;

    const expected = normalizeSan(step.solution[this.taskCursor()] ?? '');
    let played: string;

    try {
      played = normalizeSan(this.taskChess.move({ from, to, promotion: 'q' }).san);
    } catch {
      return;
    }

    if (!expected || played !== expected) {
      this.taskChess.undo();
      void this.board?.setPosition(this.taskChess.fen(), true);
      this.feedback.set({ ok: false, kind: 'tryAgain' });
      return;
    }

    let cursor = this.taskCursor() + 1;

    // Odd indices are scripted opponent replies.
    if (cursor < step.solution.length) {
      try {
        this.taskChess.move(step.solution[cursor]);
        void this.board?.setPosition(this.taskChess.fen(), true);
      } catch {
        // A malformed scripted reply ends the task instead of trapping the learner.
        cursor = step.solution.length;
      }
      cursor += 1;
    }

    this.taskCursor.set(cursor);

    if (cursor >= step.solution.length) {
      const solved = new Set(this.solved());
      solved.add(this.stepIndex());
      this.solved.set(solved);
      this.board?.disableMoveInput();
      this.feedback.set({ ok: true, kind: 'success' });
      return;
    }

    this.feedback.set({ ok: true, kind: 'correct' });
  }

  private setBoardOrientation(orientation?: BoardOrientation): void {
    const next = orientation === 'black' ? 'black' : 'white';
    const color = next === 'black' ? COLOR.black : COLOR.white;
    this.orientation.set(next);
    if (this.board && this.board.getOrientation() !== color) {
      this.board.setOrientation(color);
    }
  }

  private finishLesson(): void {
    const ref = this.lessonRef();
    if (!ref) return;

    this.progress.completeLesson(ref.course.id, ref.lesson.id);
    this.board?.disableMoveInput();
    this.hideLegalMoves();
    this.completed.set(true);
  }

  private drawArrow(arrow: BoardArrow): void {
    const board = this.board as any;
    board?.addArrow?.(this.arrowType(arrow.tone), arrow.from, arrow.to);
  }

  private addHighlight(square: string): void {
    const board = this.board as any;
    board?.addMarker?.(MARKER_TYPE.frame, square);
  }

  private clearDecorations(): void {
    const board = this.board as any;
    board?.removeArrows?.();
    board?.removeMarkers?.();
    board?.removeLegalMovesMarkers?.();
  }

  private arrowType(tone: ArrowTone | undefined): unknown {
    switch (tone) {
      case 'success':
        return ARROW_TYPE.success;
      case 'warning':
        return ARROW_TYPE.warning;
      case 'info':
        return ARROW_TYPE.info;
      case 'danger':
        return ARROW_TYPE.danger;
      case 'secondary':
        return ARROW_TYPE.secondary;
      default:
        return ARROW_TYPE.default;
    }
  }
}
