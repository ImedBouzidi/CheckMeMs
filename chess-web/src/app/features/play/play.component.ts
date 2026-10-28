import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterLink, Router } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { PlayVsBotDialogComponent, BotDialogResult } from './play-vs-bot-dialog.component';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatDialogModule, RouterLink],
  template: `
    <div class="cm-page play-page">
      <header class="cm-page-header">
        <div class="cm-page-heading">
          <span class="cm-eyebrow"><mat-icon>sports_esports</mat-icon> {{ language.t('play.eyebrow') }}</span>
          <h1 class="cm-page-title">{{ language.t('play.title') }}</h1>
          <p class="cm-page-subtitle">
            {{ language.t('play.subtitle') }}
          </p>
        </div>
        <div class="cm-page-actions">
          <a mat-stroked-button routerLink="/analysis">
            <mat-icon>insights</mat-icon>
            {{ language.t('play.reviewGame') }}
          </a>
        </div>
      </header>

      <section class="engine-match" aria-labelledby="engine-match-title">
        <div class="engine-match-copy">
          <span class="engine-status">
            <span class="engine-status-dot"></span>
            {{ language.t('play.engineStatus') }}
          </span>
          <h2 id="engine-match-title">{{ language.t('play.engineTitle') }}</h2>
          <p>
            {{ language.t('play.engineText') }}
          </p>

          <div class="engine-tags">
            <span><mat-icon>tune</mat-icon> {{ language.t('play.levels') }}</span>
            <span><mat-icon>speed</mat-icon> {{ language.t('play.clock') }}</span>
            <span><mat-icon>undo</mat-icon> {{ language.t('play.takebacks') }}</span>
            <span><mat-icon>lightbulb</mat-icon> {{ language.t('play.hints') }}</span>
          </div>

          <button mat-flat-button class="engine-cta" type="button" (click)="playVsBot()">
            <mat-icon>play_arrow</mat-icon>
            {{ language.t('play.setup') }}
          </button>
        </div>

        <div class="engine-match-art" aria-hidden="true">
          <div class="engine-grid"></div>
          <img src="assets/chess-pieces/bN.svg" alt="">
          <div class="engine-badge">
            <span>~{{ 1320 + 5 * 60 }}</span>
            <small>{{ language.t('play.casualElo') }}</small>
          </div>
        </div>
      </section>

      <section class="cm-section" aria-labelledby="more-ways-title">
        <div class="cm-section-heading">
          <div>
            <h2 id="more-ways-title" class="cm-section-title">{{ language.t('play.moreTitle') }}</h2>
            <p class="cm-section-copy">{{ language.t('play.moreCopy') }}</p>
          </div>
        </div>

        <div class="play-options-grid">
          <article class="cm-feature-card">
            <div class="cm-card-top">
              <span class="cm-icon-tile cm-icon-tile--green">
                <mat-icon>groups</mat-icon>
              </span>
              <span class="cm-tag cm-tag--green">{{ language.t('play.localTag') }}</span>
            </div>
            <h3>{{ language.t('play.localTitle') }}</h3>
            <p>
              {{ language.t('play.localText') }}
            </p>
            <div class="cm-card-footer">
              <a mat-flat-button color="primary" routerLink="/game/local">
                {{ language.t('play.localCta') }}
                <mat-icon>arrow_forward</mat-icon>
              </a>
              <span class="cm-card-meta">{{ language.t('play.localMeta') }}</span>
            </div>
          </article>

          <article class="cm-feature-card">
            <div class="cm-card-top">
              <span class="cm-icon-tile cm-icon-tile--gold">
                <mat-icon>person_add</mat-icon>
              </span>
              <span class="cm-tag cm-tag--gold">{{ language.t('play.friendTag') }}</span>
            </div>
            <h3>{{ language.t('play.friendTitle') }}</h3>
            <p>{{ language.t('play.friendText') }}</p>
            <div class="cm-card-footer">
              <button mat-stroked-button type="button" disabled>{{ language.t('play.friendCta') }}</button>
              <span class="cm-card-meta">{{ language.t('play.friendMeta') }}</span>
            </div>
          </article>

          <article class="cm-feature-card">
            <div class="cm-card-top">
              <span class="cm-icon-tile cm-icon-tile--slate">
                <mat-icon>public</mat-icon>
              </span>
              <span class="cm-tag cm-tag--gold">{{ language.t('play.onlineTag') }}</span>
            </div>
            <h3>{{ language.t('play.onlineTitle') }}</h3>
            <p>{{ language.t('play.onlineText') }}</p>
            <div class="cm-card-footer">
              <button mat-stroked-button type="button" disabled>{{ language.t('play.onlineCta') }}</button>
              <span class="cm-card-meta">{{ language.t('play.onlineMeta') }}</span>
            </div>
          </article>
        </div>

        <div class="cm-note play-note">
          <mat-icon>info</mat-icon>
          <span>{{ language.t('play.note') }}</span>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .play-page {
      max-width: 1120px;
    }

    .engine-match {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
      gap: 28px;
      overflow: hidden;
      padding: clamp(28px, 5vw, 48px);
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 28px;
      background:
        radial-gradient(460px 280px at 100% 0%, rgba(37, 99, 235, 0.38), transparent 70%),
        radial-gradient(300px 220px at 0% 100%, rgba(8, 145, 178, 0.18), transparent 72%),
        linear-gradient(135deg, #111c30, #0f172a 56%, #172554);
      box-shadow: 0 34px 80px -42px rgba(15, 23, 42, 0.9);
      color: #f8fafc;
    }

    .engine-match::before {
      position: absolute;
      inset: 0;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: inherit;
      content: '';
      pointer-events: none;
    }

    .engine-match-copy {
      position: relative;
      z-index: 1;
    }

    .engine-status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 10px;
      border: 1px solid rgba(167, 243, 208, 0.25);
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.08);
      color: #a7f3d0;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .engine-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.12);
    }

    .engine-match h2 {
      max-width: 450px;
      margin: 18px 0 12px;
      color: #ffffff;
      font-size: clamp(2rem, 4vw, 3.1rem);
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.055em;
    }

    .engine-match p {
      max-width: 56ch;
      margin: 0;
      color: #b8c4d6;
      font-size: 0.96rem;
      line-height: 1.7;
    }

    .engine-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 22px 0 26px;
    }

    .engine-tags span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 9px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      color: #dbeafe;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .engine-tags mat-icon {
      width: 14px;
      height: 14px;
      color: #93c5fd;
      font-size: 14px;
    }

    .engine-cta {
      min-height: 46px;
      border-radius: 13px;
      background: #ffffff;
      color: #0f172a;
      font-weight: 750;
      box-shadow: 0 10px 28px -14px rgba(255, 255, 255, 0.35);
    }

    .engine-cta:hover {
      background: #f1f5f9;
    }

    .engine-match-art {
      position: relative;
      display: flex;
      min-height: 280px;
      align-items: center;
      justify-content: center;
      isolation: isolate;
    }

    .engine-grid {
      position: absolute;
      width: min(100%, 300px);
      aspect-ratio: 1;
      border: 1px solid rgba(191, 219, 254, 0.16);
      border-radius: 22px;
      background:
        linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
        linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px);
      background-size: 12.5% 12.5%;
      transform: rotate(8deg);
    }

    .engine-match-art > img {
      position: relative;
      z-index: 1;
      width: min(56%, 190px);
      filter: drop-shadow(0 34px 26px rgba(0, 0, 0, 0.48));
      transform: rotate(-5deg);
    }

    .engine-badge {
      position: absolute;
      right: 4%;
      bottom: 4%;
      z-index: 2;
      display: flex;
      flex-direction: column;
      min-width: 100px;
      padding: 10px 13px;
      border: 1px solid rgba(191, 219, 254, 0.22);
      border-radius: 13px;
      background: rgba(15, 23, 42, 0.82);
      box-shadow: 0 14px 35px -20px rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
    }

    .engine-badge span {
      color: #ffffff;
      font-size: 1.15rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
    }

    .engine-badge small {
      margin-top: 2px;
      color: #94a3b8;
      font-size: 0.63rem;
      font-weight: 600;
    }

    .play-options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
      gap: 18px;
    }

    .play-options-grid .cm-feature-card {
      min-height: 225px;
    }

    .play-note {
      margin-top: 20px;
    }

    @media (max-width: 800px) {
      .engine-match {
        grid-template-columns: 1fr;
      }

      .engine-match-art {
        min-height: 220px;
      }

      .engine-grid {
        width: 230px;
      }

      .engine-match-art > img {
        width: 150px;
      }
    }

    @media (max-width: 520px) {
      .engine-match {
        padding: 24px 20px;
        border-radius: 24px;
      }

      .engine-match-art {
        display: none;
      }

      .engine-cta {
        width: 100%;
      }

      .engine-tags {
        margin-bottom: 22px;
      }
    }
  `]
})
export class PlayComponent {
  readonly language = inject(LanguageService);

  constructor(private dialog: MatDialog, private router: Router) {}

  playVsBot(): void {
    const dialogRef = this.dialog.open(PlayVsBotDialogComponent, {
      width: '800px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'premium-dialog',
      autoFocus: 'dialog',
      restoreFocus: true,
      data: { color: 'white' }
    });

    dialogRef.afterClosed().subscribe((result: BotDialogResult) => {
      if (result) {
        this.router.navigate(['/game/bot'], {
          queryParams: {
            color: result.color,
            skill: result.skillLevel,
            time: result.timeControl
          }
        });
      }
    });
  }
}
