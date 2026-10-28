import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';

import { Chessboard, COLOR, INPUT_EVENT_TYPE, BORDER_TYPE } from 'cm-chessboard';
import { Markers, MARKER_TYPE } from 'cm-chessboard/src/extensions/markers/Markers.js';
import { Arrows, ARROW_TYPE } from 'cm-chessboard/src/extensions/arrows/Arrows.js';
import { PromotionDialog, PROMOTION_DIALOG_RESULT_TYPE } from 'cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js';
import { Chess, Square } from 'chess.js';

import { StockfishEngineService } from '../../core/services/stockfish-engine.service';
import { LanguageService } from '../../core/i18n/language.service';
import { PlayVsBotDialogComponent, BotDialogResult } from '../play/play-vs-bot-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Subscription } from 'rxjs';

export interface MoveRecord {
  number: number;
  white: string;
  black?: string;
  whiteFen?: string;
  blackFen?: string;
}

@Component({
  selector: 'app-game-vs-bot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatChipsModule
  ],
  template: `
    <div class="game-vs-bot-container" [class.kids-mode]="kidsMode">
      <!-- Top Action / Header Bar -->
      <div class="header-banner">
        <div class="header-left">
          <button mat-icon-button (click)="goBack()" [matTooltip]="language.t('bot.tooltip.back')">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-meta">
            <h1>{{ kidsMode ? language.t('bot.kidsMode') : language.t('bot.challenge') }}</h1>
            <div class="sub-meta">
              <span class="difficulty-pill" *ngIf="!kidsMode">
                <mat-icon class="tiny-icon">bolt</mat-icon>
                {{ getDifficultyLabel(skillLevel) }} (~{{ getBotElo() }} Elo)
              </span>
              <span class="difficulty-pill fun-pill" *ngIf="kidsMode">
                <mat-icon class="tiny-icon">mood</mat-icon>
                {{ language.t('bot.funPractice') }}
              </span>
              <span class="dot-separator">•</span>
              <span class="color-pill" [class.white-pill]="playerColor === 'white'" [class.black-pill]="playerColor === 'black'">
                {{ language.t('bot.playingAs', { color: playerColor === 'white' ? language.t('bot.white') : language.t('bot.black') }) }}
              </span>
              <span class="dot-separator">•</span>
              <span class="engine-state-badge" [class.thinking]="engineStatus === 'thinking'" role="status" aria-live="polite">
                <span class="status-indicator-dot"></span>
                {{ engineStatus === 'thinking' ? language.t('bot.thinking') : language.t('bot.ready') }}
              </span>
              <span class="dot-separator">•</span>
              <span class="game-type-badge">
                <mat-icon class="tiny-icon">{{ gameTypeIcon }}</mat-icon>
                {{ timeControl === 'unlimited' ? language.t('bot.type.unlimited') : timeControl + ' ' + gameTypeLabel }}
              </span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <button mat-stroked-button *ngIf="!kidsMode" (click)="openDifficultyDialog()">
            <mat-icon>tune</mat-icon> {{ language.t('bot.changeStrength') }}
          </button>
          <button mat-flat-button color="primary" (click)="newGame()">
            <mat-icon>refresh</mat-icon> {{ language.t('bot.newGame') }}
          </button>
        </div>
      </div>

      <!-- Kids Mode Welcome Banner -->
      <div class="kids-banner" *ngIf="kidsMode">
        <span class="kids-banner-emoji">🧒</span>
        <div>
          <strong>{{ language.t('bot.welcomeTitle') }}</strong>
          <p>{{ language.t('bot.welcomeText') }}</p>
        </div>
      </div>

      <!-- Main Game Arena -->
      <div class="game-arena">
        <!-- Chess Arena Left: Board & Players -->
        <div class="board-column">
          <!-- Top Player Bar (Bot) -->
          <div class="player-bar bot-bar" [class.active-turn]="isBotTurn()">
            <div class="player-info">
              <div class="avatar-box bot-avatar">
                <mat-icon>{{ kidsMode ? 'emoji_emotions' : 'smart_toy' }}</mat-icon>
              </div>
              <div class="player-details">
                <div class="player-name-row">
                  <span class="player-name">{{ kidsMode ? 'Chess Buddy' : 'Stockfish 19' }}</span>
                  <span class="player-badge" *ngIf="!kidsMode">{{ language.t('bot.botLevel', { level: skillLevel }) }}</span>
                  <span class="elo-badge" *ngIf="!kidsMode">~{{ getBotElo() }}</span>
                </div>
                <!-- Captured Pieces & Material -->
                <div class="captured-row">
                  <div class="captured-pieces">
                    <img *ngFor="let piece of botCapturedPieces"
                         [src]="'assets/chess-pieces/' + piece + '.svg'"
                         class="captured-piece-img"
                         [alt]="language.t('bot.capturedPiece')" />
                  </div>
                  <span *ngIf="botMaterialAdvantage > 0" class="material-lead">+{{ botMaterialAdvantage }}</span>
                </div>
              </div>
            </div>

            <div class="turn-status-container">
              <span *ngIf="isBotTurn() && !isGameOver" class="thinking-pill" role="status">
                <span class="pulse-dot"></span>
                {{ language.t('bot.thinkingLabel') }}
              </span>
              <!-- Bot Clock -->
              <div *ngIf="isTimedGame"
                   class="clock-chip"
                   [class.clock-active]="isBotTimerActive()"
                   [class.clock-low]="isBotTimeLow">
                <mat-icon class="clock-icon">timer</mat-icon>
                <span class="clock-time">{{ botDisplayTime }}</span>
              </div>
            </div>
          </div>

          <!-- Board Center Stage with Evaluation Bar & Coordinate Indexer Frame -->
          <div class="board-eval-row">
            <!-- Vertical Evaluation Bar -->
            <div class="eval-bar-wrapper" *ngIf="showEvalBar && !kidsMode" [matTooltip]="language.t('bot.tooltip.evalBar')">
              <div class="eval-bar">
                <div class="eval-black-bar" [style.height.%]="100 - whiteAdvantagePercent">
                  <span class="eval-text top" *ngIf="whiteAdvantagePercent < 48">
                    {{ evaluationDisplay }}
                  </span>
                </div>
                <div class="eval-white-bar" [style.height.%]="whiteAdvantagePercent">
                  <span class="eval-text bottom" *ngIf="whiteAdvantagePercent >= 48">
                    {{ evaluationDisplay }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Themed Coordinate Indexer Frame (Responsive & Reversible) -->
            <div class="chess-frame-wrapper" [ngClass]="selectedTheme">
              <!-- Top File Indexer Row (a-h or h-a) -->
              <div class="indexer-row file-row top">
                <div class="indexer-corner"></div>
                <div class="indexer-files">
                  <div *ngFor="let file of files" class="indexer-label">{{ file }}</div>
                </div>
                <div class="indexer-corner"></div>
              </div>

              <!-- Middle Section: Left Rank Indexer + Board + Right Rank Indexer -->
              <div class="indexer-middle">
                <!-- Left Rank Indexer (8-1 or 1-8) -->
                <div class="indexer-ranks left">
                  <div *ngFor="let rank of ranks" class="indexer-label">{{ rank }}</div>
                </div>

                <!-- Chessboard Container Card -->
                <div class="chessboard-card">
                  <div #boardElement class="board-element"></div>

                  <!-- High-Precision Responsive Board Highlights & Possible Moves Overlay -->
                  <div class="board-interactive-overlay">
                    <!-- Last Move Highlight (From & To) -->
                    <div *ngIf="lastMove"
                         class="highlight-square last-move-square"
                         [ngStyle]="getSquareStyle(lastMove.from)"></div>
                    <div *ngIf="lastMove"
                         class="highlight-square last-move-square"
                         [ngStyle]="getSquareStyle(lastMove.to)"></div>

                    <!-- Selected Piece Square Highlight -->
                    <div *ngIf="selectedSquare"
                         class="highlight-square selected-square"
                         [ngStyle]="getSquareStyle(selectedSquare)"></div>

                    <!-- King in Check Highlight -->
                    <div *ngIf="kingInCheckSquare"
                         class="highlight-square check-square"
                         [ngStyle]="getSquareStyle(kingInCheckSquare)"></div>

                    <!-- Legal Possible Moves Indicators (Dots on empty squares, Rings on captures) -->
                    <ng-container *ngFor="let m of legalMovesList">
                      <div class="legal-move-marker"
                           [ngClass]="m.captured ? 'capture-target' : 'move-target'"
                           [ngStyle]="getSquareStyle(m.to)">
                        <span *ngIf="!m.captured" class="move-dot"></span>
                        <span *ngIf="m.captured" class="capture-ring"></span>
                      </div>
                    </ng-container>
                  </div>

                  <!-- Pawn Promotion Chooser Overlay -->
                  <div class="promotion-overlay" *ngIf="showPromotionPicker" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
                    <div class="promotion-dialog-box">
                      <div class="promo-header" id="promotion-title">{{ language.t('bot.promotePawn') }}</div>
                      <div class="promo-choices">
                        <button class="promo-btn" type="button" (click)="choosePromotion('q')" [matTooltip]="language.t('bot.queen')" [attr.aria-label]="language.t('bot.queen')">
                          <img [src]="'assets/chess-pieces/' + (playerColor === 'white' ? 'wQ' : 'bQ') + '.svg'" [alt]="language.t('bot.queen')" />
                        </button>
                        <button class="promo-btn" type="button" (click)="choosePromotion('r')" [matTooltip]="language.t('bot.rook')" [attr.aria-label]="language.t('bot.rook')">
                          <img [src]="'assets/chess-pieces/' + (playerColor === 'white' ? 'wR' : 'bR') + '.svg'" [alt]="language.t('bot.rook')" />
                        </button>
                        <button class="promo-btn" type="button" (click)="choosePromotion('b')" [matTooltip]="language.t('bot.bishop')" [attr.aria-label]="language.t('bot.bishop')">
                          <img [src]="'assets/chess-pieces/' + (playerColor === 'white' ? 'wB' : 'bB') + '.svg'" [alt]="language.t('bot.bishop')" />
                        </button>
                        <button class="promo-btn" type="button" (click)="choosePromotion('n')" [matTooltip]="language.t('bot.knight')" [attr.aria-label]="language.t('bot.knight')">
                          <img [src]="'assets/chess-pieces/' + (playerColor === 'white' ? 'wN' : 'bN') + '.svg'" [alt]="language.t('bot.knight')" />
                        </button>
                      </div>
                      <button mat-button class="promo-cancel" type="button" (click)="cancelPromotion()">{{ language.t('common.cancel') }}</button>
                    </div>
                  </div>

                  <!-- Game Over Modal Overlay -->
                  <div class="game-over-overlay" *ngIf="isGameOver" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
                    <div class="game-over-dialog">
                      <div class="game-over-icon" [ngClass]="gameOverResult">
                        <mat-icon>{{ gameOverResult === 'win' ? 'emoji_events' : gameOverResult === 'loss' ? 'sentiment_dissatisfied' : 'handshake' }}</mat-icon>
                      </div>
                      <h2 class="game-over-title" id="game-over-title">
                        {{ gameOverResult === 'win' ? language.t('bot.victory') : gameOverResult === 'loss' ? language.t('bot.gameOver') : language.t('bot.drawGame') }}
                      </h2>
                      <p class="game-over-reason">{{ gameOverReason }}</p>
                      <div class="game-over-actions">
                        <button mat-flat-button color="primary" (click)="newGame()">
                          <mat-icon>refresh</mat-icon> {{ language.t('bot.playAgain') }}
                        </button>
                        <button mat-stroked-button *ngIf="!kidsMode" (click)="openDifficultyDialog()">
                          <mat-icon>tune</mat-icon> {{ language.t('bot.changeStrength') }}
                        </button>
                        <button mat-button (click)="isGameOver = false" [matTooltip]="language.t('bot.tooltip.inspect')">
                          <mat-icon>visibility</mat-icon> {{ language.t('bot.reviewBoard') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right Rank Indexer (8-1 or 1-8) -->
                <div class="indexer-ranks right">
                  <div *ngFor="let rank of ranks" class="indexer-label">{{ rank }}</div>
                </div>
              </div>

              <!-- Bottom File Indexer Row (a-h or h-a) -->
              <div class="indexer-row file-row bottom">
                <div class="indexer-corner"></div>
                <div class="indexer-files">
                  <div *ngFor="let file of files" class="indexer-label">{{ file }}</div>
                </div>
                <div class="indexer-corner"></div>
              </div>
            </div>
          </div>

          <!-- Bottom Player Bar (User) -->
          <div class="player-bar user-bar" [class.active-turn]="isUserTurn()">
            <div class="player-info">
              <div class="avatar-box user-avatar">
                <mat-icon>person</mat-icon>
              </div>
              <div class="player-details">
                <div class="player-name-row">
                  <span class="player-name">{{ language.t('bot.you') }}</span>
                  <span class="player-badge">{{ language.t('bot.human') }}</span>
                  <span class="player-color-tag">{{ playerColor === 'white' ? language.t('bot.white') : language.t('bot.black') }}</span>
                </div>
                <!-- Captured Pieces & Material -->
                <div class="captured-row">
                  <div class="captured-pieces">
                    <img *ngFor="let piece of userCapturedPieces"
                         [src]="'assets/chess-pieces/' + piece + '.svg'"
                         class="captured-piece-img"
                         [alt]="language.t('bot.capturedPiece')" />
                  </div>
                  <span *ngIf="userMaterialAdvantage > 0" class="material-lead">+{{ userMaterialAdvantage }}</span>
                </div>
              </div>
            </div>

            <div class="turn-status-container">
              <span *ngIf="isUserTurn() && !isGameOver" class="your-turn-pill" role="status">
                <span class="pulse-dot green"></span>
                {{ language.t('bot.yourTurn') }}
              </span>
              <span *ngIf="chess.inCheck() && !isGameOver" class="check-pill" role="status">
                <mat-icon class="tiny-icon">warning</mat-icon>
                {{ language.t('bot.check') }}
              </span>
              <!-- User Clock -->
              <div *ngIf="isTimedGame"
                   class="clock-chip"
                   [class.clock-active]="isUserTimerActive()"
                   [class.clock-low]="isUserTimeLow">
                <mat-icon class="clock-icon">timer</mat-icon>
                <span class="clock-time">{{ userDisplayTime }}</span>
              </div>
            </div>
          </div>

          <!-- Board Interaction & Quick Controls Toolbar -->
          <div class="board-toolbar">
            <div class="toolbar-left">
              <button mat-stroked-button (click)="undoMove()" [disabled]="moveHistory.length === 0 || botMoveInProgress" [matTooltip]="language.t('bot.tooltip.takeback')">
                <mat-icon>undo</mat-icon> {{ language.t('bot.takeback') }}
              </button>
              <button mat-stroked-button (click)="toggleHint()" [disabled]="isGameOver || botMoveInProgress" [color]="hintActive ? 'accent' : ''" [matTooltip]="language.t('bot.tooltip.hint')">
                <mat-icon>lightbulb</mat-icon> {{ hintActive ? language.t('bot.hideHint') : language.t('bot.hint') }}
              </button>
              <button mat-stroked-button (click)="flipBoard()" [matTooltip]="language.t('bot.tooltip.flip')">
                <mat-icon>flip_camera_android</mat-icon> {{ language.t('bot.flipBoard') }}
              </button>
              <button mat-icon-button (click)="toggleSound()" [matTooltip]="isMuted ? language.t('bot.tooltip.unmute') : language.t('bot.tooltip.mute')">
                <mat-icon>{{ isMuted ? 'volume_off' : 'volume_up' }}</mat-icon>
              </button>
            </div>

            <div class="toolbar-right">
              <!-- Board Theme Selector -->
              <button mat-button [matMenuTriggerFor]="themeMenu" class="theme-btn" [matTooltip]="language.t('bot.tooltip.appearance')">
                <mat-icon>palette</mat-icon>
                <span>{{ currentThemeLabel }}</span>
                <mat-icon class="dropdown-arrow">arrow_drop_down</mat-icon>
              </button>
              <mat-menu #themeMenu="matMenu">
                <button mat-menu-item *ngFor="let t of themes" (click)="setTheme(t.id)">
                  <span class="theme-menu-item">
                    <span class="theme-preview-swatch" [ngClass]="t.id"></span>
                    <span>{{ t.label }}</span>
                  </span>
                </button>
              </mat-menu>

              <button mat-button color="warn" (click)="resign()" [disabled]="isGameOver" [matTooltip]="language.t('bot.tooltip.resign')">
                <mat-icon>flag</mat-icon> {{ language.t('bot.resign') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right Side Panel: Engine Telemetry & Move History -->
        <div class="sidebar-column">
          <!-- Engine Analysis Card -->
          <mat-card class="telemetry-card" *ngIf="!kidsMode">
            <mat-card-header>
              <mat-card-title>
                <div class="card-title-row">
                  <div class="title-with-icon">
                    <mat-icon class="card-icon">analytics</mat-icon>
                    <span>{{ language.t('bot.engineEvaluation') }}</span>
                  </div>
                  <span class="eval-numeric-badge" [class.white-leading]="whiteAdvantagePercent >= 50" [class.black-leading]="whiteAdvantagePercent < 50">
                    {{ evaluationDisplay }}
                  </span>
                </div>
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="engine-metrics-grid">
                <div class="metric-item">
                  <span class="metric-label">{{ language.t('bot.depth') }}</span>
                  <span class="metric-val">{{ currentDepth > 0 ? currentDepth : '—' }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">{{ language.t('bot.nodes') }}</span>
                  <span class="metric-val">{{ nps > 0 ? formatNps(nps) : '—' }}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">{{ language.t('bot.winChance') }}</span>
                  <span class="metric-val">{{ whiteAdvantagePercent.toFixed(0) }}% W</span>
                </div>
              </div>

              <!-- Engine Best Continuation Line -->
              <div class="pv-section" *ngIf="bestLineSan.length > 0">
                <div class="pv-header">
                  <mat-icon class="tiny-icon">auto_awesome</mat-icon>
                  <span>{{ language.t('bot.bestLine') }}</span>
                </div>
                <div class="pv-moves">
                  <span *ngFor="let move of bestLineSan; let idx = index" class="pv-move-token">
                    {{ move }}
                  </span>
                </div>
              </div>

              <!-- Thinking Bar -->
              <mat-progress-bar *ngIf="engineStatus === 'thinking'" mode="indeterminate" class="engine-progress"></mat-progress-bar>

              <!-- View Toggles -->
              <div class="feature-toggles">
                <mat-slide-toggle [(ngModel)]="showEvalBar" color="primary">
                  {{ language.t('bot.evalBar') }}
                </mat-slide-toggle>
                <mat-slide-toggle [(ngModel)]="autoShowArrows" (change)="onAutoArrowToggle()" color="primary">
                  {{ language.t('bot.autoArrow') }}
                </mat-slide-toggle>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Notation & Move History Card -->
          <mat-card class="moves-card">
            <mat-card-header>
              <mat-card-title>
                <div class="card-title-row">
                  <div class="title-with-icon">
                    <mat-icon class="card-icon">receipt_long</mat-icon>
                    <span>{{ language.t('bot.moveHistory') }}</span>
                  </div>
                  <span class="ply-count-badge">{{ language.t('bot.movesCount', { count: moveHistory.length }) }}</span>
                </div>
              </mat-card-title>
            </mat-card-header>

            <mat-card-content class="moves-table-container" #movesContainer>
              <div *ngIf="moveHistory.length === 0" class="empty-moves-state">
                <mat-icon class="empty-icon">sports_esports</mat-icon>
                <p>{{ language.t('bot.emptyMoves') }}</p>
              </div>

              <table *ngIf="moveHistory.length > 0" class="moves-table">
                <thead>
                  <tr>
                    <th class="th-num">#</th>
                    <th>{{ language.t('bot.white') }}</th>
                    <th>{{ language.t('bot.black') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let record of pairedMoves; let i = index" [class.latest-row]="i === pairedMoves.length - 1">
                    <td class="td-num">{{ record.number }}.</td>
                    <td class="td-move" [class.highlight-move]="isLatestMove(record.number, 'w')">
                      {{ record.white }}
                    </td>
                    <td class="td-move" [class.highlight-move]="isLatestMove(record.number, 'b')">
                      {{ record.black || '' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </mat-card-content>

            <mat-card-actions class="card-footer-actions">
              <button mat-button (click)="copyFen()" [matTooltip]="language.t('bot.tooltip.copyFen')">
                <mat-icon>content_copy</mat-icon> {{ language.t('bot.copyFen') }}
              </button>
              <button mat-button (click)="copyPgn()" [matTooltip]="language.t('bot.tooltip.copyPgn')">
                <mat-icon>file_download</mat-icon> {{ language.t('bot.copyPgn') }}
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .game-vs-bot-container {
      max-width: 1380px;
      margin: 0 auto;
      padding: 16px 20px 40px;
    }

    /* Header Banner */
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .title-meta h1 {
      margin: 0 0 6px;
      font-size: 1.6rem;
      font-weight: 700;
      color: #1a202c;
      letter-spacing: -0.02em;
    }

    .sub-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
      color: #64748b;
      flex-wrap: wrap;
    }

    .difficulty-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }

    .fun-pill {
      background: #fef3c7;
      color: #b45309;
    }

    /* Kids Mode Banner */
    .kids-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 20px;
      padding: 14px 18px;
      border-radius: 14px;
      background: linear-gradient(120deg, #fef3c7, #fce7f3 55%, #dbeafe);
      border: 1px solid #fbcfe8;
      color: #7c2d12;
    }

    .kids-banner-emoji {
      font-size: 32px;
      line-height: 1;
    }

    .kids-banner strong {
      display: block;
      font-size: 1rem;
      color: #9d174d;
      margin-bottom: 2px;
    }

    .kids-banner p {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    /* Kids Mode: bigger, friendlier status pills */
    .kids-mode .player-name {
      font-size: 1.05rem;
    }

    .kids-mode .thinking-pill,
    .kids-mode .your-turn-pill {
      font-size: 0.85rem;
      padding: 5px 14px;
    }

    .color-pill {
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
      background: #f1f5f9;
      color: #334155;
    }

    .engine-state-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
      background: #f1f5f9;
      color: #475569;
    }

    .engine-state-badge.thinking {
      background: #ecfdf5;
      color: #047857;
    }

    .status-indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .engine-state-badge.thinking .status-indicator-dot {
      background: #10b981;
      animation: pulse-dot 1.2s infinite;
    }

    .dot-separator {
      color: #cbd5e1;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    /* Main Arena Layout */
    .game-arena {
      display: grid;
      grid-template-columns: minmax(320px, 660px) minmax(320px, 1fr);
      gap: 28px;
      align-items: start;
    }

    /* Board Column */
    .board-column {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .sidebar-column {
      min-width: 0;
    }

    /* Player Bars */
    .player-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }

    .player-bar.active-turn {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
      background: #f8fafc;
    }

    .player-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar-box {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }

    .bot-avatar {
      background: linear-gradient(135deg, #475569 0%, #1e293b 100%);
    }

    .user-avatar {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    }

    .player-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .player-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .player-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1e293b;
    }

    .player-badge {
      font-size: 0.72rem;
      padding: 1px 6px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 4px;
      font-weight: 600;
    }

    .elo-badge {
      font-size: 0.72rem;
      color: #64748b;
      font-weight: 500;
    }

    .player-color-tag {
      font-size: 0.72rem;
      color: #64748b;
    }

    .captured-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 18px;
    }

    .captured-pieces {
      display: flex;
      align-items: center;
      gap: 1px;
      flex-wrap: wrap;
    }

    .captured-piece-img {
      width: 18px;
      height: 18px;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
    }

    .material-lead {
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
      background: #e2e8f0;
      padding: 0 4px;
      border-radius: 3px;
    }

    .turn-status-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .thinking-pill, .your-turn-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .thinking-pill {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .your-turn-pill {
      background: #ecfdf5;
      color: #047857;
    }

    .check-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #fef2f2;
      color: #b91c1c;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      animation: pulse-danger 1.2s infinite;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #3b82f6;
      animation: pulse-dot 1.2s infinite;
    }

    .pulse-dot.green {
      background: #10b981;
    }

    @keyframes pulse-dot {
      0% { transform: scale(0.9); opacity: 0.6; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.6; }
    }

    @keyframes pulse-danger {
      0% { opacity: 0.7; }
      50% { opacity: 1; transform: scale(1.03); }
      100% { opacity: 0.7; }
    }

    /* ---- Chess Clock Chips ---- */
    .clock-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      background: #f1f5f9;
      color: #334155;
      border: 2px solid #e2e8f0;
      transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      min-width: 90px;
      justify-content: center;
    }

    .clock-chip .clock-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      opacity: 0.6;
    }

    /* Active clock (it's this player's turn) */
    .clock-chip.clock-active {
      background: #ecfdf5;
      color: #065f46;
      border-color: #6ee7b7;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
    }

    .clock-chip.clock-active .clock-icon { opacity: 1; }

    /* Time is running low (< 10% of base or < 30s) */
    .clock-chip.clock-low {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fca5a5;
      animation: pulse-clock-low 0.9s infinite;
    }

    .clock-chip.clock-active.clock-low {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
    }

    @keyframes pulse-clock-low {
      0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      50%  { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.25); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Game type badge in header */
    .game-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    /* Board & Eval Bar Row */
    .board-eval-row {
      display: flex;
      gap: 12px;
      width: 100%;
      align-items: stretch;
    }

    /* Vertical Evaluation Bar */
    .eval-bar-wrapper {
      width: 28px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    .eval-bar {
      width: 100%;
      height: 100%;
      background: #272522;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
      position: relative;
    }

    .eval-black-bar {
      width: 100%;
      background: #272522;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .eval-white-bar {
      width: 100%;
      background: #ffffff;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .eval-text {
      font-size: 10px;
      font-weight: 700;
      padding: 4px 1px;
      font-family: monospace;
      letter-spacing: -0.5px;
    }

    .eval-text.top {
      color: #ffffff;
    }

    .eval-text.bottom {
      color: #272522;
    }

    /* Themed Coordinate Indexer Frame */
    .chess-frame-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      border-radius: 12px;
      overflow: hidden;
      direction: ltr;
      box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.35), 0 8px 16px rgba(0, 0, 0, 0.2);
      border: 3px solid #1e293b;
      background: #1e293b;
      transition: border-color 0.25s ease, background-color 0.25s ease;
    }

    .chess-frame-wrapper.green {
      border-color: #243528;
      background: #243528;
    }

    .chess-frame-wrapper.chess-club {
      border-color: #3e2723;
      background: #3e2723;
    }

    .chess-frame-wrapper.blue {
      border-color: #1e3a5f;
      background: #1e3a5f;
    }

    .chess-frame-wrapper.chessboard-js {
      border-color: #3a271d;
      background: #3a271d;
    }

    .chess-frame-wrapper.default-contrast {
      border-color: #18181b;
      background: #18181b;
    }

    .indexer-row {
      display: flex;
      height: 24px;
      width: 100%;
      align-items: center;
    }

    .indexer-corner {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .indexer-files {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      height: 100%;
    }

    .indexer-middle {
      display: flex;
      width: 100%;
      align-items: stretch;
    }

    .indexer-ranks {
      width: 24px;
      display: grid;
      grid-template-rows: repeat(8, 1fr);
      flex-shrink: 0;
    }

    .indexer-label {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.76rem;
      font-weight: 700;
      color: #e2e8f0;
      user-select: none;
      font-family: inherit;
      letter-spacing: 0.02em;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    }

    .chess-frame-wrapper.chess-club .indexer-label,
    .chess-frame-wrapper.chessboard-js .indexer-label {
      color: #fce7b0;
    }

    /* Chessboard Container Card */
    .chessboard-card {
      position: relative;
      flex: 1;
      width: 100%;
      aspect-ratio: 1;
      overflow: hidden;
      background: #1e293b;
    }

    .board-element {
      width: 100%;
      height: 100%;
      aspect-ratio: 1;
    }

    /* High-Precision Interactive Board Overlay */
    .board-interactive-overlay,
    .board-interactive-overlay * {
      pointer-events: none !important;
    }

    .board-interactive-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
    }

    .highlight-square {
      position: absolute;
      transition: opacity 0.15s ease;
    }

    .highlight-square.last-move-square {
      background: rgba(205, 210, 106, 0.5);
    }

    .highlight-square.selected-square {
      background: rgba(246, 224, 94, 0.62);
      box-shadow: inset 0 0 0 2px rgba(217, 119, 6, 0.65);
    }

    .highlight-square.check-square {
      background: radial-gradient(circle, rgba(239, 68, 68, 0.88) 0%, rgba(220, 38, 38, 0.5) 60%, transparent 100%);
      animation: pulse-check-danger 1.5s infinite;
    }

    .legal-move-marker {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 15;
    }

    .move-dot {
      width: 32%;
      height: 32%;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.32);
      box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
    }

    .capture-ring {
      width: 86%;
      height: 86%;
      border-radius: 50%;
      border: 4px solid rgba(0, 0, 0, 0.36);
      background: rgba(0, 0, 0, 0.04);
    }

    @keyframes pulse-check-danger {
      0% { opacity: 0.65; }
      50% { opacity: 0.95; }
      100% { opacity: 0.65; }
    }

    /* In-App Promotion Overlay */
    .promotion-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      backdrop-filter: blur(2px);
    }

    .promotion-dialog-box {
      background: #ffffff;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      animation: popIn 0.2s ease-out;
    }

    .promo-header {
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
    }

    .promo-choices {
      display: flex;
      gap: 10px;
    }

    .promo-btn {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
      background: #f8fafc;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .promo-btn img {
      width: 44px;
      height: 44px;
    }

    .promo-btn:hover {
      border-color: #3b82f6;
      background: #eff6ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
    }

    .promo-cancel {
      font-size: 0.85rem;
      color: #64748b;
    }

    /* Game Over Overlay */
    .game-over-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.76);
      backdrop-filter: blur(5px);
      animation: fadeIn 0.3s ease;
    }

    .game-over-dialog {
      display: flex;
      width: 100%;
      max-width: 430px;
      max-height: calc(100dvh - 40px);
      flex-direction: column;
      align-items: center;
      gap: 14px;
      overflow-y: auto;
      padding: 28px 32px;
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 20px;
      background: #ffffff;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
      animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .game-over-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .game-over-icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    .game-over-icon.win {
      background: #ecfdf5;
      color: #10b981;
    }

    .game-over-icon.loss {
      background: #fef2f2;
      color: #ef4444;
    }

    .game-over-icon.draw {
      background: #eff6ff;
      color: #3b82f6;
    }

    .game-over-title {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
    }

    .game-over-reason {
      margin: 0;
      font-size: 0.95rem;
      color: #64748b;
      line-height: 1.4;
    }

    .game-over-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin-top: 6px;
    }

    .game-over-actions button {
      width: 100%;
    }

    @keyframes popIn {
      0% { transform: scale(0.85); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    /* Board Toolbar */
    .board-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      background: #ffffff;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 8px;
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .theme-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }

    .dropdown-arrow {
      margin-left: -4px;
    }

    .theme-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .theme-preview-swatch {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 1px solid rgba(0,0,0,0.2);
    }

    .theme-preview-swatch.green { background: #4c946a; }
    .theme-preview-swatch.chess-club { background: #AF6B3F; }
    .theme-preview-swatch.blue { background: #86afcf; }
    .theme-preview-swatch.chessboard-js { background: #b58863; }
    .theme-preview-swatch.default-contrast { background: #333333; }

    /* Right Sidebar Column */
    .sidebar-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .telemetry-card, .moves-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
    }

    .card-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #3b82f6;
    }

    .eval-numeric-badge {
      font-family: monospace;
      font-size: 0.95rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #334155;
    }

    .eval-numeric-badge.white-leading {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .eval-numeric-badge.black-leading {
      background: #f8fafc;
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }

    .ply-count-badge {
      font-size: 0.75rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }

    .engine-metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 12px 0 14px;
      padding: 10px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .metric-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .metric-val {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1e293b;
      margin-top: 2px;
      font-family: monospace;
    }

    .pv-section {
      background: #f8fafc;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
    }

    .pv-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 6px;
    }

    .pv-moves {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pv-move-token {
      font-family: monospace;
      font-size: 0.82rem;
      font-weight: 600;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 1px 6px;
      border-radius: 4px;
      color: #1e293b;
    }

    .engine-progress {
      margin-bottom: 12px;
      border-radius: 2px;
    }

    .feature-toggles {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }

    /* Move History Table */
    .moves-table-container {
      max-height: 280px;
      overflow-y: auto;
      padding: 0 !important;
    }

    .empty-moves-state {
      padding: 32px 16px;
      text-align: center;
      color: #94a3b8;
    }

    .empty-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 4px;
      opacity: 0.6;
    }

    .moves-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    .moves-table th {
      background: #f8fafc;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .th-num {
      width: 48px;
      text-align: center !important;
    }

    .moves-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .td-num {
      color: #94a3b8;
      font-family: monospace;
      text-align: center;
      font-weight: 500;
    }

    .td-move {
      font-family: monospace;
      font-size: 0.92rem;
      font-weight: 500;
      color: #1e293b;
    }

    .td-move.highlight-move {
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      border-radius: 4px;
    }

    .card-footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 8px 16px;
      border-top: 1px solid #f1f5f9;
    }

    .tiny-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    @media (max-width: 1080px) {
      .game-arena {
        grid-template-columns: minmax(0, 1fr);
      }
      .chess-frame-wrapper {
        max-width: 560px;
      }
    }

    @media (max-width: 600px) {
      .game-vs-bot-container {
        padding: 10px 10px 30px;
      }
      .header-banner {
        flex-direction: column;
        align-items: flex-start;
      }
      .header-actions {
        width: 100%;
        justify-content: space-between;
      }
      .board-toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      .toolbar-left {
        display: grid;
        width: 100%;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .toolbar-left .mat-mdc-outlined-button {
        width: 100%;
        min-width: 0;
        padding-inline: 8px;
      }
      .toolbar-left .mat-mdc-icon-button {
        justify-self: start;
      }
      .toolbar-right {
        width: 100%;
        justify-content: space-between;
      }
      .indexer-label {
        font-size: 0.65rem;
      }
      .indexer-row {
        height: 18px;
      }
      .indexer-corner {
        height: 18px;
        width: 14px;
      }
      .indexer-ranks {
        width: 14px;
      }
      .promotion-dialog-box {
        max-width: calc(100% - 20px);
        padding: 14px;
      }
      .promo-choices {
        display: grid;
        grid-template-columns: repeat(2, 60px);
        gap: 8px;
      }
      .game-over-dialog {
        padding: 22px 20px;
      }
    }

    @media (max-width: 480px) {
      .eval-bar-wrapper {
        display: none;
      }
      .board-eval-row {
        gap: 0;
      }
      .game-over-dialog {
        gap: 10px;
        padding: 20px 16px;
      }
      .game-over-icon {
        width: 48px;
        height: 48px;
      }
      .game-over-icon mat-icon {
        width: 30px;
        height: 30px;
        font-size: 30px;
      }
      .game-over-title {
        font-size: 1.35rem;
      }
      .game-over-reason {
        font-size: 0.85rem;
      }
      .game-over-actions {
        margin-top: 2px;
      }
    }
  `]
})
export class GameVsBotComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('boardElement', { static: true }) boardElement!: ElementRef;
  @ViewChild('movesContainer') movesContainer?: ElementRef;

  readonly language = inject(LanguageService);

  board!: Chessboard;
  chess = new Chess();
  playerColor: 'white' | 'black' = 'white';
  boardOrientation: 'w' | 'b' = 'w';
  skillLevel: number = 5;
  timeControl: string = 'unlimited';
  kidsMode: boolean = false;

  files: string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  ranks: string[] = ['8', '7', '6', '5', '4', '3', '2', '1'];

  engineStatus: string = 'initializing';
  evaluationDisplay = '0.00';
  whiteAdvantagePercent = 50;
  currentDepth = 0;
  nps = 0;
  bestLineUci: string[] = [];
  bestLineSan: string[] = [];
  bestMoveStr: string = '';

  moveHistory: string[] = [];
  pairedMoves: MoveRecord[] = [];

  botCapturedPieces: string[] = [];
  userCapturedPieces: string[] = [];
  botMaterialAdvantage: number = 0;
  userMaterialAdvantage: number = 0;

  lastMove: { from: string; to: string } | null = null;
  selectedSquare: string | null = null;
  kingInCheckSquare: string | null = null;
  legalMovesList: any[] = [];
  botMoveInProgress = false;
  private pendingMove: { from: string; to: string } | null = null;

  // ---- Chess Timer ----
  whiteTimeMs: number = 0;
  blackTimeMs: number = 0;
  incrementMs: number = 0;
  timerActive: boolean = false;
  private timerInterval: any = null;
  private lastTickTime: number = 0;

  isGameOver = false;
  gameOverResult: 'win' | 'loss' | 'draw' | '' = '';
  gameOverReason = '';

  showEvalBar = true;
  autoShowArrows = false;
  hintActive = false;
  isMuted = false;

  showPromotionPicker = false;
  pendingPromotion: { from: string; to: string } | null = null;

  selectedTheme = 'green';

  get themes() {
    return [
      { id: 'green', label: this.language.t('bot.theme.green') },
      { id: 'chess-club', label: this.language.t('bot.theme.chessClub') },
      { id: 'blue', label: this.language.t('bot.theme.blue') },
      { id: 'chessboard-js', label: this.language.t('bot.theme.brown') },
      { id: 'default-contrast', label: this.language.t('bot.theme.charcoal') }
    ];
  }

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private engine: StockfishEngineService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  get currentThemeLabel(): string {
    return this.themes.find(t => t.id === this.selectedTheme)?.label || this.language.t('bot.boardTheme');
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.kidsMode = params['kid'] === 'true' || params['mode'] === 'kids';
      this.playerColor = (params['color'] === 'black' ? 'black' : 'white');
      this.boardOrientation = this.playerColor === 'black' ? 'b' : 'w';
      this.updateRanksAndFiles();
      this.skillLevel = this.kidsMode
        ? 0
        : Math.max(0, Math.min(20, parseInt(params['skill'], 10) || 5));
      this.timeControl = this.kidsMode ? 'unlimited' : (params['timeControl'] || params['time'] || 'unlimited');
      this.showEvalBar = !this.kidsMode;
      this.initTimers();
    });
  }

  ngAfterViewInit() {
    this.initBoard();
    this.initEngine();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.stopTimer();
    this.engine.stop();
    if (this.board) {
      try {
        this.board.destroy();
      } catch (e) {}
    }
  }

  updateRanksAndFiles() {
    const isReversed = this.boardOrientation === 'b';
    if (isReversed) {
      this.files = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
      this.ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    } else {
      this.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      this.ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    }
  }

  /* ------------------- Timer Logic ------------------- */
  /** Parse timeControl string like "5+2" → { base: 300000, inc: 2000 } */
  parseTimeControl(tc: string): { baseMs: number; incMs: number } | null {
    if (!tc || tc === 'unlimited') return null;
    const parts = tc.split('+');
    const base = parseInt(parts[0], 10);
    const inc  = parts[1] ? parseInt(parts[1], 10) : 0;
    if (isNaN(base) || base <= 0) return null;
    return { baseMs: base * 60 * 1000, incMs: inc * 1000 };
  }

  get isTimedGame(): boolean {
    return this.parseTimeControl(this.timeControl) !== null;
  }

  get gameTypeLabel(): string {
    if (!this.isTimedGame) return this.language.t('bot.type.unlimited');
    const p = this.parseTimeControl(this.timeControl)!;
    const mins = p.baseMs / 60000;
    if (mins <= 2)  return this.language.t('bot.type.bullet');
    if (mins <= 5)  return this.language.t('bot.type.blitz');
    if (mins <= 15) return this.language.t('bot.type.rapid');
    return this.language.t('bot.type.classical');
  }

  get gameTypeIcon(): string {
    if (!this.isTimedGame) return 'all_inclusive';
    const p = this.parseTimeControl(this.timeControl)!;
    const mins = p.baseMs / 60000;
    if (mins <= 2)  return 'flash_on';
    if (mins <= 5)  return 'bolt';
    if (mins <= 15) return 'speed';
    return 'hourglass_empty';
  }

  initTimers() {
    this.stopTimer();
    const parsed = this.parseTimeControl(this.timeControl);
    if (!parsed) {
      this.whiteTimeMs = 0;
      this.blackTimeMs = 0;
      this.incrementMs = 0;
      this.timerActive = false;
      return;
    }
    this.whiteTimeMs = parsed.baseMs;
    this.blackTimeMs = parsed.baseMs;
    this.incrementMs = parsed.incMs;
    this.timerActive = false;
  }

  startTimer() {
    if (!this.isTimedGame || this.timerActive) return;
    this.timerActive = true;
    this.lastTickTime = performance.now();
    this.timerInterval = setInterval(() => this.tickTimer(), 100);
  }

  stopTimer() {
    this.timerActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private tickTimer() {
    if (!this.timerActive || this.isGameOver) return;
    const now = performance.now();
    const elapsed = now - this.lastTickTime;
    this.lastTickTime = now;

    const isWhiteTurn = this.chess.turn() === 'w';
    if (isWhiteTurn) {
      this.whiteTimeMs = Math.max(0, this.whiteTimeMs - elapsed);
      if (this.whiteTimeMs === 0) { this.onTimeOut('white'); }
    } else {
      this.blackTimeMs = Math.max(0, this.blackTimeMs - elapsed);
      if (this.blackTimeMs === 0) { this.onTimeOut('black'); }
    }
  }

  /** Apply increment to the player who just moved */
  applyIncrement(movedColor: 'w' | 'b') {
    if (!this.isTimedGame || this.incrementMs === 0) return;
    if (movedColor === 'w') {
      this.whiteTimeMs = Math.min(this.whiteTimeMs + this.incrementMs, this.whiteTimeMs + this.incrementMs);
    } else {
      this.blackTimeMs = Math.min(this.blackTimeMs + this.incrementMs, this.blackTimeMs + this.incrementMs);
    }
  }

  private onTimeOut(color: 'white' | 'black') {
    this.stopTimer();
    this.isGameOver = true;
    if (color === this.playerColor) {
      this.gameOverResult = 'loss';
      this.gameOverReason = this.language.t('bot.reason.timeUp');
    } else {
      this.gameOverResult = 'win';
      this.gameOverReason = this.language.t('bot.reason.botTimeUp');
    }
    this.playGameOverSound(this.gameOverResult === 'win');
  }

  formatTime(ms: number): string {
    if (ms <= 0) return '0:00';
    const totalSec = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins < 1) {
      // show tenths of a second when under 1 minute
      const tenths = Math.floor((ms % 1000) / 100);
      return `0:${secs.toString().padStart(2, '0')}.${tenths}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  isTimeLow(ms: number): boolean {
    if (!this.isTimedGame) return false;
    const p = this.parseTimeControl(this.timeControl)!;
    // Low = under 10% of base or under 30 seconds
    return ms < Math.min(p.baseMs * 0.1, 30000);
  }

  isBotTimerActive(): boolean { return this.isTimedGame && this.timerActive && this.isBotTurn(); }
  isUserTimerActive(): boolean { return this.isTimedGame && this.timerActive && this.isUserTurn(); }

  get botDisplayTime(): string {
    return this.isTimedGame
      ? this.formatTime(this.playerColor === 'white' ? this.blackTimeMs : this.whiteTimeMs)
      : '';
  }
  get userDisplayTime(): string {
    return this.isTimedGame
      ? this.formatTime(this.playerColor === 'white' ? this.whiteTimeMs : this.blackTimeMs)
      : '';
  }
  get isBotTimeLow(): boolean {
    return this.playerColor === 'white' ? this.isTimeLow(this.blackTimeMs) : this.isTimeLow(this.whiteTimeMs);
  }
  get isUserTimeLow(): boolean {
    return this.playerColor === 'white' ? this.isTimeLow(this.whiteTimeMs) : this.isTimeLow(this.blackTimeMs);
  }

  getSquareStyle(square: string): { left: string; top: string; width: string; height: string } {
    if (!square || square.length < 2) {
      return { left: '0%', top: '0%', width: '12.5%', height: '12.5%' };
    }
    const file = square.charCodeAt(0) - 97; // 0 for 'a', 7 for 'h'
    const rank = parseInt(square.charAt(1), 10); // 1 to 8
    const isReversed = this.boardOrientation === 'b';

    let colIndex = file;
    let rowIndex = 8 - rank;

    if (isReversed) {
      colIndex = 7 - file;
      rowIndex = rank - 1;
    }

    return {
      left: `${(colIndex / 8) * 100}%`,
      top: `${(rowIndex / 8) * 100}%`,
      width: '12.5%',
      height: '12.5%'
    };
  }

  getDifficultyLabel(level: number): string {
    let band: 'bot.difficulty.beginner' | 'bot.difficulty.casual' | 'bot.difficulty.intermediate' | 'bot.difficulty.advanced' | 'bot.difficulty.master' = 'bot.difficulty.master';
    if (level <= 2) band = 'bot.difficulty.beginner';
    else if (level <= 5) band = 'bot.difficulty.casual';
    else if (level <= 10) band = 'bot.difficulty.intermediate';
    else if (level <= 15) band = 'bot.difficulty.advanced';

    return this.language.t('bot.difficulty.label', { band: this.language.t(band), level });
  }

  getBotElo(): number {
    return 1320 + this.skillLevel * 60;
  }

  formatNps(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return n.toString();
  }

  isBotTurn(): boolean {
    if (this.isGameOver) return false;
    const turn = this.chess.turn();
    return (turn === 'w' && this.playerColor === 'black') || (turn === 'b' && this.playerColor === 'white');
  }

  isUserTurn(): boolean {
    if (this.isGameOver) return false;
    const turn = this.chess.turn();
    return (turn === 'w' && this.playerColor === 'white') || (turn === 'b' && this.playerColor === 'black');
  }

  isLatestMove(moveNumber: number, color: 'w' | 'b'): boolean {
    const totalHalfMoves = this.moveHistory.length;
    if (totalHalfMoves === 0) return false;
    const isLastWhite = totalHalfMoves % 2 === 1;
    const lastMoveNum = Math.ceil(totalHalfMoves / 2);
    if (moveNumber !== lastMoveNum) return false;
    return isLastWhite ? color === 'w' : color === 'b';
  }

  /* ------------------- Board Management ------------------- */
  initBoard() {
    if (this.board) {
      try {
        this.board.destroy();
      } catch (e) {}
    }

    const orientation = this.boardOrientation === 'w' ? COLOR.white : COLOR.black;

    this.board = new Chessboard(this.boardElement.nativeElement, {
      position: this.chess.fen(),
      orientation: orientation,
      assetsUrl: '/assets/cm-chessboard/',
      style: {
        cssClass: this.selectedTheme,
        showCoordinates: false, // coordinates are handled crisply by our themed Indexer frame
        borderType: BORDER_TYPE.none
      },
      responsive: true,
      extensions: [
        { class: Markers },
        { class: Arrows },
        { class: PromotionDialog }
      ]
    });

    this.setupMoveInput();
  }

  setupMoveInput() {
    this.board.enableMoveInput((event: any) => {
      if (this.botMoveInProgress || this.isGameOver) {
        return false;
      }

      switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted: {
          if (!event.squareFrom) return false;
          const turn = this.chess.turn();
          const isPlayerTurn = (turn === 'w' && this.playerColor === 'white') ||
                               (turn === 'b' && this.playerColor === 'black');
          if (!isPlayerTurn) return false;

          const piece = this.chess.get(event.squareFrom as Square);
          if (!piece || piece.color !== (this.playerColor === 'white' ? 'w' : 'b')) {
            return false;
          }

          // Select square and compute legal moves for overlay
          this.selectedSquare = event.squareFrom;
          const legalMoves = this.chess.moves({ square: event.squareFrom as Square, verbose: true });
          this.legalMovesList = legalMoves;

          return true;
        }

        case INPUT_EVENT_TYPE.validateMoveInput: {
          if (!event.squareFrom || !event.squareTo) return false;
          const legalMoves = this.chess.moves({ square: event.squareFrom as Square, verbose: true });
          const isValid = legalMoves.some(m => m.to === event.squareTo);
          if (isValid) {
            this.pendingMove = { from: event.squareFrom, to: event.squareTo };
          }
          return isValid;
        }

        case INPUT_EVENT_TYPE.moveInputFinished: {
          this.clearLegalMoves();
          const from = event.squareFrom || this.pendingMove?.from;
          const to = event.squareTo || this.pendingMove?.to;
          this.pendingMove = null;

          if (!from || !to) return true;

          const legalMoves = this.chess.moves({ square: from as Square, verbose: true });
          const target = legalMoves.find(m => m.to === to);
          if (!target) return false;

          // Check for pawn promotion
          if (target.promotion) {
            this.pendingPromotion = { from, to };
            if (typeof this.board.showPromotionDialog === 'function') {
              const promoColor = this.playerColor === 'white' ? COLOR.white : COLOR.black;
              this.board.showPromotionDialog(to, promoColor, (result: any) => {
                if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
                  const pieceChar = result.piece.charAt(1).toLowerCase();
                  this.executePlayerMove(from, to, pieceChar);
                } else {
                  this.board.setPosition(this.chess.fen());
                }
              });
            } else {
              this.showPromotionPicker = true;
            }
            return true;
          }

          this.executePlayerMove(from, to);
          return true;
        }

        case INPUT_EVENT_TYPE.moveInputCanceled: {
          this.clearLegalMoves();
          this.pendingMove = null;
          break;
        }
      }
      return true;
    });
  }

  clearLegalMoves() {
    this.selectedSquare = null;
    this.legalMovesList = [];
  }

  choosePromotion(piece: string) {
    if (!this.pendingPromotion) return;
    const { from, to } = this.pendingPromotion;
    this.showPromotionPicker = false;
    this.pendingPromotion = null;
    this.executePlayerMove(from, to, piece);
  }

  cancelPromotion() {
    this.showPromotionPicker = false;
    this.pendingPromotion = null;
    this.board.setPosition(this.chess.fen());
  }

  executePlayerMove(from: string, to: string, promotion: string = 'q') {
    try {
      const isCapture = !!this.chess.get(to as Square);
      const move = this.chess.move({ from, to, promotion });
      if (move) {
        this.clearLegalMoves();
        this.applyIncrement('w' === move.color ? 'w' : 'b');
        this.onMoveExecuted(move.from, move.to, move.san, isCapture);

        if (this.hintActive) {
          this.hintActive = false;
          this.board.removeArrows?.();
        }

        if (!this.checkGameOver()) {
          setTimeout(() => this.makeBotMove(), 300);
        }
      }
    } catch (e) {
      console.error('Player move error:', e);
      this.board.setPosition(this.chess.fen());
    }
  }

  /* ------------------- Engine Integration ------------------- */
  async initEngine() {
    try {
      await this.engine.init();
      this.engine.setSkillLevel(this.skillLevel);
      this.engine.newGame();

      this.subs.push(
        this.engine.status.subscribe(status => {
          this.engineStatus = status;
        })
      );

      this.subs.push(
        this.engine.evaluation.subscribe(evalData => {
          this.currentDepth = evalData.depth;
          if (evalData.nps) this.nps = evalData.nps;

          // Process best line into readable SAN
          if (evalData.pv && evalData.pv.length > 0) {
            this.bestLineUci = evalData.pv.slice(0, 5);
            this.bestMoveStr = evalData.pv[0];
            this.convertPvToSan(evalData.pv.slice(0, 5));

            if (this.autoShowArrows) {
              this.drawBestMoveArrow();
            }
          }

          // Calculate Centipawns & Win percentage
          const isWhiteTurn = this.chess.turn() === 'w';
          if (evalData.score.type === 'mate') {
            const rawMate = evalData.score.value;
            const whiteMate = isWhiteTurn ? rawMate : -rawMate;
            this.evaluationDisplay = `M${Math.abs(rawMate)}`;
            this.whiteAdvantagePercent = whiteMate > 0 ? 100 : 0;
          } else {
            const cp = evalData.score.value;
            const whiteCp = isWhiteTurn ? cp : -cp;
            const scoreVal = whiteCp / 100;
            this.evaluationDisplay = scoreVal >= 0 ? `+${scoreVal.toFixed(2)}` : scoreVal.toFixed(2);
            // Lichess win chance formula
            const winChance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * whiteCp)) - 1);
            this.whiteAdvantagePercent = Math.max(5, Math.min(95, winChance));
          }
        })
      );

      this.subs.push(
        this.engine.bestMove.subscribe(bestMove => {
          this.botMoveInProgress = false;
          if (!bestMove.move || bestMove.move === '') {
            return;
          }
          try {
            const from = bestMove.move.slice(0, 2);
            const to = bestMove.move.slice(2, 4);
            const promo = bestMove.move.length > 4 ? bestMove.move.charAt(4) : undefined;
            const isCapture = !!this.chess.get(to as Square);

            const move = this.chess.move({ from, to, promotion: promo });
            if (move) {
              this.onMoveExecuted(move.from, move.to, move.san, isCapture);
              this.checkGameOver();
            }
          } catch (e) {
            console.error('Invalid bot move:', bestMove.move, e);
          }
        })
      );

      if (this.playerColor === 'black') {
        setTimeout(() => this.makeBotMove(), 600);
      }
    } catch (error) {
      console.error('Failed to init engine:', error);
      this.engineStatus = 'error';
    }
  }

  makeBotMove() {
    if (this.chess.isGameOver() || !this.engine.isReady() || this.botMoveInProgress) {
      return;
    }

    this.botMoveInProgress = true;
    this.engineStatus = 'thinking';
    this.engine.setPosition(this.chess.fen());
    const depth = Math.min(22, 10 + Math.floor(this.skillLevel / 2));
    this.engine.go({ depth });
  }

  /* ------------------- Move Execution & State Updates ------------------- */
  private onMoveExecuted(from: string, to: string, san: string, isCapture: boolean) {
    // Apply increment to the player who just moved (chess.turn() already flipped)
    const movedColor: 'w' | 'b' = this.chess.turn() === 'w' ? 'b' : 'w';
    this.applyIncrement(movedColor);

    this.lastMove = { from, to };
    this.moveHistory.push(san);
    this.updatePairedMoves();
    this.updateCapturedPieces();

    // Smoothly update chessboard position
    this.board.setPosition(this.chess.fen(), true);

    // Update in-check indicator square
    if (this.chess.inCheck()) {
      this.kingInCheckSquare = this.getKingSquare(this.chess.turn());
    } else {
      this.kingInCheckSquare = null;
    }

    // Play tactile sound
    const isCheck = this.chess.inCheck();
    this.playAudio(isCapture, isCheck);

    // Start timer on first move (timed games only)
    if (!this.timerActive && this.isTimedGame && !this.isGameOver) {
      this.startTimer();
    }

    // Scroll moves list down
    setTimeout(() => this.scrollMovesToBottom(), 50);

    // If auto arrows enabled or hint was active
    if (this.autoShowArrows) {
      setTimeout(() => this.drawBestMoveArrow(), 300);
    }
  }

  private getKingSquare(color: 'w' | 'b'): string | null {
    const board = this.chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === color) {
          const file = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = (8 - r).toString();
          return `${file}${rank}`;
        }
      }
    }
    return null;
  }

  private updatePairedMoves() {
    const pairs: MoveRecord[] = [];
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: this.moveHistory[i],
        black: this.moveHistory[i + 1]
      });
    }
    this.pairedMoves = pairs;
  }

  private updateCapturedPieces() {
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

    const currentWhite: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    for (const row of this.chess.board()) {
      for (const sq of row) {
        if (sq && sq.type !== 'k') {
          if (sq.color === 'w') currentWhite[sq.type] = (currentWhite[sq.type] || 0) + 1;
          else currentBlack[sq.type] = (currentBlack[sq.type] || 0) + 1;
        }
      }
    }

    const whiteCaptured: string[] = []; // black pieces taken by white
    const blackCaptured: string[] = []; // white pieces taken by black
    let whiteScore = 0;
    let blackScore = 0;

    for (const [type, count] of Object.entries(initialCounts)) {
      const missingBlack = count - (currentBlack[type] || 0);
      for (let i = 0; i < missingBlack; i++) whiteCaptured.push('b' + type.toUpperCase());

      const missingWhite = count - (currentWhite[type] || 0);
      for (let i = 0; i < missingWhite; i++) blackCaptured.push('w' + type.toUpperCase());

      whiteScore += (currentWhite[type] || 0) * pieceValues[type];
      blackScore += (currentBlack[type] || 0) * pieceValues[type];
    }

    const sortOrder: Record<string, number> = { Q: 5, R: 4, B: 3, N: 2, P: 1 };
    whiteCaptured.sort((a, b) => (sortOrder[b[1]] || 0) - (sortOrder[a[1]] || 0));
    blackCaptured.sort((a, b) => (sortOrder[b[1]] || 0) - (sortOrder[a[1]] || 0));

    if (this.playerColor === 'white') {
      this.userCapturedPieces = whiteCaptured;
      this.botCapturedPieces = blackCaptured;
      this.userMaterialAdvantage = Math.max(0, whiteScore - blackScore);
      this.botMaterialAdvantage = Math.max(0, blackScore - whiteScore);
    } else {
      this.userCapturedPieces = blackCaptured;
      this.botCapturedPieces = whiteCaptured;
      this.userMaterialAdvantage = Math.max(0, blackScore - whiteScore);
      this.botMaterialAdvantage = Math.max(0, whiteScore - blackScore);
    }
  }

  private convertPvToSan(uciMoves: string[]) {
    try {
      const tempChess = new Chess(this.chess.fen());
      const sanMoves: string[] = [];
      for (const uci of uciMoves) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promo = uci.length > 4 ? uci.charAt(4) : undefined;
        const m = tempChess.move({ from, to, promotion: promo });
        if (m) sanMoves.push(m.san);
        else break;
      }
      this.bestLineSan = sanMoves;
    } catch (_) {
      this.bestLineSan = [];
    }
  }

  private checkGameOver(): boolean {
    if (!this.chess.isGameOver()) {
      return false;
    }

    this.isGameOver = true;
    this.botMoveInProgress = false;
    this.stopTimer();

    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'black' : 'white';
      if (winner === this.playerColor) {
        this.gameOverResult = 'win';
        this.gameOverReason = this.language.t('bot.reason.checkmateWin', { level: this.skillLevel });
      } else {
        this.gameOverResult = 'loss';
        this.gameOverReason = this.language.t('bot.reason.checkmateLoss');
      }
    } else if (this.chess.isStalemate()) {
      this.gameOverResult = 'draw';
      this.gameOverReason = this.language.t('bot.reason.stalemate');
    } else if (this.chess.isThreefoldRepetition()) {
      this.gameOverResult = 'draw';
      this.gameOverReason = this.language.t('bot.reason.repetition');
    } else if (this.chess.isInsufficientMaterial()) {
      this.gameOverResult = 'draw';
      this.gameOverReason = this.language.t('bot.reason.insufficient');
    } else {
      this.gameOverResult = 'draw';
      this.gameOverReason = this.language.t('bot.reason.fiftyMove');
    }

    this.playGameOverSound(this.gameOverResult === 'win');
    return true;
  }

  /* ------------------- Sound Synthesis & Audio ------------------- */
  toggleSound() {
    this.isMuted = !this.isMuted;
    this.snackBar.open(this.isMuted ? this.language.t('bot.msg.audioMuted') : this.language.t('bot.msg.audioUnmuted'), this.language.t('common.ok'), { duration: 1500 });
  }

  private playAudio(isCapture: boolean, isCheck: boolean) {
    if (this.isMuted) return;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (isCheck) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (isCapture) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    } catch (_) {
      try {
        const audio = new Audio('assets/sounds/move.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}
    }
  }

  private playGameOverSound(isWin: boolean) {
    if (this.isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (isWin) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.12);
        osc.frequency.setValueAtTime(659.25, now + 0.24);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(329.63, now);
        osc.frequency.setValueAtTime(293.66, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (_) {}
  }

  /* ------------------- Interactive Controls ------------------- */
  undoMove() {
    if (this.moveHistory.length === 0 || this.botMoveInProgress) return;

    this.engine.stop();
    this.botMoveInProgress = false;

    // If it's player's turn, undo bot move and player move (2 plies)
    if (this.isUserTurn()) {
      this.chess.undo();
      this.chess.undo();
      this.moveHistory.pop();
      this.moveHistory.pop();
    } else {
      // It's bot's turn, undo only player's move (1 ply)
      this.chess.undo();
      this.moveHistory.pop();
    }

    this.isGameOver = false;
    this.clearLegalMoves();
    this.updatePairedMoves();
    this.updateCapturedPieces();
    this.board.setPosition(this.chess.fen(), true);

    // Update last move reference from chess history
    const history = this.chess.history({ verbose: true });
    if (history.length > 0) {
      const last = history[history.length - 1];
      this.lastMove = { from: last.from, to: last.to };
    } else {
      this.lastMove = null;
    }

    this.kingInCheckSquare = this.chess.inCheck() ? this.getKingSquare(this.chess.turn()) : null;
    this.board.removeArrows?.();
    this.hintActive = false;

    // Refresh engine evaluation
    this.engine.setPosition(this.chess.fen());
    this.engine.go({ depth: 10 });
    this.snackBar.open(this.language.t('bot.msg.moveUndone'), this.language.t('common.dismiss'), { duration: 1500 });
  }

  toggleHint() {
    if (this.isGameOver || this.botMoveInProgress) return;
    this.hintActive = !this.hintActive;

    if (this.hintActive) {
      this.drawBestMoveArrow();
    } else {
      this.board.removeArrows?.();
    }
  }

  drawBestMoveArrow() {
    if (!this.bestMoveStr || this.bestMoveStr.length < 4 || !this.board?.addArrow) return;
    const from = this.bestMoveStr.slice(0, 2);
    const to = this.bestMoveStr.slice(2, 4);

    this.board.removeArrows?.();
    this.board.addArrow(ARROW_TYPE.default, from, to);
  }

  onAutoArrowToggle() {
    if (this.autoShowArrows) {
      this.drawBestMoveArrow();
    } else if (!this.hintActive) {
      this.board.removeArrows?.();
    }
  }

  flipBoard() {
    this.boardOrientation = this.boardOrientation === 'w' ? 'b' : 'w';
    this.updateRanksAndFiles();
    this.board.setOrientation(this.boardOrientation === 'w' ? COLOR.white : COLOR.black);
    if (this.hintActive || this.autoShowArrows) {
      setTimeout(() => this.drawBestMoveArrow(), 150);
    }
  }

  setTheme(themeId: string) {
    this.selectedTheme = themeId;
    const boardEl = this.boardElement.nativeElement.querySelector('.cm-chessboard');
    if (boardEl) {
      this.themes.forEach(t => boardEl.classList.remove(t.id));
      boardEl.classList.remove('default');
      boardEl.classList.add(themeId);
    }
  }

  newGame() {
    this.engine.stop();
    this.stopTimer();
    this.chess.reset();
    this.moveHistory = [];
    this.pairedMoves = [];
    this.lastMove = null;
    this.selectedSquare = null;
    this.legalMovesList = [];
    this.kingInCheckSquare = null;
    this.isGameOver = false;
    this.gameOverResult = '';
    this.gameOverReason = '';
    this.botMoveInProgress = false;
    this.hintActive = false;
    this.evaluationDisplay = '0.00';
    this.whiteAdvantagePercent = 50;
    this.bestLineUci = [];
    this.bestLineSan = [];
    this.bestMoveStr = '';
    this.initTimers();

    if (this.board) {
      this.board.setPosition(this.chess.fen());
      this.board.removeArrows?.();
    }

    this.updateCapturedPieces();
    this.engine.newGame();

    if (this.playerColor === 'black') {
      setTimeout(() => this.makeBotMove(), 600);
    }
  }

  resign() {
    if (this.isGameOver) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '430px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'premium-dialog',
      restoreFocus: true,
      data: {
        title: this.language.t('bot.resign.title'),
        message: this.language.t('bot.resign.message'),
        confirmLabel: this.language.t('bot.resign.confirm'),
        cancelLabel: this.language.t('bot.resign.keepPlaying'),
        icon: 'flag',
        tone: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.stopTimer();
      this.isGameOver = true;
      this.gameOverResult = 'loss';
      this.gameOverReason = this.language.t('bot.reason.resigned');
      this.playGameOverSound(false);
    });
  }

  openDifficultyDialog() {
    const dialogRef = this.dialog.open(PlayVsBotDialogComponent, {
      width: '800px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'premium-dialog',
      restoreFocus: true,
      data: { color: this.playerColor }
    });

    dialogRef.afterClosed().subscribe((result: BotDialogResult) => {
      if (result) {
        this.playerColor = result.color;
        this.boardOrientation = this.playerColor === 'black' ? 'b' : 'w';
        this.updateRanksAndFiles();
        this.skillLevel = result.skillLevel;
        this.timeControl = result.timeControl;
        this.engine.setSkillLevel(this.skillLevel);

        const orientation = this.boardOrientation === 'w' ? COLOR.white : COLOR.black;
        this.board.setOrientation(orientation);

        this.newGame();
        this.snackBar.open(this.language.t('bot.msg.strengthAdjusted', { level: this.skillLevel }), this.language.t('common.ok'), { duration: 2500 });
      }
    });
  }

  copyFen() {
    const fen = this.chess.fen();
    navigator.clipboard.writeText(fen).then(() => {
      this.snackBar.open(this.language.t('bot.msg.fenCopied'), this.language.t('common.ok'), { duration: 2000 });
    });
  }

  copyPgn() {
    const pgn = this.chess.pgn();
    navigator.clipboard.writeText(pgn).then(() => {
      this.snackBar.open(this.language.t('bot.msg.pgnCopied'), this.language.t('common.ok'), { duration: 2000 });
    });
  }

  goBack() {
    this.router.navigate(['/play']);
  }

  private scrollMovesToBottom() {
    if (this.movesContainer) {
      const el = this.movesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
