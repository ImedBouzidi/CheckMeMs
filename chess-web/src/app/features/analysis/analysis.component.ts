import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="cm-page analysis-page">
      <header class="cm-page-header">
        <div class="cm-page-heading">
          <span class="cm-eyebrow"><mat-icon>insights</mat-icon> {{ language.t('analysis.eyebrow') }}</span>
          <h1 class="cm-page-title">{{ language.t('analysis.title') }}</h1>
          <p class="cm-page-subtitle">
            {{ language.t('analysis.subtitle') }}
          </p>
        </div>
        <div class="cm-page-actions">
          <span class="cm-tag cm-tag--gold">{{ language.t('common.inDevelopment') }}</span>
        </div>
      </header>

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
            <span>{{ language.t('analysis.note') }}</span>
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

    @media (max-width: 900px) {
      .analysis-stage {
        grid-template-columns: 1fr;
      }

      .drop-zone {
        min-height: 280px;
      }
    }

    @media (max-width: 520px) {
      .drop-zone,
      .review-preview {
        padding: 20px;
      }
    }
  `]
})
export class AnalysisComponent {
  readonly language = inject(LanguageService);
}
