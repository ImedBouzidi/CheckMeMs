import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { Chessboard, BORDER_TYPE, COLOR } from 'cm-chessboard';
import { Markers } from 'cm-chessboard/src/extensions/markers/Markers.js';
import { Arrows, ARROW_TYPE } from 'cm-chessboard/src/extensions/arrows/Arrows.js';

import { LanguageService } from '../../core/i18n/language.service';
import { AnalysisService } from '../../core/services/analysis.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AnalysisReport,
  MoveGrade,
  MoveAnalysisApiService,
  PlayerSummary,
  ReviewedMove,
  playerOpening as resolvePlayerOpening
} from '../../core/services/move-analysis-api.service';

type ReviewState = 'loading' | 'running' | 'ready' | 'failed';

const GRADE_ORDER: MoveGrade[] = ['brilliant', 'great', 'good', 'inaccuracy', 'mistake', 'blunder', 'book', 'forced'];

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="cm-page analysis-page">
      <header class="cm-page-header">
        <div class="cm-page-heading">
          <span class="cm-eyebrow"><mat-icon>insights</mat-icon> {{ language.t('analysis.eyebrow') }}</span>
          <h1 class="cm-page-title">{{ report ? language.t('analysis.reportTitle') : (requestId ? language.t('analysis.reviewTitle') : language.t('analysis.title')) }}</h1>
          <p class="cm-page-subtitle" *ngIf="!report">
            {{ language.t('analysis.subtitle') }}
          </p>
        </div>
        <div class="cm-page-actions">
          <button mat-stroked-button *ngIf="requestId" type="button" (click)="goToPlay()">
            <mat-icon>sports_esports</mat-icon> {{ language.t('analysis.newGame') }}
          </button>
          <span class="cm-tag cm-tag--gold" *ngIf="!requestId">{{ language.t('common.inDevelopment') }}</span>
        </div>
      </header>

      <!-- No report requested yet: keep describing the feature. -->
      <ng-container *ngIf="!requestId">
        <section class="analysis-stage">
          <div class="import-panel">
            <div class="drop-zone" aria-disabled="true">
              <span class="drop-icon"><mat-icon>upload_file</mat-icon></span>
              <h2>{{ language.t('analysis.import') }}</h2>
              <p>{{ language.t('analysis.importText') }}</p>
              <div class="cm-button-row">
                <button mat-flat-button color="primary" type="button" disabled>{{ language.t('analysis.choosePgn') }}</button>
                <button mat-stroked-button type="button" disabled>{{ language.t('analysis.savedGames') }}</button>
              </div>
            </div>

            <div class="cm-note">
              <mat-icon>info</mat-icon>
              <span>{{ language.t('analysis.botHint') }}</span>
            </div>
          </div>

          <aside class="review-preview" [attr.aria-label]="language.t('analysis.reportEyebrow')">
            <div class="preview-heading">
              <div>
                <span class="preview-eyebrow">{{ language.t('analysis.reportEyebrow') }}</span>
                <h2>{{ language.t('analysis.reportTitle') }}</h2>
              </div>
              <span class="cm-tag">{{ language.t('common.preview') }}</span>
            </div>

            <div class="preview-board" aria-hidden="true">
              <div class="preview-row">
                <span class="row-number">01</span>
                <span class="row-bar row-bar--wide"></span>
                <span class="quality quality--good">{{ language.t('analysis.best') }}</span>
              </div>
              <div class="preview-row">
                <span class="row-number">02</span>
                <span class="row-bar row-bar--medium"></span>
                <span class="quality quality--neutral">{{ language.t('analysis.book') }}</span>
              </div>
              <div class="preview-row">
                <span class="row-number">03</span>
                <span class="row-bar row-bar--short"></span>
                <span class="quality quality--loss">{{ language.t('analysis.miss') }}</span>
              </div>
            </div>

            <div class="preview-summary">
              <div>
                <span class="summary-label">{{ language.t('analysis.accuracy') }}</span>
                <strong>{{ language.t('analysis.comingSoon') }}</strong>
              </div>
              <div>
                <span class="summary-label">{{ language.t('analysis.keyMoments') }}</span>
                <strong>{{ language.t('analysis.moveByMove') }}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section class="cm-section" aria-labelledby="review-features-title">
          <div class="cm-section-heading">
            <h2 id="review-features-title" class="cm-section-title">{{ language.t('analysis.featuresTitle') }}</h2>
          </div>
          <div class="cm-feature-grid">
            <article class="cm-feature-card">
              <span class="cm-icon-tile"><mat-icon>route</mat-icon></span>
              <h3>{{ language.t('analysis.f1Title') }}</h3>
              <p>{{ language.t('analysis.f1Text') }}</p>
            </article>
            <article class="cm-feature-card">
              <span class="cm-icon-tile cm-icon-tile--gold"><mat-icon>show_chart</mat-icon></span>
              <h3>{{ language.t('analysis.f2Title') }}</h3>
              <p>{{ language.t('analysis.f2Text') }}</p>
            </article>
            <article class="cm-feature-card">
              <span class="cm-icon-tile cm-icon-tile--green"><mat-icon>auto_awesome</mat-icon></span>
              <h3>{{ language.t('analysis.f3Title') }}</h3>
              <p>{{ language.t('analysis.f3Text') }}</p>
            </article>
          </div>
        </section>
      </ng-container>

      <!-- A finished game was handed to the engine service. -->
      <ng-container *ngIf="requestId">
        <div class="review-progress" *ngIf="state === 'loading' || state === 'running'" role="status" aria-live="polite">
          <div class="progress-hero">
            <span class="engine-pulse" aria-hidden="true"><mat-icon>memory</mat-icon></span>
            <div class="progress-copy">
              <span class="progress-eyebrow">{{ language.t('analysis.progress.eyebrow') }}</span>
              <h2>{{ progressTitle() }}</h2>
              <p>{{ language.t('analysis.progress.subtitle') }}</p>
            </div>
            <div class="progress-clock">
              <strong>{{ formatElapsed(elapsedSeconds) }}</strong>
              <span>{{ language.t('analysis.progress.elapsed') }}</span>
            </div>
          </div>

          <div class="progress-track">
            <mat-progress-bar
              [mode]="progressPercent === null ? 'indeterminate' : 'determinate'"
              [value]="progressPercent ?? 0">
            </mat-progress-bar>
            <div class="progress-track-meta">
              <span>{{ language.t('analysis.progress.movesDone', { done: analysedCount }) }}</span>
              <span *ngIf="progressPercent !== null">{{ progressPercent }}%</span>
            </div>
          </div>

          <div class="progress-chips">
            <span class="progress-chip">
              <mat-icon>my_location</mat-icon>
              {{ expectedPlayerPlies ? language.t('analysis.progress.ofTotal', { total: expectedPlayerPlies }) : language.t('analysis.progress.engineLabel') }}
            </span>
            <span class="progress-chip" *ngIf="estimatedRemainingSeconds !== null">
              <mat-icon>timer</mat-icon>
              {{ language.t('analysis.progress.remaining', { time: formatElapsed(estimatedRemainingSeconds) }) }}
            </span>
            <span class="progress-chip progress-chip--warn" *ngIf="elapsedSeconds > 45">
              <mat-icon>hourglass_bottom</mat-icon>
              {{ language.t('analysis.progress.longWait') }}
            </span>
          </div>

          <div class="progress-live" *ngIf="analysedCount > 0">
            <div class="progress-live-head">
              <span class="live-dot" aria-hidden="true"></span>
              <span>{{ language.t('analysis.progress.latest') }}</span>
              <span class="live-tally" *ngIf="liveGradeEntries().length">
                <span class="grade grade--{{ entry.grade }}" *ngFor="let entry of liveGradeEntries()">
                  <mat-icon class="grade-icon">{{ gradeIcon(entry.grade) }}</mat-icon>
                  {{ gradeLabel(entry.grade) }} {{ entry.count }}
                </span>
              </span>
            </div>
            <div class="progress-live-list">
              <div class="live-move" *ngFor="let move of recentMoves()">
                <span class="live-move-label">{{ moveLabel(move) }}</span>
                <span class="grade grade--{{ move.grade }}">
                  <mat-icon class="grade-icon">{{ gradeIcon(move.grade) }}</mat-icon>
                  {{ gradeLabel(move.grade) }}
                </span>
                <span class="live-move-eval">{{ evalText(move.evalAfterCp, move.evalAfterMate) }}</span>
              </div>
            </div>
          </div>
          <p class="progress-empty" *ngIf="analysedCount === 0">
            {{ language.t('analysis.progress.waiting') }}
          </p>

          <div class="progress-tip">
            <mat-icon>lightbulb</mat-icon>
            <div>
              <strong>{{ language.t('analysis.progress.tipTitle') }}</strong>
              <span>{{ language.t('analysis.progress.tipText') }}</span>
            </div>
          </div>
        </div>

        <div class="review-state review-state--failed" *ngIf="state === 'failed'" role="alert">
          <mat-icon>{{ needsSignIn ? 'lock' : 'cloud_off' }}</mat-icon>
          <p>{{ language.t(needsSignIn ? 'bot.analysis.needSignIn' : 'analysis.failed') }}</p>
          <button mat-stroked-button *ngIf="needsSignIn" type="button" (click)="signIn()">
            <mat-icon>login</mat-icon> {{ language.t('nav.login') }}
          </button>
        </div>

        <section class="review-stage" *ngIf="state === 'ready' && report">
          <div class="review-board-col">
            <div #reviewBoard class="review-board" [attr.aria-label]="language.t('analysis.boardAria')"></div>

            <div class="move-nav" role="group" [attr.aria-label]="language.t('analysis.yourMoves')">
              <button
                mat-icon-button
                type="button"
                class="move-nav-btn"
                (click)="goToPreviousMove()"
                [disabled]="!canGoPrevious"
                [attr.aria-label]="language.t('analysis.prev')"
                [matTooltip]="language.t('analysis.prev')">
                <mat-icon>chevron_left</mat-icon>
              </button>

              <div class="move-nav-status">
                <span class="move-nav-counter">
                  {{ language.t('analysis.moveCounter', { current: selectedMovePosition, total: playerMoves.length }) }}
                </span>
                <span class="move-nav-side">
                  <mat-icon>person</mat-icon>
                  {{ language.t('analysis.yourMoves') }} · {{ sideLabel }}
                </span>
              </div>

              <button
                mat-icon-button
                type="button"
                class="move-nav-btn"
                (click)="goToNextMove()"
                [disabled]="!canGoNext"
                [attr.aria-label]="language.t('analysis.next')"
                [matTooltip]="language.t('analysis.next')">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
            <p class="move-nav-hint">{{ language.t('analysis.keyboardHint') }}</p>

            <div class="eval-strip">
              <div class="eval-bar" aria-hidden="true">
                <div class="eval-bar-white" [style.height.%]="selectedBarPercent"></div>
              </div>
              <div class="eval-card" *ngIf="selected as move">
                <div class="eval-card-head">
                  <span class="move-label">{{ moveLabel(move) }}</span>
                  <span class="grade" [ngClass]="'grade--' + move.grade">
                    <mat-icon class="grade-icon">{{ gradeIcon(move.grade) }}</mat-icon>
                    {{ gradeLabel(move.grade) }}
                  </span>
                </div>
                <div class="eval-card-grid">
                  <div>
                    <span class="summary-label">{{ language.t('analysis.evalBefore') }}</span>
                    <strong>{{ evalText(move.evalBeforeCp, move.evalBeforeMate) }}</strong>
                  </div>
                  <div>
                    <span class="summary-label">{{ language.t('analysis.evalAfter') }}</span>
                    <strong>{{ evalText(move.evalAfterCp, move.evalAfterMate) }}</strong>
                  </div>
                  <div>
                    <span class="summary-label">{{ language.t('analysis.bestMove') }}</span>
                    <strong>{{ move.bestMoveSan || '—' }}</strong>
                  </div>
                  <div>
                    <span class="summary-label">{{ language.t('analysis.cpLoss') }}</span>
                    <strong>{{ move.cpLoss }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="review-side">
            <div class="eval-graph" *ngIf="report.moves.length > 1">
              <div class="eval-graph-head">
                <span class="summary-label">{{ language.t('analysis.graph.title') }}</span>
                <span class="eval-graph-legend">{{ language.t('analysis.graph.legend') }}</span>
              </div>
              <svg
                class="eval-graph-svg"
                viewBox="0 0 320 100"
                preserveAspectRatio="none"
                role="img"
                [attr.aria-label]="language.t('analysis.graph.title')">
                <line class="graph-mid" x1="0" y1="50" x2="320" y2="50"></line>
                <path class="graph-area" [attr.d]="graphAreaPath()"></path>
                <polyline class="graph-line" [attr.points]="graphLinePoints()"></polyline>
                <rect
                  class="graph-hit"
                  *ngFor="let point of graphPoints()"
                  [attr.x]="point.hitX"
                  y="0"
                  [attr.width]="point.hitWidth"
                  height="100"
                  (click)="selectMove(point.move, true)">
                </rect>
                <circle
                  class="graph-point"
                  *ngFor="let point of graphPoints()"
                  [class.is-active]="point.move === selected"
                  [attr.cx]="point.x"
                  [attr.cy]="point.y"
                  r="1.8">
                </circle>
              </svg>
            </div>

            <div class="opening-chip" *ngIf="playerOpening(report.opening, playerSide) as info"
                 [matTooltip]="info.name">
              <mat-icon>menu_book</mat-icon>
              <span class="opening-kind"
                    [class.opening-kind--defense]="info.kind === 'defense'">{{ language.t(info.labelKey) }}</span>
              <span class="opening-eco">{{ info.eco }}</span>
              <span class="opening-name">{{ info.name }}</span>
            </div>

            <div class="summary-cards">
              <div class="summary-card">
                <span class="summary-label">{{ language.t('analysis.yourMoves') }}</span>
                <strong>{{ playerMoves.length }}</strong>
              </div>
              <div class="summary-card">
                <span class="summary-label">{{ language.t('analysis.depthLabel') }}</span>
                <strong>{{ report.summary?.depth ?? '—' }}</strong>
              </div>
              <div class="summary-card">
                <span class="summary-label">{{ language.t('analysis.avgLoss') }}</span>
                <strong>{{ playerSummary?.averageCpLoss ?? '—' }}</strong>
              </div>
            </div>

            <div class="review-focus">
              <mat-icon>person</mat-icon>
              <div>
                <strong>{{ language.t('analysis.reviewingYourMoves', { color: sideLabel }) }}</strong>
                <span>{{ language.t('analysis.opponentHidden') }}</span>
              </div>
            </div>

            <div class="grade-legend" *ngIf="report.summary">
              <span
                class="grade grade--{{ entry.grade }}"
                *ngFor="let entry of legendEntries()">
                <mat-icon class="grade-icon">{{ gradeIcon(entry.grade) }}</mat-icon>
                {{ gradeLabel(entry.grade) }} · {{ entry.count }}
              </span>
            </div>

            <button
              mat-stroked-button
              class="key-moment-btn"
              type="button"
              (click)="jumpToNextKeyMoment()"
              [disabled]="!hasKeyMoments">
              <mat-icon>bolt</mat-icon> {{ language.t('analysis.jump.keyMoment') }}
            </button>

            <div class="moves-scroll" #movesScroll>
              <button
                class="move-line"
                *ngFor="let move of playerMoves; trackBy: trackByPly"
                type="button"
                [class.is-selected]="selected === move"
                (click)="selectMove(move)">
                <span class="move-number">{{ moveNumberLabel(move) }}</span>
                <span class="move-san">{{ move.san }}</span>
                <span class="grade grade--{{ move.grade }}">
                  <mat-icon class="grade-icon">{{ gradeIcon(move.grade) }}</mat-icon>
                  {{ gradeLabel(move.grade) }}
                </span>
                <span class="move-eval">{{ evalText(move.evalAfterCp, move.evalAfterMate) }}</span>
              </button>
            </div>
          </aside>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .analysis-page {
      max-width: 1160px;
    }

    .analysis-stage {
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
      gap: 22px;
      align-items: stretch;
    }

    .import-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .drop-zone {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 330px;
      padding: 36px;
      border: 1.5px dashed #b9cae0;
      border-radius: 24px;
      background:
        radial-gradient(300px 180px at 50% 0%, rgba(219, 234, 254, 0.5), transparent 72%),
        rgba(255, 255, 255, 0.72);
      text-align: center;
    }

    .drop-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 58px;
      height: 58px;
      margin-bottom: 14px;
      border: 1px solid #bfdbfe;
      border-radius: 18px;
      background: #eff6ff;
      color: var(--cm-primary);
    }

    .drop-icon mat-icon {
      width: 29px;
      height: 29px;
      font-size: 29px;
    }

    .drop-zone h2 {
      margin: 0;
      color: var(--cm-ink);
      font-size: 1.35rem;
      font-weight: 750;
      letter-spacing: -0.03em;
    }

    .drop-zone p {
      max-width: 44ch;
      margin: 8px 0 20px;
      color: var(--cm-muted);
      font-size: 0.9rem;
      line-height: 1.6;
    }

    .drop-zone .cm-button-row {
      justify-content: center;
    }

    .review-preview {
      display: flex;
      flex-direction: column;
      padding: 24px;
      border: 1px solid #dbe3ee;
      border-radius: 24px;
      background:
        radial-gradient(260px 180px at 100% 0%, rgba(226, 232, 240, 0.8), transparent 70%),
        #ffffff;
      box-shadow: var(--cm-shadow);
    }

    .preview-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .preview-eyebrow {
      color: var(--cm-muted-light);
      font-size: 0.64rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .preview-heading h2 {
      margin: 4px 0 0;
      color: var(--cm-ink);
      font-size: 1.15rem;
      font-weight: 750;
      letter-spacing: -0.025em;
    }

    .preview-board {
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: center;
      gap: 12px;
      margin: 24px 0;
      padding: 20px;
      border-radius: 16px;
      background: #0f172a;
    }

    .preview-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .row-number {
      width: 22px;
      color: #64748b;
      font-family: monospace;
      font-size: 0.7rem;
    }

    .row-bar {
      height: 7px;
      border-radius: 999px;
      background: linear-gradient(90deg, #60a5fa, #2563eb);
    }

    .row-bar--wide { width: 58%; }
    .row-bar--medium { width: 41%; background: linear-gradient(90deg, #94a3b8, #64748b); }
    .row-bar--short { width: 26%; background: linear-gradient(90deg, #f87171, #dc2626); }

    .quality {
      margin-left: auto;
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 0.62rem;
      font-weight: 800;
    }

    .quality--good { background: #064e3b; color: #a7f3d0; }
    .quality--neutral { background: #1e293b; color: #cbd5e1; }
    .quality--loss { background: #450a0a; color: #fecaca; }

    .preview-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .preview-summary div {
      padding: 11px 12px;
      border: 1px solid #eef2f7;
      border-radius: 11px;
      background: #f8fafc;
    }

    .summary-label {
      display: block;
      margin-bottom: 3px;
      color: var(--cm-muted-light);
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .preview-summary strong {
      color: var(--cm-ink-soft);
      font-size: 0.8rem;
    }

    /* ---------- live review ---------- */

    .review-state {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 26px;
      border: 1px solid var(--cm-line);
      border-radius: 20px;
      background: var(--cm-surface);
      color: var(--cm-muted);
      text-align: center;
    }

    .review-state p {
      margin: 0;
      font-size: 0.9rem;
    }

    .review-state--failed {
      border-color: #fecaca;
      background: #fef2f2;
      color: #b91c1c;
    }

    .review-state--failed mat-icon {
      align-self: center;
      font-size: 26px;
      width: 26px;
      height: 26px;
    }

    .review-state--failed button {
      align-self: center;
    }

    /* ---------- engine progress ---------- */

    .review-progress {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 26px;
      border: 1px solid var(--cm-line);
      border-radius: 24px;
      background:
        radial-gradient(420px 220px at 0% 0%, rgba(37, 99, 235, 0.08), transparent 70%),
        var(--cm-surface);
      box-shadow: var(--cm-shadow);
    }

    .progress-hero {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 18px;
    }

    .engine-pulse {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border: 1px solid var(--cm-line);
      border-radius: 18px;
      background: var(--cm-primary-soft);
      color: var(--cm-primary);
    }

    .engine-pulse mat-icon {
      width: 27px;
      height: 27px;
      font-size: 27px;
    }

    .engine-pulse::after {
      content: '';
      position: absolute;
      inset: -6px;
      border: 1px solid var(--cm-primary);
      border-radius: 23px;
      opacity: 0;
      animation: engine-pulse 1.9s ease-out infinite;
    }

    @keyframes engine-pulse {
      0% { transform: scale(0.86); opacity: 0.45; }
      70%, 100% { transform: scale(1.16); opacity: 0; }
    }

    .progress-copy h2 {
      margin: 3px 0 5px;
      color: var(--cm-ink);
      font-size: 1.3rem;
      font-weight: 750;
      letter-spacing: -0.03em;
    }

    .progress-copy p {
      margin: 0;
      max-width: 58ch;
      color: var(--cm-muted);
      font-size: 0.86rem;
      line-height: 1.55;
    }

    .progress-eyebrow {
      color: var(--cm-muted-light);
      font-size: 0.64rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .progress-clock {
      min-width: 90px;
      padding: 10px 14px;
      border: 1px solid var(--cm-line);
      border-radius: 14px;
      background: var(--cm-surface-muted);
      text-align: end;
    }

    .progress-clock strong {
      display: block;
      color: var(--cm-ink);
      font-size: 1.2rem;
      font-variant-numeric: tabular-nums;
      font-weight: 750;
    }

    .progress-clock span {
      color: var(--cm-muted-light);
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .progress-track {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .progress-track mat-progress-bar {
      overflow: hidden;
      border-radius: 999px;
    }

    .progress-track-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--cm-muted);
      font-size: 0.75rem;
      font-weight: 650;
    }

    .progress-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .progress-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border: 1px solid var(--cm-line);
      border-radius: 999px;
      background: var(--cm-surface-muted);
      color: var(--cm-muted);
      font-size: 0.74rem;
      font-weight: 650;
    }

    .progress-chip mat-icon {
      width: 15px;
      height: 15px;
      font-size: 15px;
      color: var(--cm-primary);
    }

    .progress-chip--warn {
      border-color: #fde68a;
      background: var(--cm-gold-soft);
      color: #a16207;
    }

    .progress-chip--warn mat-icon {
      color: #b7791f;
    }

    .progress-live {
      padding: 12px 14px;
      border: 1px solid var(--cm-line);
      border-radius: 16px;
      background: var(--cm-surface-muted);
    }

    .progress-live-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      color: var(--cm-muted);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
      animation: live-blink 1.4s ease-in-out infinite;
    }

    @keyframes live-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }

    .live-tally {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-inline-start: auto;
    }

    .progress-live-list {
      display: flex;
      flex-direction: column;
      margin-top: 10px;
    }

    .live-move {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-top: 1px solid var(--cm-line);
      font-size: 0.8rem;
    }

    .live-move:first-child {
      border-top: 0;
    }

    .live-move-label {
      color: var(--cm-ink-soft);
      font-weight: 700;
    }

    .live-move-eval {
      color: var(--cm-muted);
      font-family: monospace;
      font-size: 0.72rem;
    }

    .progress-empty {
      margin: 0;
      color: var(--cm-muted);
      font-size: 0.82rem;
    }

    .progress-tip {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 14px;
      background: var(--cm-primary-soft);
      font-size: 0.8rem;
      line-height: 1.5;
    }

    .progress-tip mat-icon {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      font-size: 18px;
      color: var(--cm-primary);
    }

    .progress-tip div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .progress-tip strong {
      color: var(--cm-primary-dark);
      font-size: 0.78rem;
    }

    .progress-tip span {
      color: var(--cm-ink-soft);
    }

    .review-stage {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      gap: 22px;
      align-items: start;
    }

    .review-board-col {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .review-board {
      width: 100%;
      max-width: 560px;
      aspect-ratio: 1;
      margin: 0 auto;
      overflow: hidden;
      border: 1px solid #dbe3ee;
      border-radius: 16px;
      background: #243528;
    }

    .move-nav {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      max-width: 560px;
      width: 100%;
      margin: 0 auto;
      padding: 6px 8px;
      border: 1px solid var(--cm-line);
      border-radius: 14px;
      background: var(--cm-surface-muted);
    }

    .move-nav-btn {
      color: var(--cm-primary);
    }

    .move-nav-btn:disabled {
      color: var(--cm-muted-light);
    }

    .move-nav-status {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      text-align: center;
    }

    .move-nav-counter {
      color: var(--cm-ink);
      font-size: 0.86rem;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }

    .move-nav-side {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--cm-muted);
      font-size: 0.68rem;
      font-weight: 650;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .move-nav-side mat-icon {
      width: 13px;
      height: 13px;
      font-size: 13px;
      color: var(--cm-primary);
    }

    .move-nav-hint {
      width: 100%;
      max-width: 560px;
      margin: -4px auto 0;
      color: var(--cm-muted-light);
      font-size: 0.7rem;
      text-align: center;
    }

    .eval-strip {
      display: grid;
      grid-template-columns: 26px minmax(0, 1fr);
      gap: 12px;
      max-width: 560px;
      margin: 0 auto;
      width: 100%;
    }

    .eval-bar {
      display: flex;
      flex-direction: column-reverse;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #e2e8f0;
    }

    .eval-bar-white {
      width: 100%;
      background: linear-gradient(180deg, #f8fafc, #cbd5e1);
      transition: height 0.25s ease;
    }

    .eval-card {
      padding: 14px 16px;
      border: 1px solid var(--cm-line);
      border-radius: 16px;
      background: var(--cm-surface);
    }

    .eval-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .move-label {
      color: var(--cm-ink);
      font-size: 1rem;
      font-weight: 750;
    }

    .eval-card-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .eval-card-grid strong {
      color: var(--cm-ink-soft);
      font-size: 0.86rem;
    }

    .review-side {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 18px;
      border: 1px solid var(--cm-line);
      border-radius: 20px;
      background: var(--cm-surface);
      box-shadow: var(--cm-shadow);
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .opening-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 12px;
      border-radius: 999px;
      background: #eef2f7;
      color: #475569;
    }

    .opening-chip mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }

    .opening-kind {
      font-weight: 700;
      color: #475569;
    }

    .opening-kind--defense {
      color: #6d28d9;
    }

    .opening-chip .opening-eco {
      font-weight: 700;
      color: #1e293b;
    }

    .opening-chip .opening-name {
      font-weight: 500;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 900px) {
      .opening-chip {
        max-width: 100%;
        font-size: 0.78rem;
      }
    }

    .review-focus {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      background: var(--cm-primary-soft);
    }

    .review-focus > mat-icon {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      font-size: 18px;
      color: var(--cm-primary);
    }

    .review-focus div {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .review-focus strong {
      color: var(--cm-primary-dark);
      font-size: 0.78rem;
    }

    .review-focus span {
      color: var(--cm-ink-soft);
      font-size: 0.72rem;
      line-height: 1.4;
    }

    .eval-graph {
      padding: 10px 12px;
      border: 1px solid var(--cm-line);
      border-radius: 14px;
      background: var(--cm-surface-muted);
    }

    .eval-graph-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
    }

    .eval-graph-legend {
      color: var(--cm-muted-light);
      font-size: 0.64rem;
      text-align: end;
    }

    .eval-graph-svg {
      display: block;
      width: 100%;
      height: 96px;
      touch-action: manipulation;
    }

    .graph-mid {
      stroke: var(--cm-line-strong);
      stroke-dasharray: 4 4;
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }

    .graph-area {
      fill: rgba(37, 99, 235, 0.14);
    }

    .graph-line {
      fill: none;
      stroke: var(--cm-primary);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }

    .graph-hit {
      fill: transparent;
      cursor: pointer;
    }

    .graph-point {
      fill: var(--cm-primary);
      opacity: 0.55;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    .graph-point.is-active {
      fill: var(--cm-gold);
      opacity: 1;
    }

    .summary-card {
      padding: 10px 12px;
      border: 1px solid var(--cm-line);
      border-radius: 12px;
      background: var(--cm-surface-muted);
    }

    .summary-card strong {
      color: var(--cm-ink);
      font-size: 1.05rem;
      font-weight: 750;
    }

    .grade-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .key-moment-btn {
      align-self: flex-start;
    }

    .moves-scroll {
      display: flex;
      flex-direction: column;
      max-height: 420px;
      overflow-y: auto;
      border-top: 1px solid var(--cm-line);
    }

    .move-line {
      display: grid;
      grid-template-columns: 30px minmax(48px, auto) minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 6px;
      border: 0;
      border-bottom: 1px solid var(--cm-line);
      background: transparent;
      color: var(--cm-ink-soft);
      font: inherit;
      font-size: 0.82rem;
      text-align: start;
      cursor: pointer;
    }

    .move-line:hover {
      background: var(--cm-primary-soft);
    }

    .move-line.is-selected {
      background: var(--cm-primary-soft);
      box-shadow: inset 3px 0 0 var(--cm-primary);
    }

    .move-number {
      color: var(--cm-muted-light);
      font-family: monospace;
      font-size: 0.74rem;
    }

    .move-san {
      font-weight: 700;
    }

    .move-eval {
      color: var(--cm-muted);
      font-family: monospace;
      font-size: 0.75rem;
    }

    .grade {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      justify-self: start;
      padding: 2px 8px;
      border-radius: 999px;
      background: #e2e8f0;
      color: #334155;
      font-size: 0.66rem;
      font-weight: 800;
      line-height: 1.4;
      white-space: nowrap;
    }

    .grade-icon {
      width: 13px;
      height: 13px;
      font-size: 13px;
      line-height: 13px;
    }

    .grade--brilliant { background: #dbeafe; color: #1d4ed8; }
    .grade--great { background: #dcfce7; color: #15803d; }
    .grade--good { background: #f1f5f9; color: #475569; }
    .grade--book { background: #f1f5f9; color: #64748b; }
    .grade--forced { background: #e2e8f0; color: #475569; }
    .grade--inaccuracy { background: #fef9c3; color: #a16207; }
    .grade--mistake { background: #ffedd5; color: #c2410c; }
    .grade--blunder { background: #fee2e2; color: #b91c1c; }

    @media (max-width: 900px) {
      .analysis-stage,
      .review-stage {
        grid-template-columns: 1fr;
      }

      .drop-zone {
        min-height: 280px;
      }
    }

    @media (max-width: 640px) {
      .progress-hero {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .progress-clock {
        grid-column: 1 / -1;
        text-align: start;
      }
    }

    @media (max-width: 520px) {
      .drop-zone,
      .review-preview,
      .review-side,
      .review-progress {
        padding: 16px;
      }

      .eval-card-grid {
        grid-template-columns: 1fr 1fr;
      }

      .live-move {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .live-move-eval {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .engine-pulse::after,
      .live-dot {
        animation: none;
      }
    }
  `]
})
export class AnalysisComponent implements OnInit, OnDestroy {
  readonly language = inject(LanguageService);
  private readonly analysis = inject(AnalysisService);
  private readonly api = inject(MoveAnalysisApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  @ViewChild('reviewBoard') private boardElement?: ElementRef<HTMLDivElement>;
  @ViewChild('movesScroll') private movesScroll?: ElementRef<HTMLDivElement>;

  requestId: string | null = null;
  state: ReviewState = 'loading';
  report: AnalysisReport | null = null;
  /** Latest poll response, including the rows the engine has already graded. */
  liveReport: AnalysisReport | null = null;
  selected: ReviewedMove | null = null;
  selectedBarPercent = 50;
  failureStatus = 0;
  elapsedSeconds = 0;
  expectedPlies: number | null = null;
  /** Which side the review belongs to; the opponent's moves stay out of the report. */
  playerSide: 'white' | 'black' = 'white';

  private board?: Chessboard;
  private subscription?: Subscription;
  private routeSubscription?: Subscription;
  private elapsedTimer?: ReturnType<typeof setInterval>;
  private startedAt = 0;

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      const id = params.get('requestId');
      const plies = Number(params.get('plies'));
      this.expectedPlies = Number.isFinite(plies) && plies > 0 ? Math.floor(plies) : null;
      this.playerSide = params.get('side') === 'black' ? 'black' : 'white';

      if (id !== this.requestId) {
        this.requestId = id;
        if (id) {
          this.load(id);
        } else {
          this.stop();
          this.stopElapsedTimer();
          this.destroyBoard();
          this.report = null;
          this.liveReport = null;
          this.selected = null;
          this.state = 'loading';
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.stop();
    this.stopElapsedTimer();
    this.routeSubscription?.unsubscribe();
    this.destroyBoard();
  }

  trackByPly(_index: number, move: ReviewedMove): number {
    return move.ply;
  }

  selectMove(move: ReviewedMove | null, scrollIntoView = false): void {
    if (!move) return;

    this.selected = move;
    this.applySelectedMove();

    if (scrollIntoView) {
      setTimeout(() => {
        const selected = this.movesScroll?.nativeElement.querySelector('.move-line.is-selected');
        selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  }

  /** Only the reviewed player's moves; the opponent stays out of the report. */
  get playerMoves(): ReviewedMove[] {
    return (this.report?.moves ?? []).filter(move => move.color === this.playerSide);
  }

  private get livePlayerMoves(): ReviewedMove[] {
    return (this.liveReport?.moves ?? []).filter(move => move.color === this.playerSide);
  }

  get sideLabel(): string {
    return this.language.t(this.playerSide === 'white' ? 'bot.white' : 'bot.black');
  }

  get playerSummary(): PlayerSummary | null {
    return this.report?.summary?.players[this.playerSide] ?? null;
  }

  get selectedMovePosition(): number {
    if (!this.selected) return 0;
    const index = this.playerMoves.indexOf(this.selected);
    return index < 0 ? 0 : index + 1;
  }

  get canGoPrevious(): boolean {
    const index = this.selected ? this.playerMoves.indexOf(this.selected) : -1;
    return index > 0;
  }

  get canGoNext(): boolean {
    const index = this.selected ? this.playerMoves.indexOf(this.selected) : -1;
    return index >= 0 && index < this.playerMoves.length - 1;
  }

  goToPreviousMove(): void {
    const moves = this.playerMoves;
    if (!moves.length) return;

    const index = this.selected ? moves.indexOf(this.selected) : 0;
    this.selectMove(moves[Math.max(0, index - 1)], true);
  }

  goToNextMove(): void {
    const moves = this.playerMoves;
    if (!moves.length) return;

    const index = this.selected ? moves.indexOf(this.selected) : -1;
    this.selectMove(moves[Math.min(moves.length - 1, index + 1)], true);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (this.state !== 'ready' || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goToPreviousMove();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goToNextMove();
    }
  }

  get analysedCount(): number {
    return this.livePlayerMoves.length;
  }

  get expectedPlayerPlies(): number | null {
    if (!this.expectedPlies) return null;
    return this.playerSide === 'white'
      ? Math.ceil(this.expectedPlies / 2)
      : Math.floor(this.expectedPlies / 2);
  }

  /** Progress is exact while the game length is known; otherwise the bar stays indeterminate. */
  get progressPercent(): number | null {
    if (this.state === 'ready') return 100;
    const total = this.expectedPlayerPlies;
    if (!total || total <= 0) return null;

    return Math.min(99, Math.round((this.analysedCount / total) * 100));
  }

  /** Rough estimate based on the average time per graded move so far. */
  get estimatedRemainingSeconds(): number | null {
    const total = this.expectedPlayerPlies;
    if (!total || this.analysedCount < 2 || this.elapsedSeconds < 3) return null;
    if (this.analysedCount >= total) return 0;

    const secondsPerMove = this.elapsedSeconds / this.analysedCount;
    return Math.max(1, Math.round(secondsPerMove * (total - this.analysedCount)));
  }

  progressTitle(): string {
    const done = this.analysedCount;
    const total = this.expectedPlayerPlies;

    if (this.state === 'loading' || done === 0) {
      return this.language.t('analysis.progress.titleWarmup');
    }
    if (total && done >= total) {
      return this.language.t('analysis.progress.titleFinishing');
    }
    if (total) {
      return this.language.t('analysis.progress.titleGrading', {
        done: Math.min(done + 1, total),
        total
      });
    }

    return this.language.t('analysis.progress.titleGradingUnknown', { done });
  }

  recentMoves(): ReviewedMove[] {
    return this.livePlayerMoves.slice(-5).reverse();
  }

  liveGradeEntries(): { grade: MoveGrade; count: number }[] {
    const counts = new Map<MoveGrade, number>();
    for (const move of this.livePlayerMoves) {
      counts.set(move.grade, (counts.get(move.grade) ?? 0) + 1);
    }

    return GRADE_ORDER
      .filter(grade => (counts.get(grade) ?? 0) > 0)
      .map(grade => ({ grade, count: counts.get(grade) ?? 0 }));
  }

  formatElapsed(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  get hasKeyMoments(): boolean {
    return this.playerMoves.some(move => this.isKeyMoment(move));
  }

  jumpToNextKeyMoment(): void {
    const moves = this.playerMoves;
    if (!moves.length) return;

    const current = this.selected ? moves.indexOf(this.selected) : -1;
    const ordered = [...moves.slice(current + 1), ...moves.slice(0, current + 1)];
    const next = ordered.find(move => this.isKeyMoment(move));
    if (!next) return;

    this.selectMove(next, true);
  }

  graphPoints(): {
    index: number;
    x: number;
    y: number;
    hitX: number;
    hitWidth: number;
    move: ReviewedMove;
  }[] {
    const moves = this.playerMoves;
    if (moves.length < 2) return [];

    const width = 320;
    const height = 100;
    const pad = 5;
    const usableWidth = width - pad * 2;
    const usableHeight = height - pad * 2;
    const step = usableWidth / (moves.length - 1);
    const hitWidth = usableWidth / moves.length;

    return moves.map((move, index) => {
      const x = pad + step * index;
      const winChance = this.analysis.getEvaluationBarPercentage(move.evalAfterCp, move.evalAfterMate);

      return {
        index,
        x,
        y: pad + (1 - winChance / 100) * usableHeight,
        hitX: Math.max(0, x - hitWidth / 2),
        hitWidth,
        move
      };
    });
  }

  graphLinePoints(): string {
    return this.graphPoints().map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  }

  graphAreaPath(): string {
    const points = this.graphPoints();
    if (!points.length) return '';

    const baseline = 100;
    const start = points[0];
    const end = points[points.length - 1];
    const line = points.map(point => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');

    return `M ${start.x.toFixed(2)} ${baseline} ${line} L ${end.x.toFixed(2)} ${baseline} Z`;
  }

  goToPlay(): void {
    this.router.navigate(['/game/bot']);
  }

  /** A rejected token is a sign-in problem, not a broken review. */
  get needsSignIn(): boolean {
    if (this.auth.demoMode) return false;
    return this.failureStatus === 401 || this.failureStatus === 403 || !this.auth.isAuthenticated();
  }

  signIn(): void {
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  gradeLabel(grade: MoveGrade): string {
    return this.language.t(`analysis.cls.${grade}` as 'analysis.cls.good');
  }

  /** The ECO line framed for the reviewing player: his opening when White, his defense when Black. */
  playerOpening(opening: AnalysisReport['opening'], side: 'white' | 'black') {
    return resolvePlayerOpening(opening, side);
  }

  /** One Material icon per classification so the badge reads at a glance. */
  gradeIcon(grade: MoveGrade): string {
    switch (grade) {
      case 'brilliant': return 'auto_awesome';
      case 'great': return 'workspace_premium';
      case 'good': return 'check_circle';
      case 'book': return 'menu_book';
      case 'forced': return 'push_pin';
      case 'inaccuracy': return 'error_outline';
      case 'mistake': return 'warning';
      case 'blunder': return 'dangerous';
      default: return 'check_circle';
    }
  }

  moveLabel(move: ReviewedMove): string {
    return `${move.moveNumber}${move.color === 'white' ? '.' : '…'}${move.san}`;
  }

  moveNumberLabel(move: ReviewedMove): string {
    return `${move.moveNumber}${move.color === 'white' ? '.' : '…'}`;
  }

  evalText(cp: number | null, mate: number | null): string {
    return this.analysis.formatEvaluation(cp, mate);
  }

  legendEntries(): { grade: MoveGrade; count: number }[] {
    const counts = new Map<MoveGrade, number>();
    for (const move of this.playerMoves) {
      counts.set(move.grade, (counts.get(move.grade) ?? 0) + 1);
    }

    return GRADE_ORDER
      .filter(grade => (counts.get(grade) ?? 0) > 0)
      .map(grade => ({ grade, count: counts.get(grade) ?? 0 }));
  }

  private isKeyMoment(move: ReviewedMove): boolean {
    return move.grade === 'blunder' || move.grade === 'mistake';
  }

  private startElapsedTimer(): void {
    this.stopElapsedTimer();
    this.startedAt = Date.now();
    this.elapsedSeconds = 0;
    this.elapsedTimer = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    }, 1000);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = undefined;
    }
  }

  private load(requestId: string): void {
    this.stop();
    this.stopElapsedTimer();
    this.destroyBoard();
    this.state = 'loading';
    this.report = null;
    this.liveReport = null;
    this.selected = null;
    this.failureStatus = 0;
    this.startElapsedTimer();

    this.subscription = this.api.watch(requestId).subscribe({
      next: report => {
        this.liveReport = report;

        if (report.status === 'COMPLETED') {
          this.report = report;
          this.state = 'ready';
          this.stopElapsedTimer();
          this.renderFirstMove();
        } else if (report.status === 'FAILED') {
          this.state = 'failed';
          this.stopElapsedTimer();
        } else {
          this.state = 'running';
        }
      },
      error: error => {
        this.failureStatus = error?.status ?? 0;
        this.state = 'failed';
        this.stopElapsedTimer();
      }
    });
  }

  private renderFirstMove(): void {
    const first = this.playerMoves.find(move => move.fenBefore) ??
      this.report?.moves.find(move => move.fenBefore) ??
      null;
    this.selected = first;
    setTimeout(() => this.applySelectedMove());
  }

  private applySelectedMove(): void {
    const move = this.selected;
    if (!move) return;

    this.selectedBarPercent = this.analysis.getEvaluationBarPercentage(move.evalBeforeCp, move.evalBeforeMate);

    if (!this.board) {
      this.initBoard(move.fenBefore);
      return;
    }

    this.board.setPosition(move.fenBefore);
    this.paintMove(move);
  }

  private initBoard(fen: string): void {
    const host = this.boardElement?.nativeElement;
    if (!host || !fen) return;

    this.destroyBoard();
    this.board = new Chessboard(host, {
      position: fen,
      orientation: this.playerSide === 'black' ? COLOR.black : COLOR.white,
      assetsUrl: '/assets/cm-chessboard/',
      style: {
        cssClass: 'green',
        showCoordinates: true,
        borderType: 'none'
      },
      responsive: true,
      extensions: [{ class: Markers }, { class: Arrows }]
    });
    this.board.disableMoveInput();
    if (this.selected) this.paintMove(this.selected);
  }

  /** Played move in white, engine preference in green, on the position before the move. */
  private paintMove(move: ReviewedMove): void {
    const board = this.board;
    if (!board) return;

    board.removeMarkers?.();
    board.removeArrows?.();

    if (move.uci?.length >= 4) {
      board.addArrow?.(ARROW_TYPE.default, move.uci.slice(0, 2), move.uci.slice(2, 4));
    }
    const best = move.bestMoveUci;
    if (best && best.length >= 4 && best !== move.uci) {
      board.addArrow?.(ARROW_TYPE.success, best.slice(0, 2), best.slice(2, 4));
    }
  }

  private stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  private destroyBoard(): void {
    try {
      this.board?.destroy();
    } catch {
      // The board can already be gone when the view is torn down.
    }
    this.board = undefined;
  }
}
