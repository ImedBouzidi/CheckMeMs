import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-openings',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="cm-page openings-page">
      <header class="cm-page-header">
        <div class="cm-page-heading">
          <span class="cm-eyebrow"><mat-icon>auto_stories</mat-icon> {{ language.t('openings.eyebrow') }}</span>
          <h1 class="cm-page-title">{{ language.t('openings.title') }}</h1>
          <p class="cm-page-subtitle">
            {{ language.t('openings.subtitle') }}
          </p>
        </div>
        <div class="cm-page-actions">
          <span class="cm-tag cm-tag--gold">{{ language.t('common.inDevelopment') }}</span>
        </div>
      </header>

      <section class="explorer-layout">
        <div class="explorer-panel">
          <div class="explorer-toolbar">
            <div class="search-preview" aria-disabled="true">
              <mat-icon>search</mat-icon>
              <span>{{ language.t('openings.search') }}</span>
              <kbd>⌘ K</kbd>
            </div>
            <span class="cm-tag">{{ language.t('openings.preview') }}</span>
          </div>

          <div class="opening-list" [attr.aria-label]="language.t('openings.explorerAria')">
            <div class="opening-list-heading">
              <span>{{ language.t('openings.popular') }}</span>
              <span>{{ language.t('openings.lines') }}</span>
            </div>
            <div class="opening-row opening-row--active">
              <span class="opening-glyph">e4</span>
              <span><strong>{{ language.t('openings.kingsPawn') }}</strong><small>{{ language.t('openings.kingsPawnSub') }}</small></span>
              <span class="opening-count">1.e4</span>
            </div>
            <div class="opening-row">
              <span class="opening-glyph">d4</span>
              <span><strong>{{ language.t('openings.queensPawn') }}</strong><small>{{ language.t('openings.queensPawnSub') }}</small></span>
              <span class="opening-count">1.d4</span>
            </div>
            <div class="opening-row">
              <span class="opening-glyph">c4</span>
              <span><strong>{{ language.t('openings.english') }}</strong><small>{{ language.t('openings.englishSub') }}</small></span>
              <span class="opening-count">1.c4</span>
            </div>
            <div class="opening-row">
              <span class="opening-glyph">Nf3</span>
              <span><strong>{{ language.t('openings.reti') }}</strong><small>{{ language.t('openings.retiSub') }}</small></span>
              <span class="opening-count">1.Nf3</span>
            </div>
          </div>
        </div>

        <aside class="line-preview">
          <div class="line-header">
            <span class="cm-tag cm-tag--blue">{{ language.t('openings.exampleLine') }}</span>
            <mat-icon>bookmark_border</mat-icon>
          </div>
          <h2>{{ language.t('openings.italian') }}</h2>
          <p class="line-family">{{ language.t('openings.family') }}</p>

          <div class="line-moves" [attr.aria-label]="language.t('openings.movesAria')">
            <span>1. e4</span>
            <span>e5</span>
            <span>2. Nf3</span>
            <span>Nc6</span>
            <span>3. Bc4</span>
            <span>Bc5</span>
          </div>

          <div class="line-idea">
            <mat-icon>lightbulb</mat-icon>
            <div>
              <strong>{{ language.t('openings.idea') }}</strong>
              <p>{{ language.t('openings.ideaText') }}</p>
            </div>
          </div>

          <div class="line-facts">
            <div><span>{{ language.t('openings.style') }}</span><strong>{{ language.t('openings.classical') }}</strong></div>
            <div><span>{{ language.t('openings.plans') }}</span><strong>{{ language.t('openings.plansValue') }}</strong></div>
          </div>
        </aside>
      </section>

      <section class="cm-section" aria-labelledby="opening-tools-title">
        <div class="cm-section-heading">
          <h2 id="opening-tools-title" class="cm-section-title">{{ language.t('openings.toolsTitle') }}</h2>
        </div>
        <div class="cm-feature-grid">
          <article class="cm-feature-card">
            <span class="cm-icon-tile"><mat-icon>account_tree</mat-icon></span>
            <h3>{{ language.t('openings.o1Title') }}</h3>
            <p>{{ language.t('openings.o1Text') }}</p>
          </article>
          <article class="cm-feature-card">
            <span class="cm-icon-tile cm-icon-tile--gold"><mat-icon>bookmarks</mat-icon></span>
            <h3>{{ language.t('openings.o2Title') }}</h3>
            <p>{{ language.t('openings.o2Text') }}</p>
          </article>
          <article class="cm-feature-card">
            <span class="cm-icon-tile cm-icon-tile--green"><mat-icon>repeat</mat-icon></span>
            <h3>{{ language.t('openings.o3Title') }}</h3>
            <p>{{ language.t('openings.o3Text') }}</p>
          </article>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .openings-page {
      max-width: 1160px;
    }

    .explorer-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
      gap: 22px;
      align-items: stretch;
    }

    .explorer-panel,
    .line-preview {
      border: 1px solid #dbe3ee;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: var(--cm-shadow-sm);
    }

    .explorer-panel {
      padding: 22px;
    }

    .explorer-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }

    .search-preview {
      display: flex;
      flex: 1;
      align-items: center;
      gap: 9px;
      min-height: 42px;
      padding: 0 13px;
      border: 1px solid #dbe3ee;
      border-radius: 12px;
      background: #f8fafc;
      color: var(--cm-muted-light);
      font-size: 0.82rem;
    }

    .search-preview mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .search-preview kbd {
      margin-left: auto;
      padding: 2px 6px;
      border: 1px solid #dbe3ee;
      border-radius: 5px;
      background: #ffffff;
      color: #94a3b8;
      font-family: inherit;
      font-size: 0.65rem;
      font-weight: 600;
    }

    .opening-list-heading {
      display: flex;
      justify-content: space-between;
      padding: 0 10px 9px;
      color: var(--cm-muted-light);
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .opening-row {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr) auto;
      align-items: center;
      gap: 11px;
      padding: 11px 10px;
      border-radius: 12px;
      color: var(--cm-ink-soft);
    }

    .opening-row + .opening-row {
      border-top: 1px solid #f1f5f9;
    }

    .opening-row--active {
      border-top-color: transparent;
      background: #eff6ff;
    }

    .opening-glyph {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      color: #1e3a8a;
      font-family: monospace;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .opening-row span:nth-child(2) {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
    }

    .opening-row strong {
      font-size: 0.82rem;
      font-weight: 700;
    }

    .opening-row small {
      color: var(--cm-muted);
      font-size: 0.69rem;
    }

    .opening-count {
      color: #94a3b8;
      font-family: monospace;
      font-size: 0.68rem;
    }

    .line-preview {
      display: flex;
      flex-direction: column;
      padding: 24px;
      background:
        radial-gradient(260px 180px at 100% 0%, rgba(219, 234, 254, 0.65), transparent 72%),
        #ffffff;
    }

    .line-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #94a3b8;
    }

    .line-header mat-icon {
      width: 19px;
      height: 19px;
      font-size: 19px;
    }

    .line-preview h2 {
      margin: 18px 0 2px;
      color: var(--cm-ink);
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.04em;
    }

    .line-family {
      margin: 0;
      color: var(--cm-muted-light);
      font-size: 0.7rem;
      font-weight: 600;
    }

    .line-moves {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 22px 0;
    }

    .line-moves span {
      padding: 5px 8px;
      border: 1px solid #dbe3ee;
      border-radius: 7px;
      background: #f8fafc;
      color: #334155;
      font-family: monospace;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .line-idea {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      padding: 13px;
      border: 1px solid #fde68a;
      border-radius: 12px;
      background: #fffbeb;
    }

    .line-idea mat-icon {
      width: 19px;
      height: 19px;
      color: #d97706;
      font-size: 19px;
    }

    .line-idea strong {
      display: block;
      margin-bottom: 3px;
      color: #92400e;
      font-size: 0.76rem;
    }

    .line-idea p {
      margin: 0;
      color: #78634e;
      font-size: 0.72rem;
      line-height: 1.5;
    }

    .line-facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-top: auto;
      padding-top: 20px;
    }

    .line-facts div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px;
      border-radius: 10px;
      background: #f8fafc;
    }

    .line-facts span {
      color: var(--cm-muted-light);
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .line-facts strong {
      color: var(--cm-ink-soft);
      font-size: 0.72rem;
    }

    @media (max-width: 920px) {
      .explorer-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 520px) {
      .explorer-panel,
      .line-preview {
        padding: 18px;
      }

      .search-preview kbd {
        display: none;
      }
    }
  `]
})
export class OpeningsComponent {
  readonly language = inject(LanguageService);
}
