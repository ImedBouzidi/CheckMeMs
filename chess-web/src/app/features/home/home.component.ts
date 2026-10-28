import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, Router } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="cm-page home-page">
      <section class="home-hero" aria-labelledby="home-title">
        <div class="hero-copy">
          <div class="hero-topline">
            <span class="cm-eyebrow">
              <mat-icon>north_east</mat-icon>
              {{ language.t('home.eyebrow') }}
            </span>
          </div>
          <h1 id="home-title" class="hero-title">
            {{ language.t('home.titleA') }}<br>
            <span>{{ language.t('home.titleB') }}</span>
          </h1>
          <p class="hero-subtitle">
            {{ language.t('home.subtitle') }}
          </p>

          <div class="hero-actions">
            <a mat-flat-button color="primary" routerLink="/play">
              <mat-icon>play_arrow</mat-icon>
              {{ language.t('home.startGame') }}
            </a>
            <a mat-stroked-button routerLink="/analysis">
              <mat-icon>insights</mat-icon>
              {{ language.t('home.reviewGame') }}
            </a>
          </div>

          <div class="hero-points" [attr.aria-label]="language.t('home.highlights')">
            <span><mat-icon>check_circle</mat-icon> {{ language.t('home.point1') }}</span>
            <span><mat-icon>check_circle</mat-icon> {{ language.t('home.point2') }}</span>
            <span><mat-icon>check_circle</mat-icon> {{ language.t('home.point3') }}</span>
          </div>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="hero-orbit hero-orbit--one"></div>
          <div class="hero-orbit hero-orbit--two"></div>
          <div class="hero-board">
            <img class="hero-piece hero-piece--knight" src="assets/chess-pieces/wN.svg" alt="">
            <img class="hero-piece hero-piece--king" src="assets/chess-pieces/bK.svg" alt="">
            <img class="hero-piece hero-piece--pawn" src="assets/chess-pieces/wP.svg" alt="">
          </div>
          <div class="engine-pill">
            <span class="engine-pill-icon"><mat-icon>memory</mat-icon></span>
            <span>
              <strong>{{ language.t('home.engineReady') }}</strong>
              <small>{{ language.t('home.engineSub') }}</small>
            </span>
          </div>
        </div>
      </section>

      <section class="cm-section" aria-labelledby="tools-title">
        <div class="cm-section-heading">
          <div>
            <h2 id="tools-title" class="cm-section-title">{{ language.t('home.toolsTitle') }}</h2>
            <p class="cm-section-copy">{{ language.t('home.toolsCopy') }}</p>
          </div>
          <a mat-button routerLink="/play" class="view-all-link">
            {{ language.t('home.openPlayHub') }}
            <mat-icon>arrow_forward</mat-icon>
          </a>
        </div>

        <div class="cm-feature-grid">
          <article class="cm-feature-card play-card">
            <div class="cm-card-top">
              <span class="cm-icon-tile">
                <mat-icon>sports_esports</mat-icon>
              </span>
              <span class="cm-tag cm-tag--blue">{{ language.t('home.playTag') }}</span>
            </div>
            <h3>{{ language.t('home.playTitle') }}</h3>
            <p>{{ language.t('home.playText') }}</p>
            <div class="cm-card-footer">
              <a mat-flat-button color="primary" routerLink="/play">
                {{ language.t('home.playCta') }}
                <mat-icon>arrow_forward</mat-icon>
              </a>
              <span class="cm-card-meta">{{ language.t('home.playMeta') }}</span>
            </div>
          </article>

          <article class="cm-feature-card">
            <div class="cm-card-top">
              <span class="cm-icon-tile cm-icon-tile--gold">
                <mat-icon>extension</mat-icon>
              </span>
              <span class="cm-tag">{{ language.t('home.puzzlesTag') }}</span>
            </div>
            <h3>{{ language.t('home.puzzlesTitle') }}</h3>
            <p>{{ language.t('home.puzzlesText') }}</p>
            <div class="cm-card-footer">
              <a mat-stroked-button routerLink="/puzzles">{{ language.t('home.puzzlesCta') }}</a>
            </div>
          </article>

          <article class="cm-feature-card">
            <div class="cm-card-top">
              <span class="cm-icon-tile cm-icon-tile--slate">
                <mat-icon>auto_stories</mat-icon>
              </span>
              <span class="cm-tag">{{ language.t('home.openingsTag') }}</span>
            </div>
            <h3>{{ language.t('home.openingsTitle') }}</h3>
            <p>{{ language.t('home.openingsText') }}</p>
            <div class="cm-card-footer">
              <a mat-stroked-button routerLink="/openings">{{ language.t('home.openingsCta') }}</a>
            </div>
          </article>

          <article class="cm-feature-card">
            <div class="cm-card-top">
              <span class="cm-icon-tile cm-icon-tile--green">
                <mat-icon>insights</mat-icon>
              </span>
              <span class="cm-tag">{{ language.t('home.reviewTag') }}</span>
            </div>
            <h3>{{ language.t('home.reviewTitle') }}</h3>
            <p>{{ language.t('home.reviewText') }}</p>
            <div class="cm-card-footer">
              <a mat-stroked-button routerLink="/analysis">{{ language.t('home.reviewCta') }}</a>
            </div>
          </article>

          <article class="cm-feature-card">
            <div class="cm-card-top">
              <span class="cm-icon-tile cm-icon-tile--slate">
                <mat-icon>school</mat-icon>
              </span>
              <span class="cm-tag">{{ language.t('home.learnTag') }}</span>
            </div>
            <h3>{{ language.t('home.learnTitle') }}</h3>
            <p>{{ language.t('home.learnText') }}</p>
            <div class="cm-card-footer">
              <a mat-stroked-button routerLink="/learn">{{ language.t('home.learnCta') }}</a>
            </div>
          </article>
        </div>
      </section>

      <section class="kids-strip" aria-labelledby="kids-strip-title">
        <div class="kids-strip-icon" aria-hidden="true">
          <mat-icon>child_care</mat-icon>
        </div>
        <div class="kids-strip-copy">
          <span class="kids-strip-label">{{ language.t('home.kidsLabel') }}</span>
          <h2 id="kids-strip-title">{{ language.t('home.kidsTitle') }}</h2>
          <p>{{ language.t('home.kidsText') }}</p>
        </div>
        <button mat-stroked-button class="kids-strip-button" type="button" (click)="openKidsMode()">
          {{ language.t('home.kidsCta') }}
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </section>
    </div>
  `,
  styles: [`
    .home-page {
      padding-bottom: 20px;
    }

    .home-hero {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
      gap: clamp(28px, 5vw, 64px);
      align-items: center;
      overflow: hidden;
      padding: clamp(28px, 5vw, 58px);
      border: 1px solid rgba(191, 219, 254, 0.8);
      border-radius: 30px;
      background:
        radial-gradient(540px 340px at 94% 8%, rgba(191, 219, 254, 0.72), transparent 66%),
        radial-gradient(420px 280px at 4% 100%, rgba(254, 243, 199, 0.52), transparent 70%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 255, 0.96));
      box-shadow: var(--cm-shadow-lg);
    }

    .home-hero::before {
      position: absolute;
      top: -90px;
      right: 34%;
      width: 220px;
      height: 220px;
      border: 1px solid rgba(37, 99, 235, 0.08);
      border-radius: 50%;
      content: '';
      pointer-events: none;
    }

    .hero-copy {
      position: relative;
      z-index: 1;
    }

    .hero-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px 16px;
      margin-bottom: 10px;
    }

    .hero-topline .cm-eyebrow {
      margin-bottom: 0;
    }

    .hero-title {
      max-width: 640px;
      margin: 0;
      color: #0f172a;
      font-size: clamp(2.5rem, 5.3vw, 4.5rem);
      font-weight: 800;
      line-height: 0.98;
      letter-spacing: -0.065em;
    }

    .hero-title span {
      background: linear-gradient(100deg, #1d4ed8 0%, #2563eb 48%, #0e7490 100%);
      background-clip: text;
      color: transparent;
    }

    .hero-subtitle {
      max-width: 57ch;
      margin: 22px 0 0;
      color: #52627a;
      font-size: clamp(0.98rem, 1.5vw, 1.08rem);
      line-height: 1.7;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 11px;
      margin-top: 28px;
    }

    .hero-actions a {
      min-height: 46px;
      border-radius: 13px;
    }

    .hero-points {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      margin-top: 24px;
      color: #52627a;
      font-size: 0.79rem;
      font-weight: 600;
    }

    .hero-points span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .hero-points mat-icon {
      width: 17px;
      height: 17px;
      color: #059669;
      font-size: 17px;
    }

    .hero-visual {
      position: relative;
      display: flex;
      min-height: 350px;
      align-items: center;
      justify-content: center;
      isolation: isolate;
    }

    .hero-orbit {
      position: absolute;
      border: 1px solid rgba(37, 99, 235, 0.12);
      border-radius: 50%;
      pointer-events: none;
    }

    .hero-orbit--one {
      width: 340px;
      height: 340px;
    }

    .hero-orbit--two {
      width: 430px;
      height: 430px;
      border-style: dashed;
      opacity: 0.7;
    }

    .hero-board {
      position: relative;
      width: min(100%, 350px);
      aspect-ratio: 1;
      overflow: hidden;
      border: 8px solid rgba(255, 255, 255, 0.9);
      border-radius: 22px;
      background: repeating-conic-gradient(#e4eaf2 0% 25%, #f9fbfe 0% 50%) 50% / 25% 25%;
      box-shadow:
        0 34px 60px -28px rgba(15, 23, 42, 0.55),
        0 12px 26px -18px rgba(15, 23, 42, 0.35);
      transform: rotate(-4deg);
    }

    .hero-board::after {
      position: absolute;
      inset: 0;
      border: 1px solid rgba(255, 255, 255, 0.7);
      border-radius: 13px;
      background: linear-gradient(140deg, rgba(255, 255, 255, 0.2), transparent 42%);
      content: '';
      pointer-events: none;
    }

    .hero-piece {
      position: absolute;
      z-index: 1;
      filter: drop-shadow(0 16px 14px rgba(15, 23, 42, 0.28));
    }

    .hero-piece--knight {
      top: 21%;
      left: 24%;
      width: 40%;
      transform: rotate(-7deg);
    }

    .hero-piece--king {
      right: 9%;
      bottom: 9%;
      width: 31%;
      transform: rotate(5deg);
    }

    .hero-piece--pawn {
      bottom: 18%;
      left: 12%;
      width: 19%;
      opacity: 0.88;
      transform: rotate(10deg);
    }

    .engine-pill {
      position: absolute;
      right: max(0px, 4%);
      bottom: 5%;
      z-index: 3;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px 10px 10px;
      border: 1px solid rgba(203, 213, 225, 0.9);
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 16px 35px -18px rgba(15, 23, 42, 0.42);
      backdrop-filter: blur(12px);
    }

    .engine-pill-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: var(--cm-success-soft);
      color: var(--cm-success);
    }

    .engine-pill-icon mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .engine-pill span:last-child {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .engine-pill strong {
      color: #0f172a;
      font-size: 0.76rem;
      font-weight: 700;
    }

    .engine-pill small {
      margin-top: 3px;
      color: var(--cm-muted);
      font-size: 0.65rem;
    }

    .view-all-link {
      flex: 0 0 auto;
      color: var(--cm-primary-dark);
      font-weight: 600;
    }

    .play-card {
      position: relative;
      overflow: hidden;
      border-color: rgba(147, 197, 253, 0.9);
      background:
        radial-gradient(280px 180px at 100% 0%, rgba(191, 219, 254, 0.65), transparent 70%),
        linear-gradient(145deg, #ffffff, #f5f9ff);
    }

    .play-card::after {
      position: absolute;
      right: -34px;
      bottom: -56px;
      width: 180px;
      height: 180px;
      border: 20px solid rgba(37, 99, 235, 0.045);
      border-radius: 34px;
      content: '';
      transform: rotate(18deg);
      pointer-events: none;
    }

    .play-card .cm-card-footer {
      position: relative;
      z-index: 1;
    }

    .kids-strip {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 30px;
      padding: 22px 26px;
      border: 1px solid #fde68a;
      border-radius: 22px;
      background:
        radial-gradient(240px 160px at 100% 0%, rgba(251, 191, 36, 0.2), transparent 70%),
        linear-gradient(120deg, #fffdf5, #fff7ed 50%, #fdf2f8);
      box-shadow: var(--cm-shadow-sm);
    }

    .kids-strip-icon {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border: 1px solid #fde68a;
      border-radius: 16px;
      background: #ffffff;
      color: #d97706;
    }

    .kids-strip-icon mat-icon {
      width: 27px;
      height: 27px;
      font-size: 27px;
    }

    .kids-strip-copy {
      flex: 1;
      min-width: 0;
    }

    .kids-strip-label {
      color: #b45309;
      font-size: 0.67rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .kids-strip h2 {
      margin: 3px 0 4px;
      color: #432c14;
      font-size: 1.02rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .kids-strip p {
      margin: 0;
      color: #78634e;
      font-size: 0.84rem;
      line-height: 1.5;
    }

    .kids-strip-button {
      flex: 0 0 auto;
      border-color: #f0c674;
      border-radius: 12px;
      color: #92400e;
      font-weight: 700;
    }

    @media (min-width: 900px) {
      .play-card {
        grid-column: span 2;
      }
    }

    @media (max-width: 900px) {
      .home-hero {
        grid-template-columns: 1fr;
      }

      .hero-visual {
        min-height: 300px;
      }

      .hero-board {
        width: min(78vw, 330px);
      }
    }

    @media (max-width: 720px) {
      .view-all-link {
        display: none;
      }

      .kids-strip {
        align-items: flex-start;
        flex-wrap: wrap;
        padding: 20px;
      }

      .kids-strip-copy {
        flex-basis: calc(100% - 76px);
      }

      .kids-strip-button {
        width: 100%;
      }
    }

    @media (max-width: 520px) {
      .home-hero {
        padding: 24px 20px 28px;
        border-radius: 24px;
      }

      .hero-title {
        font-size: clamp(2.4rem, 13vw, 3.2rem);
      }

      .hero-actions a {
        flex: 1;
      }

      .hero-visual {
        min-height: 260px;
      }

      .hero-orbit--two {
        display: none;
      }

      .hero-board {
        width: min(72vw, 280px);
      }

      .engine-pill {
        right: 1%;
        bottom: 0;
        padding: 8px 11px 8px 8px;
      }

      .hero-points {
        gap: 7px 12px;
      }

      .hero-points span:last-child {
        display: none;
      }

      .kids-strip-icon {
        width: 44px;
        height: 44px;
        border-radius: 13px;
      }
    }
  `]
})
export class HomeComponent {
  readonly language = inject(LanguageService);

  constructor(private router: Router) {}

  openKidsMode(): void {
    this.router.navigate(['/kids']);
  }
}
