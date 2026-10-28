import { Component, Inject, OnInit, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../core/i18n/language.service';

export interface BotDialogData {
  color: 'white' | 'black' | 'random';
}

export interface BotDialogResult {
  color: 'white' | 'black';
  skillLevel: number;
  timeControl: string;
}

type ColorOption = 'white' | 'black' | 'random';
type TimeTone = 'unlimited' | 'bullet' | 'blitz' | 'rapid';

interface TimeOption {
  value: string;
  label: string;
  description: string;
  icon: string;
  tone: TimeTone;
}

@Component({
  selector: 'app-play-vs-bot-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    FormsModule
  ],
  template: `
    <div class="dialog-heading">
      <span class="dialog-mark" aria-hidden="true">
        <mat-icon>smart_toy</mat-icon>
      </span>
      <div class="dialog-heading-copy">
        <h2 mat-dialog-title id="bot-dialog-title">{{ language.t('dialog.title') }}</h2>
        <p>{{ language.t('dialog.subtitle') }}</p>
      </div>
      <button
        mat-icon-button
        class="dialog-close"
        type="button"
        (click)="onCancel()"
        [attr.aria-label]="language.t('common.dismiss')">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="setup-grid">
        <div class="setup-column">
          <section class="setup-section" aria-labelledby="side-label">
            <div class="section-heading">
              <span id="side-label" class="setup-label">
                <mat-icon aria-hidden="true">person_pin</mat-icon>
                {{ language.t('dialog.chooseSide') }}
              </span>
              <span class="section-hint">{{ language.t('dialog.randomHint') }}</span>
            </div>

            <div class="color-grid" role="radiogroup" aria-labelledby="side-label">
              @for (option of colorOptions; track option.value) {
                <button
                  type="button"
                  class="color-option"
                  [class.selected]="color === option.value"
                  [attr.aria-checked]="color === option.value"
                  [attr.aria-label]="option.label + '. ' + option.description"
                  role="radio"
                  (click)="selectColor(option.value)">
                  <span class="color-art">
                    @if (option.value === 'random') {
                      <mat-icon>casino</mat-icon>
                    } @else {
                      <img [src]="'assets/chess-pieces/' + (option.value === 'white' ? 'wK' : 'bK') + '.svg'" alt="">
                    }
                  </span>
                  <span class="color-copy">
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.description }}</small>
                  </span>
                  <mat-icon class="color-check">{{ color === option.value ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                </button>
              }
            </div>
          </section>

          <section class="setup-section" aria-labelledby="strength-label">
            <div class="section-heading strength-heading">
              <span id="strength-label" class="setup-label">
                <mat-icon aria-hidden="true">tune</mat-icon>
                {{ language.t('dialog.botStrength') }}
              </span>
              <span class="strength-badge">
                {{ getSkillLabel(skillLevel) }} <span class="strength-elo">{{ language.t('dialog.elo', { elo: getBotElo() }) }}</span>
              </span>
            </div>

            <mat-slider
              class="strength-slider"
              min="0"
              max="20"
              step="1"
              discrete
              [attr.aria-label]="language.t('dialog.skillAria')">
              <input matSliderThumb [(ngModel)]="skillLevel">
            </mat-slider>

            <div class="strength-scale" aria-hidden="true">
              <span>{{ language.t('dialog.band.beginner') }}</span>
              <span>{{ language.t('dialog.band.casual') }}</span>
              <span>{{ language.t('dialog.band.club') }}</span>
              <span>{{ language.t('dialog.band.master') }}</span>
            </div>

            <div class="skill-presets" [attr.aria-label]="language.t('dialog.presets')">
              @for (preset of strengthPresets; track preset.value) {
                <button
                  type="button"
                  class="preset-chip"
                  [class.selected]="skillLevel === preset.value"
                  (click)="setSkill(preset.value)">
                  {{ preset.label }}
                </button>
              }
            </div>
          </section>
        </div>

        <div class="setup-column">
          <section class="setup-section" aria-labelledby="time-label">
            <div class="section-heading">
              <span id="time-label" class="setup-label">
                <mat-icon aria-hidden="true">timer</mat-icon>
                {{ language.t('dialog.timeControl') }}
              </span>
              <span class="section-hint">{{ language.t('dialog.timeHint') }}</span>
            </div>

            <div class="time-grid" role="radiogroup" aria-labelledby="time-label">
              @for (option of timeOptions; track option.value) {
                <button
                  type="button"
                  class="time-option"
                  [class.selected]="timeControl === option.value"
                  [attr.aria-checked]="timeControl === option.value"
                  [attr.aria-label]="option.label + '. ' + option.description"
                  role="radio"
                  (click)="timeControl = option.value">
                  <span class="time-icon" [class]="'time-icon--' + option.tone" aria-hidden="true">
                    <mat-icon>{{ option.icon }}</mat-icon>
                  </span>
                  <span class="time-copy">
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.description }}</small>
                  </span>
                  <mat-icon class="time-check">
                    {{ timeControl === option.value ? 'check_circle' : 'radio_button_unchecked' }}
                  </mat-icon>
                </button>
              }
            </div>
          </section>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions" align="end">
      <div class="selection-summary" aria-live="polite">
        <span class="summary-chip">
          <mat-icon aria-hidden="true">person_pin</mat-icon>
          {{ selectedColorLabel }}
        </span>
        <span class="summary-chip">
          <mat-icon aria-hidden="true">tune</mat-icon>
          {{ getSkillLabel(skillLevel) }}
        </span>
        <span class="summary-chip">
          <mat-icon aria-hidden="true">{{ selectedTimeOption.icon }}</mat-icon>
          {{ selectedTimeOption.label }}
        </span>
      </div>
      <div class="dialog-action-buttons">
        <button mat-button type="button" (click)="onCancel()">{{ language.t('common.cancel') }}</button>
        <button mat-flat-button color="primary" type="button" (click)="onPlay()">
          <mat-icon>play_arrow</mat-icon>
          {{ language.t('dialog.startGame') }}
        </button>
      </div>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      color: var(--cm-ink);
    }

    .dialog-heading {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 22px 24px 18px;
      border-bottom: 1px solid var(--cm-line);
      background:
        radial-gradient(280px 150px at 100% 0%, rgba(37, 99, 235, 0.14), transparent 72%),
        linear-gradient(135deg, var(--cm-surface) 0%, var(--cm-surface-muted) 100%);
    }

    .dialog-mark {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border: 1px solid var(--cm-line);
      border-radius: 16px;
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
      box-shadow: var(--cm-shadow-sm);
    }

    .dialog-mark mat-icon {
      width: 26px;
      height: 26px;
      font-size: 26px;
    }

    .dialog-heading-copy {
      flex: 1 1 auto;
      min-width: 0;
    }

    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      color: var(--cm-ink);
      font-size: clamp(1.25rem, 2.4vw, 1.5rem);
      font-weight: 800;
      letter-spacing: -0.035em;
      line-height: 1.15;
    }

    .dialog-heading p {
      margin: 5px 0 0;
      color: var(--cm-muted);
      font-size: 0.86rem;
      line-height: 1.5;
    }

    .dialog-close {
      flex: 0 0 auto;
      margin: -6px -6px 0 auto;
      color: var(--cm-muted);
    }

    .dialog-close:hover {
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .dialog-content {
      max-height: min(70vh, 720px);
      padding: 20px 24px 6px !important;
      background: var(--cm-surface);
    }

    .setup-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }

    .setup-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }

    .setup-section {
      min-width: 0;
      padding: 16px;
      border: 1px solid var(--cm-line);
      border-radius: 18px;
      background: var(--cm-surface-muted);
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .setup-label {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--cm-ink);
      font-size: 0.85rem;
      font-weight: 750;
      line-height: 1.25;
    }

    .setup-label mat-icon {
      width: 17px;
      height: 17px;
      color: var(--cm-primary-dark);
      font-size: 17px;
    }

    .section-hint {
      color: var(--cm-muted);
      font-size: 0.69rem;
      line-height: 1.35;
      text-align: end;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .color-option {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-height: 102px;
      padding: 11px;
      border: 1px solid var(--cm-line);
      border-radius: 14px;
      background: var(--cm-surface);
      color: var(--cm-ink-soft);
      cursor: pointer;
      font: inherit;
      text-align: start;
      transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
    }

    .color-option:hover {
      border-color: var(--cm-primary);
      background: var(--cm-primary-soft);
      transform: translateY(-1px);
    }

    .color-option.selected {
      border-color: var(--cm-primary);
      background: var(--cm-primary-soft);
      box-shadow: inset 0 0 0 1px var(--cm-primary);
    }

    .color-art {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin-bottom: 9px;
      border-radius: 10px;
      background: var(--cm-surface);
      color: var(--cm-muted);
      box-shadow: var(--cm-shadow-sm);
    }

    .color-art img {
      width: 25px;
      height: 25px;
    }

    .color-art mat-icon {
      width: 19px;
      height: 19px;
      font-size: 19px;
    }

    .color-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .color-copy strong {
      color: var(--cm-ink);
      font-size: 0.8rem;
      font-weight: 750;
    }

    .color-copy small {
      color: var(--cm-muted);
      font-size: 0.65rem;
      line-height: 1.3;
    }

    .color-check {
      position: absolute;
      top: 9px;
      inset-inline-end: 9px;
      width: 17px;
      height: 17px;
      color: var(--cm-line-strong);
      font-size: 17px;
    }

    .color-option.selected .color-check {
      color: var(--cm-primary);
    }

    .strength-heading {
      align-items: flex-start;
    }

    .strength-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border: 1px solid var(--cm-line);
      border-radius: 9px;
      background: var(--cm-surface);
      color: var(--cm-primary-dark);
      font-size: 0.69rem;
      font-weight: 750;
      line-height: 1.3;
      white-space: nowrap;
    }

    .strength-elo {
      color: var(--cm-muted);
      font-weight: 600;
    }

    .strength-slider {
      width: 100%;
      --mdc-slider-active-track-color: var(--cm-primary);
      --mdc-slider-inactive-track-color: var(--cm-line-strong);
      --mdc-slider-handle-color: var(--cm-primary);
      --mdc-slider-focus-handle-color: var(--cm-primary);
      --mdc-slider-hover-handle-color: var(--cm-primary);
      --mdc-slider-with-tick-marks-active-container-color: var(--cm-primary);
      --mdc-slider-with-tick-marks-inactive-container-color: var(--cm-line-strong);
    }

    .strength-scale {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin-top: -4px;
      color: var(--cm-muted);
      font-size: 0.63rem;
      font-weight: 650;
    }

    .skill-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 13px;
    }

    .preset-chip {
      padding: 5px 9px;
      border: 1px solid var(--cm-line);
      border-radius: 999px;
      background: var(--cm-surface);
      color: var(--cm-muted);
      cursor: pointer;
      font: inherit;
      font-size: 0.69rem;
      font-weight: 650;
      transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
    }

    .preset-chip:hover {
      border-color: var(--cm-primary);
      color: var(--cm-primary-dark);
    }

    .preset-chip.selected {
      border-color: var(--cm-primary);
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .time-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .time-option {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      min-height: 64px;
      padding: 9px 10px;
      border: 1px solid var(--cm-line);
      border-radius: 13px;
      background: var(--cm-surface);
      color: var(--cm-ink-soft);
      cursor: pointer;
      font: inherit;
      text-align: start;
      transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
    }

    .time-option:hover {
      border-color: var(--cm-primary);
      background: var(--cm-primary-soft);
      transform: translateY(-1px);
    }

    .time-option.selected {
      border-color: var(--cm-primary);
      background: var(--cm-primary-soft);
      box-shadow: inset 0 0 0 1px var(--cm-primary);
    }

    .time-icon {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .time-icon mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }

    .time-icon--unlimited {
      background: var(--cm-success-soft);
      color: var(--cm-success);
    }

    .time-icon--bullet {
      background: var(--cm-danger-soft);
      color: var(--cm-danger);
    }

    .time-icon--blitz {
      background: var(--cm-gold-soft);
      color: var(--cm-gold);
    }

    .time-icon--rapid {
      background: var(--cm-primary-soft);
      color: var(--cm-primary-dark);
    }

    .time-copy {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .time-copy strong {
      color: var(--cm-ink);
      font-size: 0.8rem;
      font-weight: 750;
      line-height: 1.2;
    }

    .time-copy small {
      color: var(--cm-muted);
      font-size: 0.65rem;
      line-height: 1.25;
    }

    .time-check {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      color: var(--cm-line-strong);
      font-size: 18px;
    }

    .time-option.selected .time-check {
      color: var(--cm-primary);
    }

    .dialog-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 14px 24px 18px;
      border-top: 1px solid var(--cm-line);
      background: var(--cm-surface);
    }

    .selection-summary {
      display: flex;
      flex: 1 1 auto;
      flex-wrap: wrap;
      gap: 5px;
      min-width: 0;
    }

    .summary-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 8px;
      border: 1px solid var(--cm-line);
      border-radius: 999px;
      background: var(--cm-surface-muted);
      color: var(--cm-muted);
      font-size: 0.66rem;
      font-weight: 650;
      line-height: 1.2;
      white-space: nowrap;
    }

    .summary-chip mat-icon {
      width: 14px;
      height: 14px;
      color: var(--cm-primary-dark);
      font-size: 14px;
    }

    .dialog-action-buttons {
      display: flex;
      flex: 0 0 auto;
      gap: 8px;
      margin-inline-start: auto;
    }

    .dialog-action-buttons button {
      border-radius: 11px;
      font-weight: 750;
    }

    .dialog-action-buttons button[mat-flat-button] {
      min-height: 42px;
      padding-inline: 16px;
    }

    @media (max-width: 700px) {
      .setup-grid {
        grid-template-columns: 1fr;
      }

      .dialog-content {
        max-height: min(68vh, 680px);
      }

      .selection-summary {
        display: none;
      }

      .dialog-actions {
        justify-content: flex-end;
      }

      .dialog-action-buttons {
        width: 100%;
        justify-content: flex-end;
      }
    }

    @media (max-width: 560px) {
      .dialog-heading {
        padding: 20px 18px 16px;
      }

      .dialog-content {
        padding: 18px 18px 6px !important;
      }

      .dialog-actions {
        padding: 12px 18px 16px;
      }

      .section-hint {
        display: none;
      }

      .color-grid {
        gap: 6px;
      }

      .color-option {
        min-height: 96px;
        padding: 9px;
      }

      .color-copy small {
        display: none;
      }
    }

    @media (max-width: 440px) {
      .time-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PlayVsBotDialogComponent implements OnInit {
  readonly language = inject(LanguageService);

  color: ColorOption = 'white';
  skillLevel = 5;
  timeControl = 'unlimited';

  get colorOptions() {
    return [
      { value: 'white' as const, label: this.language.t('dialog.white'), description: this.language.t('dialog.whiteDesc') },
      { value: 'black' as const, label: this.language.t('dialog.black'), description: this.language.t('dialog.blackDesc') },
      { value: 'random' as const, label: this.language.t('dialog.random'), description: this.language.t('dialog.randomDesc') }
    ];
  }

  get strengthPresets() {
    return [
      { label: this.language.t('dialog.band.beginner'), value: 1 },
      { label: this.language.t('dialog.band.casual'), value: 5 },
      { label: this.language.t('dialog.band.club'), value: 10 },
      { label: this.language.t('dialog.band.advanced'), value: 15 },
      { label: this.language.t('dialog.band.master'), value: 20 }
    ];
  }

  get timeOptions(): TimeOption[] {
    return [
      {
        value: 'unlimited',
        label: this.language.t('dialog.unlimited'),
        description: this.language.t('dialog.noClock'),
        icon: 'all_inclusive',
        tone: 'unlimited'
      },
      {
        value: '1+0',
        label: '1 + 0',
        description: this.language.t('dialog.bullet'),
        icon: 'flash_on',
        tone: 'bullet'
      },
      {
        value: '3+0',
        label: '3 + 0',
        description: this.language.t('dialog.blitz'),
        icon: 'bolt',
        tone: 'blitz'
      },
      {
        value: '5+0',
        label: '5 + 0',
        description: this.language.t('dialog.blitz'),
        icon: 'bolt',
        tone: 'blitz'
      },
      {
        value: '10+0',
        label: '10 + 0',
        description: this.language.t('dialog.rapid'),
        icon: 'speed',
        tone: 'rapid'
      },
      {
        value: '15+10',
        label: '15 + 10',
        description: this.language.t('dialog.rapid'),
        icon: 'speed',
        tone: 'rapid'
      }
    ];
  }

  get selectedTimeOption(): TimeOption {
    return this.timeOptions.find((option) => option.value === this.timeControl) ?? this.timeOptions[0];
  }

  get selectedColorLabel(): string {
    return this.colorOptions.find((option) => option.value === this.color)?.label ?? this.language.t('dialog.white');
  }

  constructor(
    public dialogRef: MatDialogRef<PlayVsBotDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BotDialogData
  ) {}

  ngOnInit(): void {
    if (this.data?.color) {
      this.color = this.data.color;
    }
  }

  selectColor(color: ColorOption): void {
    this.color = color;
  }

  setSkill(level: number): void {
    this.skillLevel = level;
  }

  getSkillLabel(level: number): string {
    let band: 'dialog.band.beginner' | 'dialog.band.casual' | 'dialog.band.club' | 'dialog.band.advanced' | 'dialog.band.master' = 'dialog.band.master';
    if (level <= 2) band = 'dialog.band.beginner';
    else if (level <= 5) band = 'dialog.band.casual';
    else if (level <= 10) band = 'dialog.band.club';
    else if (level <= 15) band = 'dialog.band.advanced';

    return `${this.language.t(band)} · ${this.language.t('dialog.level', { level })}`;
  }

  getBotElo(): number {
    return 1320 + this.skillLevel * 60;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onPlay(): void {
    let finalColor = this.color;
    if (finalColor === 'random') {
      finalColor = Math.random() < 0.5 ? 'white' : 'black';
    }

    const result: BotDialogResult = {
      color: finalColor as 'white' | 'black',
      skillLevel: this.skillLevel,
      timeControl: this.timeControl
    };

    this.dialogRef.close(result);
  }
}
