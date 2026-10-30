import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { LanguageService } from '../../core/i18n/language.service';
import { Course } from '../../core/models/course.models';
import { AuthService } from '../../core/services/auth.service';
import { CourseService, LessonRef } from '../../core/services/course.service';
import {
  GameHistoryEntry,
  GameHistoryService,
  GameOutcome
} from '../../core/services/game-history.service';
import { LearningProgressService } from '../../core/services/learning-progress.service';
import { MoveAnalysisApiService } from '../../core/services/move-analysis-api.service';
import { PremiumService } from '../../core/services/premium.service';
import {
  PUZZLE_TRACKS,
  PuzzleProgressService,
  PuzzleTrack
} from '../../core/services/puzzle-progress.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CourseCard {
  course: Course;
  total: number;
  done: number;
  percent: number;
  locked: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="cm-page dashboard-page">
      <section class="dashboard-hero" aria-labelledby="dashboard-title">
        <div class="hero-copy">
          <span class="cm-eyebrow">
            <mat-icon>space_dashboard</mat-icon>
            {{ language.t('dashboard.eyebrow') }}
          </span>
          <h1 id="dashboard-title">{{ greeting }}</h1>
          <p>{{ language.t('dashboard.subtitle') }}</p>

          <div class="cm-button-row hero-actions">
            <a mat-flat-button color="primary" routerLink="/play">
              <mat-icon>play_arrow</mat-icon>
              {{ language.t('dashboard.quick.play') }}
            </a>
            <a mat-stroked-button routerLink="/puzzles">
              <mat-icon>extension</mat-icon>
              {{ language.t('dashboard.quick.puzzles') }}
            </a>
            <a mat-stroked-button routerLink="/learn">
              <mat-icon>school</mat-icon>
              {{ language.t('dashboard.quick.learn') }}
            </a>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-icon"><mat-icon>sports_esports</mat-icon></span>
            <strong>{{ gameStats().played }}</strong>
            <span>{{ language.t('dashboard.stats.games') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon stat-icon--green"><mat-icon>military_tech</mat-icon></span>
            <strong>{{ gameStats().winRate }}%</strong>
            <span>{{ language.t('dashboard.stats.winRate') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon stat-icon--gold"><mat-icon>local_fire_department</mat-icon></span>
            <strong>{{ puzzleState().streak }}</strong>
            <span>{{ language.t('dashboard.stats.puzzleStreak') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon stat-icon--slate"><mat-icon>school</mat-icon></span>
            <strong>{{ overall().percent }}%</strong>
            <span>{{ language.t('dashboard.stats.courseProgress') }}</span>
          </div>
        </div>
      </section>

      <section class="cm-panel dashboard-section games-section" aria-labelledby="games-title">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">
              <mat-icon>sports_esports</mat-icon>
              {{ language.t('dashboard.games.eyebrow') }}
            </span>
            <h2 id="games-title">{{ language.t('dashboard.games.title') }}</h2>
            <p>{{ language.t('dashboard.games.copy') }}</p>
          </div>
          <a mat-stroked-button routerLink="/play">
            <mat-icon>add</mat-icon>
            {{ language.t('dashboard.games.play') }}
          </a>
        </div>

        @if (gamesLoading()) {
          <div class="games-loading" role="status">
            <mat-icon class="spin">progress_activity</mat-icon>
            <span>{{ language.t('dashboard.games.loading') }}</span>
          </div>
        } @else if (games().length) {
          <div class="games-list">
            @for (game of games(); track game.id) {
              <article class="game-row">
                <span class="game-result" [class]="'game-result game-result--' + game.result">
                  {{ resultLabel(game.result) }}
                </span>

                <div class="game-main">
                  <strong>{{ language.t('dashboard.games.vs', { opponent: game.opponent }) }}</strong>
                  <span class="game-meta">
                    <span><mat-icon>person</mat-icon>{{ colorLabel(game.playerColor) }}</span>
                    <span><mat-icon>calendar_today</mat-icon>{{ formatDate(game.playedAt) }}</span>
                    <span><mat-icon>timer</mat-icon>{{ timeControlLabel(game.timeControl) }}</span>
                    <span>
                      <mat-icon>format_list_numbered</mat-icon>
                      {{ language.t('dashboard.games.moves', { count: game.plies }) }}
                    </span>
                  </span>
                </div>

                <span class="analysis-chip" [class]="'analysis-chip ' + analysisClass(game)">
                  {{ analysisLabel(game) }}
                </span>

                <div class="game-actions">
                  @if (game.analysisRequestId) {
                    <button mat-stroked-button type="button" (click)="openReview(game)">
                      <mat-icon>insights</mat-icon>
                      {{ language.t('dashboard.games.review') }}
                    </button>
                  } @else {
                    <button
                      mat-flat-button
                      color="primary"
                      type="button"
                      (click)="analyzeGame(game)"
                      [disabled]="isAnalyzing(game)">
                      <mat-icon>{{ isAnalyzing(game) ? 'hourglass_top' : 'bolt' }}</mat-icon>
                      {{
                        isAnalyzing(game)
                          ? language.t('dashboard.games.analyzing')
                          : language.t('dashboard.games.analyze')
                      }}
                    </button>
                  }
                </div>
              </article>
            }
          </div>

          @if (gamesError()) {
            <p class="games-error">
              <mat-icon>cloud_off</mat-icon>
              {{ language.t('dashboard.games.remoteError') }}
            </p>
          }
        } @else {
          <div class="cm-empty-state">
            <mat-icon>sports_esports</mat-icon>
            <h3>{{ language.t('dashboard.games.emptyTitle') }}</h3>
            <p>{{ language.t('dashboard.games.emptyText') }}</p>
            <a mat-flat-button color="primary" routerLink="/play">
              {{ language.t('dashboard.games.emptyCta') }}
            </a>
          </div>
        }
      </section>

      <div class="dashboard-lower">
        <section class="cm-panel dashboard-section" aria-labelledby="courses-title">
          <div class="section-head">
            <div>
              <span class="section-eyebrow">
                <mat-icon>school</mat-icon>
                {{ language.t('dashboard.courses.eyebrow') }}
              </span>
              <h2 id="courses-title">{{ language.t('dashboard.courses.title') }}</h2>
              <p>{{ language.t('dashboard.courses.copy') }}</p>
            </div>
            <a mat-button routerLink="/learn">
              {{ language.t('dashboard.courses.all') }}
              <mat-icon>arrow_forward</mat-icon>
            </a>
          </div>

          @if (continueLearning(); as next) {
            <article class="continue-card">
              <span class="continue-icon"><mat-icon>{{ next.course.icon }}</mat-icon></span>
              <div class="continue-copy">
                <span class="continue-label">{{ language.t('dashboard.courses.continue') }}</span>
                <strong>{{ next.course.title }}</strong>
                <span>{{ next.ref.lesson.title }}</span>
              </div>
              <button mat-flat-button color="primary" type="button" (click)="openContinueLearning()">
                <mat-icon>play_arrow</mat-icon>
                {{ language.t('dashboard.courses.resume') }}
              </button>
            </article>
          }

          <div class="overall-progress">
            <div class="overall-copy">
              <span>{{ language.t('dashboard.courses.overall') }}</span>
              <strong>{{ language.t('dashboard.courses.lessonTotal', { done: overall().done, total: overall().total }) }}</strong>
            </div>
            <div class="progress-track">
              <span [style.width.%]="overall().percent"></span>
            </div>
          </div>

          <div class="course-list">
            @for (item of courseCards(); track item.course.id) {
              <article class="course-row" [class.course-row--locked]="item.locked">
                <span class="course-icon" [class]="'course-icon course-icon--' + item.course.accent">
                  <mat-icon>{{ item.locked ? 'lock' : item.course.icon }}</mat-icon>
                </span>
                <div class="course-main">
                  <strong>{{ item.course.title }}</strong>
                  <span>{{ language.t('dashboard.courses.progress', { done: item.done, total: item.total }) }}</span>
                  <div class="progress-track">
                    <span [style.width.%]="item.percent"></span>
                  </div>
                </div>
                <span class="course-percent">{{ item.percent }}%</span>
                <button
                  mat-icon-button
                  type="button"
                  (click)="openCourse(item.course)"
                  [attr.aria-label]="language.t('dashboard.courses.openAria', { course: item.course.title })">
                  <mat-icon>{{ item.locked ? 'lock' : 'arrow_forward' }}</mat-icon>
                </button>
              </article>
            }
          </div>
        </section>

        <section class="cm-panel dashboard-section puzzle-section" aria-labelledby="puzzles-title">
          <div class="section-head">
            <div>
              <span class="section-eyebrow">
                <mat-icon>extension</mat-icon>
                {{ language.t('dashboard.puzzles.eyebrow') }}
              </span>
              <h2 id="puzzles-title">{{ language.t('dashboard.puzzles.title') }}</h2>
              <p>{{ language.t('dashboard.puzzles.copy') }}</p>
            </div>
            <span class="cm-tag cm-tag--gold">{{ language.t('common.inDevelopment') }}</span>
          </div>

          <div class="puzzle-stats">
            <div>
              <strong>{{ puzzleTotalSolved() }}</strong>
              <span>{{ language.t('dashboard.puzzles.solved') }}</span>
            </div>
            <div>
              <strong>{{ puzzleState().streak }}</strong>
              <span>{{ language.t('dashboard.puzzles.streak') }}</span>
            </div>
            <div>
              <strong>{{ puzzleAccuracy() }}%</strong>
              <span>{{ language.t('dashboard.puzzles.accuracy') }}</span>
            </div>
          </div>

          <div class="daily-card">
            <span class="daily-icon"><mat-icon>today</mat-icon></span>
            <div class="daily-copy">
              <strong>{{ language.t('dashboard.puzzles.daily') }}</strong>
              <span>{{ language.t('dashboard.puzzles.dailyText') }}</span>
            </div>
            <a mat-flat-button color="primary" routerLink="/puzzles">
              {{ language.t('dashboard.puzzles.startDaily') }}
            </a>
          </div>

          <div class="puzzle-tracks">
            @for (track of puzzleTracks; track track.id) {
              <a class="puzzle-track" routerLink="/puzzles">
                <span class="track-icon" [class]="'track-icon track-icon--' + track.accent">
                  <mat-icon>{{ track.icon }}</mat-icon>
                </span>
                <span class="track-main">
                  <span class="track-head">
                    <strong>{{ language.t(track.labelKey) }}</strong>
                    <span>{{ puzzleSolved(track.id) }} / {{ track.total }}</span>
                  </span>
                  <span class="progress-track">
                    <span [style.width.%]="puzzlePercent(track)"></span>
                  </span>
                </span>
                <mat-icon class="track-arrow">chevron_right</mat-icon>
              </a>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding-bottom: 24px;
    }

    .dashboard-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      gap: clamp(24px, 4vw, 48px);
      align-items: center;
      padding: clamp(26px, 4.5vw, 48px);
      border: 1px solid rgba(191, 219, 254, 0.8);
      border-radius: 28px;
      background:
        radial-gradient(520px 320px at 100% 0%, rgba(191, 219, 254, 0.5), transparent 70%),
        radial-gradient(360px 260px at 0% 100%, rgba(254, 243, 199, 0.32), transparent 70%),
        var(--cm-surface);
      box-shadow: var(--cm-shadow-lg);
    }

    .hero-copy h1 {
      margin: 0;
      color: var(--cm-ink);
      font-size: clamp(2.2rem, 4.5vw, 3.7rem);
      font-weight: 800;
      line-height: 1.02;
      letter-spacing: -0.055em;
    }

    .hero-copy > p {
      max-width: 56ch;
      margin: 16px 0 0;
      color: var(--cm-muted);
      font-size: clamp(0.95rem, 1.3vw, 1.05rem);
      line-height: 1.7;
    }

    .hero-actions {
      margin-top: 24px;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 15px;
      border: 1px solid var(--cm-line);
      border-radius: 16px;
      background: var(--cm-surface-muted);
    }

    .stat-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin-bottom: 6px;
      border-radius: 10px;
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .stat-icon mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .stat-icon--green {
      background: var(--cm-success-soft);
      color: var(--cm-success);
    }

    .stat-icon--gold {
      background: var(--cm-gold-soft);
      color: var(--cm-gold);
    }

    .stat-icon--slate {
      background: var(--cm-line);
      color: var(--cm-ink-soft);
    }

    .stat-card strong {
      color: var(--cm-ink);
      font-size: 1.45rem;
      font-weight: 800;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }

    .stat-card > span:last-child {
      color: var(--cm-muted);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .dashboard-section {
      margin-top: 24px;
      padding: clamp(18px, 2.6vw, 26px);
    }

    .section-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .section-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--cm-primary);
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .section-eyebrow mat-icon {
      width: 15px;
      height: 15px;
      font-size: 15px;
    }

    .section-head h2 {
      margin: 5px 0 4px;
      color: var(--cm-ink);
      font-size: 1.2rem;
      font-weight: 750;
      letter-spacing: -0.02em;
    }

    .section-head p {
      max-width: 60ch;
      margin: 0;
      color: var(--cm-muted);
      font-size: 0.85rem;
      line-height: 1.55;
    }

    .games-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 28px 4px;
      color: var(--cm-muted);
      font-size: 0.85rem;
    }

    .games-loading mat-icon {
      width: 20px;
      height: 20px;
      color: var(--cm-primary);
      font-size: 20px;
    }

    .games-list {
      display: flex;
      flex-direction: column;
    }

    .game-row {
      display: grid;
      grid-template-columns: 62px minmax(0, 1fr) auto auto;
      gap: 14px;
      align-items: center;
      padding: 14px 2px;
      border-top: 1px solid var(--cm-line);
    }

    .game-row:first-child {
      border-top: 0;
    }

    .game-result {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .game-result--win {
      background: var(--cm-success-soft);
      color: var(--cm-success);
    }

    .game-result--loss {
      background: var(--cm-danger-soft);
      color: var(--cm-danger);
    }

    .game-result--draw {
      border: 1px solid var(--cm-line);
      background: var(--cm-surface-muted);
      color: var(--cm-muted);
    }

    .game-main {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 4px;
    }

    .game-main strong {
      overflow: hidden;
      color: var(--cm-ink);
      font-size: 0.86rem;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .game-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      color: var(--cm-muted-light);
      font-size: 0.68rem;
      font-weight: 600;
    }

    .game-meta span {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .game-meta mat-icon {
      width: 13px;
      height: 13px;
      font-size: 13px;
    }

    .analysis-chip {
      padding: 3px 9px;
      border: 1px solid var(--cm-line);
      border-radius: 999px;
      background: var(--cm-surface-muted);
      color: var(--cm-muted);
      font-size: 0.65rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .analysis-chip--ready {
      border-color: #a7f3d0;
      background: var(--cm-success-soft);
      color: var(--cm-success);
    }

    .analysis-chip--running {
      border-color: #bfdbfe;
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .analysis-chip--failed {
      border-color: #fecaca;
      background: var(--cm-danger-soft);
      color: var(--cm-danger);
    }

    .game-actions {
      display: flex;
      justify-content: flex-end;
    }

    .games-error {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 12px 0 0;
      color: var(--cm-muted);
      font-size: 0.72rem;
    }

    .games-error mat-icon {
      width: 15px;
      height: 15px;
      font-size: 15px;
    }

    .dashboard-lower {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      gap: 18px;
    }

    .continue-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 13px;
      border: 1px solid #bfdbfe;
      border-radius: 16px;
      background: var(--cm-primary-soft);
    }

    .continue-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--cm-surface);
      color: var(--cm-primary-dark);
    }

    .continue-icon mat-icon {
      width: 21px;
      height: 21px;
      font-size: 21px;
    }

    .continue-copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 1px;
    }

    .continue-label {
      color: var(--cm-primary-dark);
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .continue-copy strong {
      overflow: hidden;
      color: var(--cm-ink);
      font-size: 0.84rem;
      font-weight: 750;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .continue-copy > span:last-child {
      overflow: hidden;
      color: var(--cm-muted);
      font-size: 0.72rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .overall-progress {
      margin: 16px 0 6px;
    }

    .overall-copy {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .overall-copy span {
      color: var(--cm-muted);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .overall-copy strong {
      color: var(--cm-ink-soft);
      font-size: 0.74rem;
      font-weight: 700;
    }

    .progress-track {
      display: block;
      overflow: hidden;
      height: 6px;
      border-radius: 999px;
      background: var(--cm-line);
    }

    .progress-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--cm-primary), var(--cm-success));
      transition: width 0.3s ease;
    }

    .course-list {
      display: flex;
      flex-direction: column;
      margin-top: 10px;
    }

    .course-row {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr) auto auto;
      gap: 10px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid var(--cm-line);
    }

    .course-row--locked {
      opacity: 0.65;
    }

    .course-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .course-icon--gold {
      background: var(--cm-gold-soft);
      color: var(--cm-gold);
    }

    .course-icon--green {
      background: var(--cm-success-soft);
      color: var(--cm-success);
    }

    .course-icon--slate {
      background: var(--cm-line);
      color: var(--cm-ink-soft);
    }

    .course-icon mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .course-main {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 3px;
    }

    .course-main strong {
      overflow: hidden;
      color: var(--cm-ink);
      font-size: 0.8rem;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .course-main > span {
      color: var(--cm-muted);
      font-size: 0.66rem;
    }

    .course-percent {
      color: var(--cm-muted);
      font-size: 0.7rem;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }

    .puzzle-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .puzzle-stats div {
      padding: 10px 8px;
      border: 1px solid var(--cm-line);
      border-radius: 12px;
      background: var(--cm-surface-muted);
      text-align: center;
    }

    .puzzle-stats strong {
      display: block;
      color: var(--cm-ink);
      font-size: 1.1rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .puzzle-stats span {
      color: var(--cm-muted);
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .daily-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      margin-top: 12px;
      padding: 13px;
      border: 1px solid #fde68a;
      border-radius: 16px;
      background: var(--cm-gold-soft);
    }

    .daily-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 11px;
      background: var(--cm-surface);
      color: var(--cm-gold);
    }

    .daily-icon mat-icon {
      width: 19px;
      height: 19px;
      font-size: 19px;
    }

    .daily-copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
    }

    .daily-copy strong {
      color: var(--cm-ink);
      font-size: 0.82rem;
      font-weight: 750;
    }

    .daily-copy span {
      color: var(--cm-muted);
      font-size: 0.7rem;
      line-height: 1.4;
    }

    .daily-card a {
      grid-column: 1 / -1;
      justify-self: start;
    }

    .puzzle-tracks {
      display: flex;
      flex-direction: column;
      margin-top: 12px;
    }

    .puzzle-track {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr) 18px;
      gap: 10px;
      align-items: center;
      padding: 9px 4px;
      border-top: 1px solid var(--cm-line);
      color: inherit;
      text-decoration: none;
    }

    .puzzle-track:first-child {
      border-top: 0;
    }

    .puzzle-track:hover {
      border-radius: 10px;
      background: var(--cm-surface-muted);
    }

    .track-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .track-icon--gold {
      background: var(--cm-gold-soft);
      color: var(--cm-gold);
    }

    .track-icon--green {
      background: var(--cm-success-soft);
      color: var(--cm-success);
    }

    .track-icon--slate {
      background: var(--cm-line);
      color: var(--cm-ink-soft);
    }

    .track-icon mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }

    .track-main {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 5px;
    }

    .track-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.76rem;
    }

    .track-head strong {
      overflow: hidden;
      color: var(--cm-ink-soft);
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .track-head span {
      color: var(--cm-muted);
      font-size: 0.64rem;
      font-variant-numeric: tabular-nums;
    }

    .track-arrow {
      width: 17px;
      height: 17px;
      color: var(--cm-muted-light);
      font-size: 17px;
    }

    .spin {
      animation: dashboard-spin 1s linear infinite;
    }

    @keyframes dashboard-spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 980px) {
      .dashboard-hero {
        grid-template-columns: 1fr;
      }

      .dashboard-lower {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .section-head {
        flex-direction: column;
      }

      .game-row {
        grid-template-columns: 56px minmax(0, 1fr);
        gap: 8px 12px;
      }

      .analysis-chip {
        grid-column: 2;
        justify-self: start;
      }

      .game-actions {
        grid-column: 1 / -1;
      }

      .game-actions button {
        width: 100%;
      }

      .continue-card {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .continue-card button {
        grid-column: 1 / -1;
        width: 100%;
      }
    }

    @media (max-width: 520px) {
      .dashboard-hero {
        padding: 22px 18px 26px;
        border-radius: 22px;
      }

      .dashboard-section {
        padding: 16px;
      }

      .puzzle-stats {
        grid-template-columns: 1fr;
      }

      .course-row {
        grid-template-columns: 34px minmax(0, 1fr) auto;
      }

      .course-percent {
        display: none;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  readonly language = inject(LanguageService);
  readonly auth = inject(AuthService);

  private readonly router = inject(Router);
  private readonly history = inject(GameHistoryService);
  private readonly puzzleProgress = inject(PuzzleProgressService);
  private readonly courseService = inject(CourseService);
  private readonly learning = inject(LearningProgressService);
  private readonly premium = inject(PremiumService);
  private readonly analysisApi = inject(MoveAnalysisApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly games = this.history.games;
  readonly gameStats = this.history.stats;
  readonly gamesLoading = this.history.loading;
  readonly gamesError = this.history.remoteError;

  readonly puzzleTracks = PUZZLE_TRACKS;
  readonly puzzleState = this.puzzleProgress.progress;
  readonly puzzleTotalSolved = this.puzzleProgress.totalSolved;
  readonly puzzleAccuracy = this.puzzleProgress.accuracy;

  readonly courses = this.courseService.courses;
  readonly courseCards = computed<CourseCard[]>(() =>
    this.courses().map(course => ({
      course,
      total: this.courseService.lessonCount(course),
      done: this.completedCount(course),
      percent: this.percent(course),
      locked: this.courseLocked(course)
    }))
  );

  readonly overall = computed(() => {
    const courses = this.courses();
    const total = courses.reduce((sum, course) => sum + this.courseService.lessonCount(course), 0);
    const done = courses.reduce((sum, course) => sum + this.completedCount(course), 0);
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  });

  readonly continueLearning = computed(() => this.findContinueLearning());

  private readonly analyzingIds = new Set<string>();

  ngOnInit(): void {
    this.history.loadRemote();
  }

  get greeting(): string {
    const name = this.auth.userDisplayName() || this.auth.currentUser()?.firstName;
    return name
      ? this.language.t('dashboard.title', { name })
      : this.language.t('dashboard.titleGuest');
  }

  resultLabel(result: GameOutcome): string {
    return this.language.t(`dashboard.games.${result}` as 'dashboard.games.win');
  }

  colorLabel(color: 'white' | 'black'): string {
    return this.language.t(color === 'white' ? 'bot.white' : 'bot.black');
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(this.language.language(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  timeControlLabel(value: string): string {
    if (!value || value === 'unlimited') return this.language.t('common.noClock');
    return value;
  }

  analysisLabel(game: GameHistoryEntry): string {
    if (game.analysisRequestId) return this.language.t('dashboard.games.analysisReady');
    if (this.isAnalysisRunning(game)) return this.language.t('dashboard.games.analysisRunning');
    if (game.analysisStatus === 'FAILED') return this.language.t('dashboard.games.analysisFailedChip');
    return this.language.t('dashboard.games.analysisPending');
  }

  analysisClass(game: GameHistoryEntry): string {
    if (game.analysisRequestId) return 'analysis-chip--ready';
    if (this.isAnalysisRunning(game)) return 'analysis-chip--running';
    if (game.analysisStatus === 'FAILED') return 'analysis-chip--failed';
    return 'analysis-chip--idle';
  }

  isAnalyzing(game: GameHistoryEntry): boolean {
    return this.analyzingIds.has(game.id);
  }

  analyzeGame(game: GameHistoryEntry): void {
    if (game.analysisRequestId) {
      this.openReview(game);
      return;
    }

    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/dashboard' } });
      return;
    }

    if (!game.pgn || this.analyzingIds.has(game.id)) return;

    this.analyzingIds.add(game.id);
    this.analysisApi.submit(game.pgn, this.analysisGameId(game)).subscribe({
      next: submitted => {
        this.analyzingIds.delete(game.id);
        this.history.attachAnalysis(game.id, submitted.requestId);
        this.openReview({ ...game, analysisRequestId: submitted.requestId });
      },
      error: error => {
        this.analyzingIds.delete(game.id);
        const status = error?.status;
        if (status === 401 || status === 403) {
          void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/dashboard' } });
          return;
        }
        this.snackBar.open(
          this.language.t('dashboard.games.analysisError'),
          this.language.t('common.ok'),
          { duration: 3000 }
        );
      }
    });
  }

  /**
   * The analysis service keys jobs by a UUID game id. Remote games already have one; local
   * games use the history UUID unless the browser fell back to a non-UUID id.
   */
  private analysisGameId(game: GameHistoryEntry): string {
    if (game.remoteId) return game.remoteId;
    if (UUID_PATTERN.test(game.id)) return game.id;
    return crypto.randomUUID();
  }

  openReview(game: GameHistoryEntry): void {
    if (!game.analysisRequestId) return;

    void this.router.navigate(['/analysis'], {
      queryParams: {
        requestId: game.analysisRequestId,
        side: game.playerColor,
        ...(game.plies > 0 ? { plies: game.plies } : {})
      }
    });
  }

  puzzleSolved(trackId: string): number {
    return this.puzzleProgress.solvedCount(trackId);
  }

  puzzlePercent(track: PuzzleTrack): number {
    return this.puzzleProgress.trackPercent(track);
  }

  openContinueLearning(): void {
    const next = this.continueLearning();
    if (!next) return;
    void this.router.navigate(['/learn', next.course.id, next.ref.lesson.id]);
  }

  openCourse(course: Course): void {
    if (this.courseLocked(course)) {
      void this.router.navigate(['/learn']);
      return;
    }

    const entry = this.findCourseEntry(course);
    if (!entry) {
      void this.router.navigate(['/learn']);
      return;
    }

    void this.router.navigate(['/learn', course.id, entry.lesson.id]);
  }

  completedCount(course: Course): number {
    const lessonIds = this.courseService.lessonRefs(course).map(ref => ref.lesson.id);
    return this.learning.completedCount(course.id, lessonIds);
  }

  private percent(course: Course): number {
    const total = this.courseService.lessonCount(course);
    return total > 0 ? Math.round((this.completedCount(course) / total) * 100) : 0;
  }

  private courseLocked(course: Course): boolean {
    return !this.premium.canOpenCourse(course);
  }

  private lessonLocked(ref: LessonRef): boolean {
    return !this.premium.canOpenLesson(ref.course, ref.lesson, ref.index);
  }

  private isAnalysisRunning(game: GameHistoryEntry): boolean {
    return (
      game.analysisStatus === 'PENDING' ||
      game.analysisStatus === 'REQUESTED' ||
      game.analysisStatus === 'IN_PROGRESS'
    );
  }

  private findContinueLearning(): { course: Course; ref: LessonRef } | null {
    const lastOpened = this.learning.lastOpened();
    if (lastOpened) {
      const [courseId, lessonId] = lastOpened.split('/');
      const ref = this.courseService.getLessonRef(courseId, lessonId);

      if (ref && !this.lessonLocked(ref)) {
        if (!this.learning.isComplete(ref.course.id, ref.lesson.id)) {
          return { course: ref.course, ref };
        }

        const next = this.courseService.nextLesson(ref.course.id, ref.lesson.id);
        if (next && !this.lessonLocked(next)) {
          return { course: next.course, ref: next };
        }
      }
    }

    for (const course of this.courses()) {
      const next = this.courseService
        .lessonRefs(course)
        .filter(ref => !this.lessonLocked(ref))
        .find(ref => !this.learning.isComplete(course.id, ref.lesson.id));

      if (next) return { course, ref: next };
    }

    for (const course of this.courses()) {
      const first = this.courseService.lessonRefs(course).find(ref => !this.lessonLocked(ref));
      if (first) return { course, ref: first };
    }

    return null;
  }

  private findCourseEntry(course: Course): LessonRef | null {
    const refs = this.courseService.lessonRefs(course).filter(ref => !this.lessonLocked(ref));
    if (!refs.length) return null;

    const lastOpened = this.learning.lastOpened();
    if (lastOpened) {
      const [courseId, lessonId] = lastOpened.split('/');
      if (courseId === course.id) {
        const current = refs.find(ref => ref.lesson.id === lessonId);
        if (current && !this.learning.isComplete(course.id, current.lesson.id)) {
          return current;
        }

        const next = this.courseService.nextLesson(course.id, lessonId);
        if (next && !this.lessonLocked(next)) return next;
      }
    }

    return refs.find(ref => !this.learning.isComplete(course.id, ref.lesson.id)) ?? refs[0];
  }
}
