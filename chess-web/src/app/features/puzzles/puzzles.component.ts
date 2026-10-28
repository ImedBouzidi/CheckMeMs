import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-puzzles',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="cm-page puzzles-page">
      <header class="cm-page-header">
        <div class="cm-page-heading">
          <span class="cm-eyebrow"><mat-icon>extension</mat-icon> {{ language.t('puzzles.eyebrow') }}</span>
          <h1 class="cm-page-title">{{ language.t('puzzles.title') }}</h1>
          <p class="cm-page-subtitle">
            {{ language.t('puzzles.subtitle') }}
          </p>
        </div>
        <div class="cm-page-actions">
          <span class="cm-tag cm-tag--gold">{{ language.t('common.inDevelopment') }}</span>
        </div>
      </header>

      <section class="puzzle-stage">
        <div class="puzzle-copy">
          <span class="puzzle-kicker"><mat-icon>today</mat-icon> {{ language.t('puzzles.daily') }}</span>
          <h2>{{ language.t('puzzles.titleA') }}<br><span>{{ language.t('puzzles.titleB') }}</span></h2>
          <p>
            {{ language.t('puzzles.text') }}
          </p>
          <div class="cm-button-row">
            <button mat-flat-button color="primary" type="button" disabled>
              <mat-icon>play_arrow</mat-icon>
              {{ language.t('puzzles.start') }}
            </button>
            <span class="puzzle-note">{{ language.t('puzzles.note') }}</span>
          </div>

          <div class="theme-chips" [attr.aria-label]="language.t('puzzles.themesAria')">
            <span>{{ language.t('puzzles.fork') }}</span>
            <span>{{ language.t('puzzles.pin') }}</span>
            <span>{{ language.t('puzzles.backRank') }}</span>
            <span>{{ language.t('puzzles.discovered') }}</span>
            <span>{{ language.t('puzzles.endgame') }}</span>
          </div>
        </div>

        <div class="puzzle-board-wrap" aria-hidden="true">
          <div class="puzzle-board">
            <img class="puzzle-piece p1" src="assets/chess-pieces/bK.svg" alt="">
            <img class="puzzle-piece p2" src="assets/chess-pieces/wQ.svg" alt="">
            <img class="puzzle-piece p3" src="assets/chess-pieces/bP.svg" alt="">
            <img class="puzzle-piece p4" src="assets/chess-pieces/wR.svg" alt="">
            <div class="puzzle-target"></div>
          </div>
          <div class="puzzle-badge">
            <mat-icon>bolt</mat-icon>
            <span><strong>{{ language.t('puzzles.streak') }}</strong><small>{{ language.t('puzzles.streakSub') }}</small></span>
          </div>
        </div>
      </section>

      <section class="cm-section" aria-labelledby="puzzle-features-title">
        <div class="cm-section-heading">
          <div>
            <h2 id="puzzle-features-title" class="cm-section-title">{{ language.t('puzzles.featuresTitle') }}</h2>
            <p class="cm-section-copy">{{ language.t('puzzles.featuresCopy') }}</p>
          </div>
        </div>

        <div class="cm-feature-grid">
          <article class="cm-feature-card">
            <span class="cm-icon-tile cm-icon-tile--gold"><mat-icon>local_fire_department</mat-icon></span>
            <h3>{{ language.t('puzzles.f1Title') }}</h3>
            <p>{{ language.t('puzzles.f1Text') }}</p>
          </article>
          <article class="cm-feature-card">
            <span class="cm-icon-tile"><mat-icon>category</mat-icon></span>
            <h3>{{ language.t('puzzles.f2Title') }}</h3>
            <p>{{ language.t('puzzles.f2Text') }}</p>
          </article>
          <article class="cm-feature-card">
            <span class="cm-icon-tile cm-icon-tile--green"><mat-icon>trending_up</mat-icon></span>
            <h3>{{ language.t('puzzles.f3Title') }}</h3>
            <p>{{ language.t('puzzles.f3Text') }}</p>
          </article>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .puzzles-page {
      max-width: 1080px;
    }

    .puzzle-stage {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.95fr);
      gap: clamp(28px, 5vw, 60px);
      align-items: center;
      overflow: hidden;
      padding: clamp(28px, 5vw, 52px);
      border: 1px solid #fde68a;
      border-radius: 28px;
      background:
        radial-gradient(460px 280px at 100% 0%, rgba(251, 191, 36, 0.2), transparent 70%),
        radial-gradient(380px 280px at 0% 100%, rgba(191, 219, 254, 0.42), transparent 70%),
        linear-gradient(135deg, #fffef8, #fffcf2 52%, #f8fbff);
      box-shadow: var(--cm-shadow-lg);
    }

    .puzzle-copy {
      position: relative;
      z-index: 1;
    }

    .puzzle-kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px;
      border: 1px solid #fde68a;
      border-radius: 999px;
      background: #fffbeb;
      color: #b45309;
      font-size: 0.67rem;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .puzzle-kicker mat-icon {
      width: 15px;
      height: 15px;
      font-size: 15px;
    }

    .puzzle-copy h2 {
      margin: 17px 0 13px;
      color: #1c1917;
      font-size: clamp(2rem, 4.2vw, 3.25rem);
      font-weight: 800;
      line-height: 1.02;
      letter-spacing: -0.055em;
    }

    .puzzle-copy h2 span {
      color: #b45309;
    }

    .puzzle-copy > p {
      max-width: 52ch;
      margin: 0;
      color: #6b6259;
      font-size: 0.94rem;
      line-height: 1.7;
    }

    .puzzle-copy .cm-button-row {
      margin-top: 24px;
    }

    .puzzle-note {
      color: #94765d;
      font-size: 0.7rem;
    }

    .theme-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 24px;
    }

    .theme-chips span {
      padding: 4px 8px;
      border: 1px solid #e7e5e4;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.72);
      color: #78716c;
      font-size: 0.67rem;
      font-weight: 600;
    }

    .puzzle-board-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .puzzle-board {
      position: relative;
      width: min(100%, 340px);
      aspect-ratio: 1;
      border: 8px solid #ffffff;
      border-radius: 20px;
      background: repeating-conic-gradient(#e5d9c8 0% 25%, #f8f1e7 0% 50%) 50% / 25% 25%;
      box-shadow: 0 28px 55px -30px rgba(68, 51, 33, 0.65);
      transform: rotate(3deg);
    }

    .puzzle-piece {
      position: absolute;
      width: 20%;
      filter: drop-shadow(0 10px 8px rgba(68, 51, 33, 0.23));
    }

    .p1 { top: 6%; right: 13%; width: 17%; }
    .p2 { top: 34%; left: 14%; width: 22%; }
    .p3 { right: 29%; bottom: 20%; width: 17%; }
    .p4 { bottom: 6%; left: 26%; width: 21%; }

    .puzzle-target {
      position: absolute;
      top: 50%;
      right: 14%;
      width: 12.5%;
      aspect-ratio: 1;
      border: 4px solid rgba(185, 28, 28, 0.68);
      border-radius: 50%;
      box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.22);
    }

    .puzzle-badge {
      position: absolute;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border: 1px solid #fde68a;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 14px 30px -18px rgba(68, 51, 33, 0.45);
      backdrop-filter: blur(10px);
    }

    .puzzle-badge mat-icon {
      width: 18px;
      height: 18px;
      color: #d97706;
      font-size: 18px;
    }

    .puzzle-badge span {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .puzzle-badge strong {
      color: #573b22;
      font-size: 0.69rem;
    }

    .puzzle-badge small {
      margin-top: 2px;
      color: #a08a75;
      font-size: 0.61rem;
    }

    @media (max-width: 850px) {
      .puzzle-stage {
        grid-template-columns: 1fr;
      }

      .puzzle-board-wrap {
        padding: 12px 0 22px;
      }

      .puzzle-board {
        width: min(70vw, 300px);
      }
    }

    @media (max-width: 520px) {
      .puzzle-stage {
        padding: 24px 20px;
        border-radius: 24px;
      }

      .puzzle-note {
        display: none;
      }

      .puzzle-copy .cm-button-row button {
        width: 100%;
      }
    }
  `]
})
export class PuzzlesComponent {
  readonly language = inject(LanguageService);
}
