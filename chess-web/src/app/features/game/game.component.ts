import { Component, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Chessboard, COLOR, INPUT_EVENT_TYPE } from 'cm-chessboard';
import { Chess } from 'chess.js';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="cm-page game-page">
      <header class="cm-page-header">
        <div class="cm-page-heading">
          <span class="cm-eyebrow"><mat-icon>grid_on</mat-icon> {{ language.t('local.eyebrow') }}</span>
          <h1 class="cm-page-title">{{ language.t('local.title') }}</h1>
          <p class="cm-page-subtitle">
            {{ language.t('local.subtitle') }}
          </p>
        </div>
        <div class="cm-page-actions">
          <a mat-stroked-button routerLink="/play">
            <mat-icon>arrow_back</mat-icon>
            {{ language.t('common.playHub') }}
          </a>
        </div>
      </header>

      <div class="game-layout">
        <section class="board-panel" [attr.aria-label]="language.t('local.boardAria')">
          <div class="player-bar" [class.active-turn]="isTopTurn()">
            <div class="player-identity">
              <span class="player-avatar" [class.black-avatar]="topPlayerLabel === 'Black'">
                <mat-icon>person</mat-icon>
              </span>
              <span class="player-copy">
                <strong>{{ playerLabel(topPlayerLabel) }}</strong>
                <small>{{ language.t('common.localPlayer') }}</small>
              </span>
            </div>
            <span class="turn-pill" [class.visible]="isTopTurn()">
              <span class="turn-dot"></span>
              {{ language.t('local.toMove') }}
            </span>
          </div>

          <div class="board-stage">
            <div #boardElement class="board-container"></div>
          </div>

          <div class="player-bar" [class.active-turn]="isBottomTurn()">
            <div class="player-identity">
              <span class="player-avatar" [class.black-avatar]="bottomPlayerLabel === 'Black'">
                <mat-icon>person</mat-icon>
              </span>
              <span class="player-copy">
                <strong>{{ playerLabel(bottomPlayerLabel) }}</strong>
                <small>{{ language.t('common.localPlayer') }}</small>
              </span>
            </div>
            <span class="turn-pill" [class.visible]="isBottomTurn()">
              <span class="turn-dot"></span>
              {{ language.t('local.toMove') }}
            </span>
          </div>

          <div class="board-controls">
            <span class="turn-summary">
              <span class="turn-summary-dot"></span>
              {{ language.t('local.turnToMove', { color: playerLabel(chess.turn() === 'w' ? 'White' : 'Black') }) }}
            </span>
            <div class="control-actions">
              <button mat-stroked-button type="button" (click)="flipBoard()">
                <mat-icon>flip_camera_android</mat-icon>
                {{ language.t('local.flip') }}
              </button>
              <button mat-stroked-button type="button" (click)="resetGame()">
                <mat-icon>refresh</mat-icon>
                {{ language.t('local.reset') }}
              </button>
            </div>
          </div>
        </section>

        <aside class="game-sidebar">
          <section class="cm-panel side-panel">
            <div class="side-panel-heading">
              <div>
                <span class="side-eyebrow">{{ language.t('local.position') }}</span>
                <h2>{{ language.t('local.details') }}</h2>
              </div>
              <span class="cm-tag" [class.cm-tag--blue]="chess.turn() === 'w'">
                {{ playerLabel(chess.turn() === 'w' ? 'White' : 'Black') }}
              </span>
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">{{ language.t('local.sideToMove') }}</span>
                <strong>{{ playerLabel(chess.turn() === 'w' ? 'White' : 'Black') }}</strong>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ language.t('local.board') }}</span>
                <strong>{{ orientation === colorWhite ? language.t('local.whiteView') : language.t('local.blackView') }}</strong>
              </div>
            </div>

            <div class="fen-block">
              <span class="detail-label">{{ language.t('local.currentFen') }}</span>
              <code>{{ currentFen || language.t('local.startingPosition') }}</code>
            </div>
          </section>

          <div class="cm-note">
            <mat-icon>info</mat-icon>
            <span>{{ language.t('local.note') }}</span>
          </div>

          <a mat-flat-button color="primary" routerLink="/play" class="engine-link">
            <mat-icon>smart_toy</mat-icon>
            {{ language.t('local.playStockfish') }}
          </a>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .game-page {
      max-width: 1180px;
    }

    .game-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(270px, 330px);
      gap: 24px;
      align-items: start;
    }

    .board-panel {
      padding: 16px;
      border: 1px solid #dbe3ee;
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
      box-shadow: var(--cm-shadow);
    }

    .player-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 56px;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 14px;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    .player-bar.active-turn {
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    .player-identity {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .player-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 11px;
      background: linear-gradient(135deg, #f8fafc, #e2e8f0);
      color: #475569;
      box-shadow: inset 0 0 0 1px rgba(203, 213, 225, 0.9);
    }

    .player-avatar.black-avatar {
      background: linear-gradient(135deg, #334155, #0f172a);
      color: #e2e8f0;
      box-shadow: none;
    }

    .player-avatar mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }

    .player-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .player-copy strong {
      color: var(--cm-ink);
      font-size: 0.84rem;
      font-weight: 700;
    }

    .player-copy small {
      color: var(--cm-muted-light);
      font-size: 0.66rem;
    }

    .turn-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 9px;
      border-radius: 999px;
      background: #ecfdf5;
      color: #047857;
      font-size: 0.68rem;
      font-weight: 700;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .turn-pill.visible {
      opacity: 1;
    }

    .turn-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.13);
    }

    .board-stage {
      width: 100%;
      max-width: 720px;
      margin: 8px auto;
      overflow: hidden;
      border-radius: 12px;
      background: #243528;
    }

    .board-container {
      width: 100%;
      aspect-ratio: 1;
    }

    .board-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 10px 2px;
      flex-wrap: wrap;
    }

    .turn-summary {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--cm-muted);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .turn-summary-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--cm-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .control-actions {
      display: flex;
      gap: 6px;
    }

    .control-actions button {
      min-height: 36px;
      border-radius: 9px;
      font-size: 0.75rem;
    }

    .game-sidebar {
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: sticky;
      top: 20px;
    }

    .side-panel {
      padding: 20px;
    }

    .side-panel-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    .side-eyebrow {
      color: var(--cm-muted-light);
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .side-panel h2 {
      margin: 3px 0 0;
      color: var(--cm-ink);
      font-size: 1.02rem;
      font-weight: 750;
      letter-spacing: -0.025em;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-bottom: 14px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 11px;
      border: 1px solid #eef2f7;
      border-radius: 10px;
      background: #f8fafc;
    }

    .detail-label {
      color: var(--cm-muted-light);
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .detail-item strong {
      color: var(--cm-ink-soft);
      font-size: 0.78rem;
    }

    .fen-block {
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 11px;
      background: #fbfdff;
    }

    .fen-block code {
      display: block;
      max-height: 90px;
      margin-top: 6px;
      overflow: auto;
      color: #475569;
      font-family: 'Roboto Mono', monospace;
      font-size: 0.66rem;
      line-height: 1.5;
      word-break: break-all;
    }

    .engine-link {
      width: 100%;
      min-height: 42px;
      border-radius: 11px;
    }

    @media (max-width: 960px) {
      .game-layout {
        grid-template-columns: 1fr;
      }

      .game-sidebar {
        position: static;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr);
      }

      .engine-link {
        align-self: start;
      }
    }

    @media (max-width: 720px) {
      .game-sidebar {
        grid-template-columns: 1fr;
      }

      .board-panel {
        padding: 10px;
        border-radius: 18px;
      }

      .player-bar {
        min-height: 48px;
      }

      .player-copy small {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .board-controls {
        align-items: stretch;
        flex-direction: column;
      }

      .control-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .control-actions button {
        width: 100%;
      }
    }
  `]
})
export class GameComponent implements AfterViewInit {
  @ViewChild('boardElement', { static: true }) boardElement!: ElementRef;

  readonly language = inject(LanguageService);
  readonly colorWhite = COLOR.white;

  board!: Chessboard;
  chess = new Chess();
  currentFen = this.chess.fen();
  orientation: string = COLOR.white;

  playerLabel(color: 'White' | 'Black'): string {
    return this.language.t(color === 'White' ? 'common.white' : 'common.black');
  }

  get topPlayerLabel(): 'White' | 'Black' {
    return this.orientation === COLOR.white ? 'Black' : 'White';
  }

  get bottomPlayerLabel(): 'White' | 'Black' {
    return this.orientation === COLOR.white ? 'White' : 'Black';
  }

  ngAfterViewInit(): void {
    this.chess.reset();
    this.currentFen = this.chess.fen();

    this.board = new Chessboard(this.boardElement.nativeElement, {
      position: this.chess.fen(),
      orientation: this.orientation,
      assetsUrl: './assets/cm-chessboard/',
      style: {
        pieces: { file: 'pieces/staunty.svg' },
        board: { style: 'green' }
      },
      responsive: true
    });

    this.board.enableMoveInput((event) => {
      if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        return true;
      }
      if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        const move = this.chess.move({
          from: event.squareFrom,
          to: event.squareTo,
          promotion: 'q'
        });
        if (move) {
          this.chess.undo();
          return true;
        }
        return false;
      }
      if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
        const move = this.chess.move({
          from: event.squareFrom,
          to: event.squareTo,
          promotion: 'q'
        });
        if (move) {
          this.board.setPosition(this.chess.fen());
          this.currentFen = this.chess.fen();
        }
      }
      return true;
    });
  }

  isTopTurn(): boolean {
    return this.chess.turn() === (this.topPlayerLabel === 'White' ? 'w' : 'b');
  }

  isBottomTurn(): boolean {
    return this.chess.turn() === (this.bottomPlayerLabel === 'White' ? 'w' : 'b');
  }

  resetGame(): void {
    this.chess.reset();
    this.board.setPosition(this.chess.fen());
    this.currentFen = this.chess.fen();
  }

  flipBoard(): void {
    this.orientation = this.orientation === COLOR.white ? COLOR.black : COLOR.white;
    this.board.setOrientation(this.orientation);
  }
}
