import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Chessboard, COLOR, INPUT_EVENT_TYPE, BORDER_TYPE } from 'cm-chessboard';
import { Markers, MARKER_TYPE } from 'cm-chessboard/src/extensions/markers/Markers.js';
import { Arrows, ARROW_TYPE } from 'cm-chessboard/src/extensions/arrows/Arrows.js';
import { Chess, Square } from 'chess.js';
import { Subscription } from 'rxjs';

import { StockfishEngineService } from '../../core/services/stockfish-engine.service';
import { KidsLanguageService } from './kids-language.service';

interface BuddyConfetti {
  left: number;
  delay: number;
  duration: number;
  color: string;
}

type PlayerColor = 'w' | 'b';
type KidsDifficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  skill: number;
  depth: number;
}

const KIDS_DIFFICULTIES: Record<KidsDifficulty, DifficultyConfig> = {
  easy: { skill: 0, depth: 2 },
  medium: { skill: 5, depth: 4 },
  hard: { skill: 10, depth: 6 }
};

type BuddyState =
  | 'welcome'
  | 'newGame'
  | 'thinking'
  | 'checkPraise'
  | 'capturePraise'
  | 'praise'
  | 'buddyCheck'
  | 'buddyCapture'
  | 'yourTurn'
  | 'hint'
  | 'undo'
  | 'win'
  | 'loss'
  | 'draw';

@Component({
  selector: 'app-kids-game',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="kids-play-world">
      <!-- Playful animated background -->
      <div class="play-sky" aria-hidden="true">
        <span class="cloud c1">☁️</span>
        <span class="cloud c2">☁️</span>
        <span class="cloud c3">☁️</span>
        <span class="float-emoji e1">⭐</span>
        <span class="float-emoji e2">✨</span>
        <span class="float-emoji e3">🌈</span>
        <span class="float-emoji e4">🎈</span>
        <img class="float-piece fp1" src="assets/chess-pieces/wK.svg" alt="" />
        <img class="float-piece fp2" src="assets/chess-pieces/bN.svg" alt="" />
      </div>

      <!-- Kids header -->
      <header class="play-header">
        <a class="home-pill" routerLink="/kids">
          <span>🏠</span> {{ ui.common.kidsHome }}
        </a>
        <div class="play-title">
          <span class="title-buddy">🤖</span>
          <span>{{ game.titlePrefix }} <strong>{{ game.buddyName }}</strong></span>
        </div>
        <div class="header-actions">
          <label class="language-picker">
            <span aria-hidden="true">🌍</span>
            <select
              #gameLanguage
              class="language-select"
              [value]="languageCode"
              [attr.aria-label]="languageLabel"
              (change)="changeLanguage(gameLanguage.value)">
              @for (language of languages; track language.code) {
                <option [value]="language.code" [selected]="language.code === languageCode">
                  {{ language.name }}
                </option>
              }
            </select>
          </label>
          <button
            class="sound-pill"
            (click)="toggleSound()"
            [title]="isMuted ? game.soundOn : game.soundOff">
            {{ isMuted ? '🔇' : '🔊' }}
          </button>
        </div>
      </header>

      <main class="play-stage">
        <!-- Board panel -->
        <section class="board-panel">
          <!-- Buddy row -->
          <div class="buddy-row">
            <div class="buddy-avatar" [class.thinking]="buddyThinking">
              🤖
              <span class="buddy-bounce-dot"></span>
            </div>
            <div class="buddy-bubble" [class.thinking]="buddyThinking">
              {{ buddyMessage }}
            </div>
          </div>

          <!-- Friendly colour and difficulty options -->
          <div class="game-options">
            <div class="option-group" role="group" [attr.aria-label]="game.playAs">
              <span class="option-label">{{ game.playAs }}</span>
              <div class="option-buttons">
                <button
                  type="button"
                  class="option-chip"
                  [class.active]="playerColor === 'w'"
                  [attr.aria-pressed]="playerColor === 'w'"
                  (click)="chooseColor('w')">
                  <span aria-hidden="true">♔</span> {{ game.white }}
                </button>
                <button
                  type="button"
                  class="option-chip"
                  [class.active]="playerColor === 'b'"
                  [attr.aria-pressed]="playerColor === 'b'"
                  (click)="chooseColor('b')">
                  <span aria-hidden="true">♚</span> {{ game.black }}
                </button>
              </div>
            </div>

            <div class="option-group" role="group" [attr.aria-label]="game.difficulty">
              <span class="option-label">{{ game.difficulty }}</span>
              <div class="option-buttons">
                <button
                  type="button"
                  class="option-chip"
                  [class.active]="difficulty === 'easy'"
                  [attr.aria-pressed]="difficulty === 'easy'"
                  (click)="setDifficulty('easy')">
                  🌱 {{ game.levelEasy }}
                </button>
                <button
                  type="button"
                  class="option-chip"
                  [class.active]="difficulty === 'medium'"
                  [attr.aria-pressed]="difficulty === 'medium'"
                  (click)="setDifficulty('medium')">
                  ⭐ {{ game.levelMedium }}
                </button>
                <button
                  type="button"
                  class="option-chip"
                  [class.active]="difficulty === 'hard'"
                  [attr.aria-pressed]="difficulty === 'hard'"
                  (click)="setDifficulty('hard')">
                  🚀 {{ game.levelHard }}
                </button>
              </div>
            </div>
          </div>

          <!-- Board -->
          <div class="board-frame" [class.buddy-turn]="buddyThinking">
            <div class="frame-dots" aria-hidden="true">
              <span></span><span></span><span></span><span></span>
            </div>
            <div #boardElement class="kids-board"></div>

            <!-- Check alert -->
            @if (inCheck && !isGameOver) {
              <div class="check-badge">⚠️ {{ game.check }}</div>
            }

            <!-- Game over overlay -->
            @if (isGameOver) {
              <div class="game-over-overlay">
                @if (gameOverResult === 'win') {
                  <div class="confetti-layer" aria-hidden="true">
                    @for (c of confetti; track $index) {
                      <span
                        class="confetti"
                        [style.left.%]="c.left"
                        [style.animation-delay.s]="c.delay"
                        [style.animation-duration.s]="c.duration"
                        [style.background]="c.color"></span>
                    }
                  </div>
                }

                <div class="game-over-card">
                  <div class="result-emoji">{{ resultEmoji }}</div>
                  <h2>{{ resultTitle }}</h2>
                  <p>{{ resultText }}</p>
                  <button class="big-btn green-btn" (click)="newGame()">
                    🔄 {{ ui.common.playAgain }}
                  </button>
                  <a class="big-btn purple-btn" routerLink="/kids">
                    🏠 {{ ui.common.backToKidsHome }}
                  </a>
                </div>
              </div>
            }
          </div>

          <!-- Player row -->
          <div class="player-row">
            <div class="player-avatar">🧒</div>
            <div class="player-name">{{ game.you }} <span class="color-tag">{{ playerColorLabel }}</span></div>
            @if (isPlayerTurn && !isGameOver) {
              <span class="turn-pill">{{ game.yourTurn }}</span>
            }
          </div>

          <!-- Big friendly controls -->
          <div class="controls">
            <button class="control-btn new-btn" (click)="newGame()">
              🔄 {{ game.newGame }}
            </button>
            <button
              class="control-btn undo-btn"
              (click)="undoMove()"
              [disabled]="moveHistory.length === 0">
              ↩️ {{ game.undo }}
            </button>
            <button
              class="control-btn hint-btn"
              (click)="showHint()"
              [disabled]="!isPlayerTurn || isGameOver">
              💡 {{ game.hint }}
            </button>
          </div>
        </section>

        <!-- Simple tips panel -->
        <aside class="tips-panel">
          <h2>{{ game.tipsTitle }}</h2>

          <div class="tip-card">
            <span class="tip-emoji">👆</span>
            <div>
              <strong>{{ game.tipTapTitle }}</strong>
              <p>{{ game.tipTapText }}</p>
            </div>
          </div>

          <div class="tip-card">
            <span class="tip-emoji">💡</span>
            <div>
              <strong>{{ game.tipHelpTitle }}</strong>
              <p>{{ game.tipHelpText }}</p>
            </div>
          </div>

          <div class="tip-card">
            <span class="tip-emoji">👑</span>
            <div>
              <strong>{{ game.tipWinTitle }}</strong>
              <p>{{ game.tipWinText }}</p>
            </div>
          </div>

          <div class="kindness-card">
            <span>🌈</span>
            <p>{{ game.noTimer }}</p>
          </div>
        </aside>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .kids-play-world {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background: linear-gradient(140deg, #fef3c7, #fce7f3, #dbeafe, #d1fae5, #fef3c7);
      background-size: 400% 400%;
      animation: play-gradient 20s ease infinite;
      color: #1e293b;
    }

    @keyframes play-gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* ---- Background ---- */
    .play-sky {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }

    .cloud {
      position: absolute;
      font-size: 64px;
      opacity: 0.55;
      animation: cloud-drift 26s linear infinite;
    }
    .c1 { top: 8%; left: -10%; animation-duration: 30s; }
    .c2 { top: 32%; left: -18%; font-size: 46px; animation-delay: 8s; animation-duration: 36s; }
    .c3 { top: 68%; left: -14%; font-size: 54px; animation-delay: 16s; animation-duration: 32s; }

    @keyframes cloud-drift {
      from { transform: translateX(0); }
      to { transform: translateX(130vw); }
    }

    .float-emoji {
      position: absolute;
      font-size: 28px;
      animation: emoji-float 7s ease-in-out infinite;
      opacity: 0.7;
    }
    .e1 { top: 14%; right: 8%; }
    .e2 { top: 52%; left: 4%; animation-delay: 1.2s; font-size: 22px; }
    .e3 { bottom: 18%; right: 12%; animation-delay: 2.4s; font-size: 34px; }
    .e4 { top: 72%; left: 10%; animation-delay: 3.2s; font-size: 30px; }

    @keyframes emoji-float {
      0%, 100% { transform: translateY(0) rotate(-6deg); }
      50% { transform: translateY(-18px) rotate(8deg); }
    }

    .float-piece {
      position: absolute;
      width: 46px;
      height: 46px;
      opacity: 0.22;
      animation: piece-drift 11s ease-in-out infinite;
    }
    .fp1 { top: 24%; left: 2%; }
    .fp2 { bottom: 12%; right: 4%; animation-delay: 2s; }

    @keyframes piece-drift {
      0%, 100% { transform: translateY(0) rotate(-10deg); }
      50% { transform: translateY(-22px) rotate(10deg); }
    }

    /* ---- Header ---- */
    .play-header {
      position: relative;
      z-index: 5;
      max-width: 1180px;
      margin: 0 auto;
      padding: 18px 22px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .home-pill,
    .sound-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-weight: 800;
      font-size: 0.95rem;
      color: #7c2d12;
      background: #ffffff;
      padding: 10px 16px;
      border-radius: 999px;
      box-shadow: 0 4px 0 rgba(148, 163, 184, 0.35);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .home-pill:hover,
    .sound-pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 0 rgba(148, 163, 184, 0.35);
    }

    .sound-pill {
      font-size: 1.15rem;
      padding: 8px 14px;
    }

    .header-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .language-picker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 4px 0 rgba(196, 181, 253, 0.6);
      color: #6d28d9;
      font-weight: 800;
      font-size: 0.9rem;
    }

    .language-select {
      border: none;
      background: transparent;
      font-family: inherit;
      font-weight: 800;
      font-size: 0.9rem;
      color: #6d28d9;
      cursor: pointer;
      outline: none;
      padding: 2px;
      border-radius: 8px;
    }

    .language-select:focus-visible {
      outline: 2px solid #8b5cf6;
      outline-offset: 2px;
    }

    .language-select option {
      color: #1e293b;
      background: #ffffff;
    }

    .play-title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 1.2rem;
      font-weight: 700;
      color: #1e293b;
      background: rgba(255, 255, 255, 0.7);
      padding: 9px 18px;
      border-radius: 999px;
      box-shadow: 0 4px 0 rgba(196, 181, 253, 0.6);
    }

    .play-title strong {
      background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .title-buddy {
      font-size: 1.5rem;
      animation: buddy-wiggle 2.4s ease-in-out infinite;
    }

    @keyframes buddy-wiggle {
      0%, 100% { transform: rotate(-6deg) scale(1); }
      50% { transform: rotate(6deg) scale(1.12); }
    }

    /* ---- Stage layout ---- */
    .play-stage {
      position: relative;
      z-index: 5;
      max-width: 1180px;
      margin: 0 auto;
      padding: 26px 22px 46px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 26px;
      align-items: start;
    }

    .board-panel {
      min-width: 0;
      max-width: 720px;
      width: 100%;
      margin: 0 auto;
    }

    /* ---- Buddy ---- */
    .buddy-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }

    .buddy-avatar {
      position: relative;
      flex-shrink: 0;
      width: 62px;
      height: 62px;
      display: grid;
      place-items: center;
      font-size: 2.1rem;
      border-radius: 50%;
      background: linear-gradient(145deg, #c4b5fd, #a5b4fc);
      box-shadow: 0 6px 0 #8b5cf6, 0 10px 18px -8px rgba(139, 92, 246, 0.7);
      animation: buddy-bob 2.6s ease-in-out infinite;
    }

    .buddy-avatar.thinking {
      animation: buddy-bob 0.8s ease-in-out infinite;
    }

    @keyframes buddy-bob {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50% { transform: translateY(-6px) rotate(2deg); }
    }

    .buddy-bounce-dot {
      position: absolute;
      right: 2px;
      bottom: 0;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid #ffffff;
    }

    .buddy-bubble {
      position: relative;
      flex: 1;
      min-height: 58px;
      display: flex;
      align-items: center;
      padding: 12px 18px;
      background: #ffffff;
      border: 3px solid #e9d5ff;
      border-radius: 20px 20px 20px 6px;
      font-size: 1.02rem;
      font-weight: 700;
      color: #5b21b6;
      box-shadow: 0 6px 0 rgba(196, 181, 253, 0.45);
      animation: bubble-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .buddy-bubble.thinking {
      color: #0369a1;
      border-color: #bae6fd;
      box-shadow: 0 6px 0 rgba(125, 211, 252, 0.5);
    }

    @keyframes bubble-pop {
      0% { transform: scale(0.94); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* ---- Game options ---- */
    .game-options {
      display: flex;
      align-items: center;
      gap: 14px 22px;
      flex-wrap: wrap;
      margin-bottom: 14px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.82);
      border: 3px solid #ffffff;
      border-radius: 20px;
      box-shadow: 0 5px 0 rgba(196, 181, 253, 0.5);
    }

    .option-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .option-label {
      font-size: 0.82rem;
      font-weight: 800;
      color: #6d28d9;
      white-space: nowrap;
    }

    .option-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .option-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 2px solid #e9d5ff;
      background: #ffffff;
      color: #5b21b6;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 800;
      padding: 7px 11px;
      border-radius: 999px;
      cursor: pointer;
      white-space: nowrap;
      transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }

    .option-chip:hover {
      transform: translateY(-1px);
      background: #faf5ff;
    }

    .option-chip.active {
      color: #ffffff;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      border-color: transparent;
      box-shadow: 0 3px 0 #6d28d9;
    }

    .option-chip:focus-visible {
      outline: 3px solid #fbbf24;
      outline-offset: 2px;
    }

    /* ---- Board frame ---- */
    .board-frame {
      position: relative;
      padding: 14px;
      border-radius: 30px;
      background: linear-gradient(145deg, #fbcfe8, #c4b5fd 45%, #93c5fd);
      box-shadow: 0 12px 0 #a78bfa, 0 26px 45px -18px rgba(139, 92, 246, 0.65);
      transition: box-shadow 0.3s ease;
    }

    .board-frame.buddy-turn {
      box-shadow: 0 12px 0 #67e8f9, 0 26px 45px -18px rgba(6, 182, 212, 0.7);
      animation: frame-glow 1.8s ease-in-out infinite;
    }

    @keyframes frame-glow {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.06); }
    }

    .frame-dots span {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.9);
      animation: dot-twinkle 2.4s ease-in-out infinite;
    }
    .frame-dots span:nth-child(1) { top: 8px; left: 20px; }
    .frame-dots span:nth-child(2) { top: 8px; right: 20px; animation-delay: 0.6s; }
    .frame-dots span:nth-child(3) { bottom: 8px; left: 20px; animation-delay: 1.2s; }
    .frame-dots span:nth-child(4) { bottom: 8px; right: 20px; animation-delay: 1.8s; }

    @keyframes dot-twinkle {
      0%, 100% { opacity: 0.35; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.15); }
    }

    .kids-board {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 18px;
      overflow: hidden;
      background: #fef9c3;
      box-shadow: inset 0 0 0 4px #ffffff;
    }

    /* ---- Check badge ---- */
    .check-badge {
      position: absolute;
      top: 26px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      background: #fef2f2;
      color: #b91c1c;
      border: 3px solid #fecaca;
      border-radius: 999px;
      padding: 8px 18px;
      font-weight: 800;
      font-size: 0.95rem;
      box-shadow: 0 6px 0 #fca5a5;
      animation: check-shake 0.7s ease-in-out infinite;
      white-space: nowrap;
    }

    @keyframes check-shake {
      0%, 100% { transform: translateX(-50%) rotate(0deg); }
      25% { transform: translateX(-50%) rotate(-2deg); }
      75% { transform: translateX(-50%) rotate(2deg); }
    }

    /* ---- Player row ---- */
    .player-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 14px;
      background: rgba(255, 255, 255, 0.82);
      border: 3px solid #ffffff;
      border-radius: 999px;
      padding: 8px 16px;
      box-shadow: 0 6px 0 rgba(167, 243, 208, 0.65);
    }

    .player-avatar {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      font-size: 1.5rem;
      border-radius: 50%;
      background: linear-gradient(145deg, #bbf7d0, #86efac);
    }

    .player-name {
      font-weight: 800;
      color: #14532d;
      font-size: 1.05rem;
    }

    .color-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 999px;
      margin-left: 4px;
    }

    .turn-pill {
      margin-left: auto;
      background: #dcfce7;
      color: #15803d;
      font-weight: 800;
      font-size: 0.9rem;
      padding: 6px 14px;
      border-radius: 999px;
      animation: turn-bounce 1.6s ease-in-out infinite;
    }

    @keyframes turn-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    /* ---- Controls ---- */
    .controls {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .control-btn {
      cursor: pointer;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 800;
      color: #ffffff;
      border: none;
      border-radius: 18px;
      padding: 14px 12px;
      transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
    }

    .control-btn:hover:not(:disabled) {
      transform: translateY(-3px);
      filter: brightness(1.05);
    }

    .control-btn:active:not(:disabled) {
      transform: translateY(3px);
      box-shadow: none !important;
    }

    .control-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .new-btn {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      box-shadow: 0 6px 0 #15803d;
    }

    .undo-btn {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      box-shadow: 0 6px 0 #1d4ed8;
    }

    .hint-btn {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      box-shadow: 0 6px 0 #b45309;
      color: #78350f;
    }

    /* ---- Tips panel ---- */
    .tips-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: rgba(255, 255, 255, 0.78);
      border: 3px solid #ffffff;
      border-radius: 26px;
      padding: 20px;
      box-shadow: 0 10px 0 rgba(224, 231, 255, 0.9), 0 20px 36px -20px rgba(99, 102, 241, 0.4);
    }

    .tips-panel h2 {
      margin: 0 0 4px;
      font-size: 1.15rem;
      color: #1e293b;
    }

    .tip-card {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: #ffffff;
      border-radius: 16px;
      padding: 12px;
      box-shadow: 0 4px 0 rgba(148, 163, 184, 0.2);
    }

    .tip-emoji {
      font-size: 1.5rem;
      line-height: 1;
    }

    .tip-card strong {
      display: block;
      font-size: 0.92rem;
      color: #1e293b;
      margin-bottom: 2px;
    }

    .tip-card p {
      margin: 0;
      font-size: 0.83rem;
      line-height: 1.4;
      color: #64748b;
    }

    .kindness-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef3c7;
      border-radius: 16px;
      padding: 12px;
      color: #92400e;
      font-size: 0.86rem;
      font-weight: 700;
    }

    .kindness-card span {
      font-size: 1.4rem;
    }

    .kindness-card p {
      margin: 0;
      line-height: 1.35;
    }

    /* ---- Game over ---- */
    .game-over-overlay {
      position: absolute;
      inset: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(30, 41, 59, 0.5);
      backdrop-filter: blur(3px);
      border-radius: 30px;
      overflow: hidden;
    }

    .game-over-card {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 360px;
      text-align: center;
      background: #ffffff;
      border: 4px solid #ffffff;
      border-radius: 26px;
      padding: 26px 22px;
      box-shadow: 0 14px 0 rgba(196, 181, 253, 0.8), 0 30px 50px -20px rgba(15, 23, 42, 0.5);
      animation: result-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes result-pop {
      0% { transform: scale(0.75); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .result-emoji {
      font-size: 3.6rem;
      line-height: 1;
      animation: result-bounce 1.4s ease-in-out infinite;
    }

    @keyframes result-bounce {
      0%, 100% { transform: translateY(0) rotate(-4deg); }
      50% { transform: translateY(-8px) rotate(4deg); }
    }

    .game-over-card h2 {
      margin: 10px 0 6px;
      font-size: 1.7rem;
      color: #1e293b;
    }

    .game-over-card p {
      margin: 0 0 18px;
      color: #64748b;
      line-height: 1.45;
    }

    .big-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
      text-decoration: none;
      border-radius: 16px;
      padding: 13px 16px;
      margin-top: 10px;
      transition: transform 0.14s ease, filter 0.14s ease;
    }

    .big-btn:hover {
      transform: translateY(-2px);
      filter: brightness(1.05);
    }

    .green-btn {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      box-shadow: 0 5px 0 #15803d;
    }

    .purple-btn {
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      box-shadow: 0 5px 0 #6d28d9;
    }

    /* ---- Confetti ---- */
    .confetti-layer {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      border-radius: 30px;
    }

    .confetti {
      position: absolute;
      top: -20px;
      width: 10px;
      height: 16px;
      border-radius: 3px;
      opacity: 0.9;
      animation-name: confetti-fall;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }

    @keyframes confetti-fall {
      0% { transform: translateY(-20px) rotate(0deg); }
      100% { transform: translateY(560px) rotate(720deg); }
    }

    /* ---- Responsive ---- */
    @media (max-width: 980px) {
      .play-stage {
        grid-template-columns: 1fr;
        max-width: 760px;
      }
      .tips-panel {
        order: 2;
      }
    }

    @media (max-width: 600px) {
      .play-header {
        justify-content: center;
        padding-top: 12px;
      }
      .play-title {
        order: -1;
        width: 100%;
        justify-content: center;
      }
      .play-stage {
        padding: 18px 12px 34px;
        gap: 18px;
      }
      .buddy-bubble {
        font-size: 0.92rem;
        min-height: 52px;
        padding: 10px 14px;
      }
      .buddy-avatar {
        width: 52px;
        height: 52px;
        font-size: 1.8rem;
      }
      .board-frame {
        padding: 9px;
        border-radius: 22px;
      }
      .game-options {
        padding: 10px;
        gap: 10px;
      }
      .option-group {
        width: 100%;
        justify-content: space-between;
      }
      .option-buttons {
        flex: 1;
        justify-content: flex-end;
      }
      .option-chip {
        padding: 7px 9px;
        font-size: 0.78rem;
      }
      .check-badge {
        font-size: 0.8rem;
        padding: 6px 12px;
        white-space: normal;
        text-align: center;
        width: max-content;
        max-width: 90%;
      }
      .controls {
        grid-template-columns: 1fr;
      }
      .tips-panel {
        padding: 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .kids-play-world,
      .cloud,
      .float-emoji,
      .float-piece,
      .buddy-avatar,
      .buddy-bubble,
      .title-buddy,
      .turn-pill,
      .check-badge,
      .frame-dots span,
      .result-emoji,
      .confetti {
        animation: none !important;
      }
    }
  `]
})
export class KidsGameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('boardElement', { static: true }) boardElement!: ElementRef;

  readonly language = inject(KidsLanguageService);
  private readonly engine = inject(StockfishEngineService);

  board!: Chessboard;
  chess = new Chess();
  playerColor: PlayerColor = 'w';
  difficulty: KidsDifficulty = 'easy';

  buddyThinking = false;
  buddyMessage = this.language.copy.game.buddy.welcome;
  isGameOver = false;
  gameOverResult: 'win' | 'loss' | 'draw' | '' = '';
  resultEmoji = '';
  resultTitle = '';
  resultText = '';
  inCheck = false;
  isMuted = false;

  moveHistory: string[] = [];
  confetti: BuddyConfetti[] = [];

  private pendingMove: { from: string; to: string } | null = null;
  private buddyTimeout: any = null;
  private hintTimeout: any = null;
  private hintArrow: { from: string; to: string } | null = null;
  private buddyState: BuddyState = 'welcome';
  private praiseIndex = 0;

  private engineSubs: Subscription[] = [];
  private engineFailed = false;
  private engineWaitDeadline = 0;
  private pendingEngineMove = false;
  private engineMoveFen = '';
  private engineFallbackTimeout: any = null;

  get game() {
    return this.language.copy.game;
  }

  get ui() {
    return this.language.copy;
  }

  get languages() {
    return this.language.languages;
  }

  get languageCode() {
    return this.language.languageCode;
  }

  get languageLabel() {
    return this.language.instructor.languageLabel;
  }

  get isPlayerTurn(): boolean {
    return !this.isGameOver && this.chess.turn() === this.playerColor;
  }

  get isBuddyTurn(): boolean {
    return !this.isGameOver && this.chess.turn() !== this.playerColor;
  }

  get playerColorLabel(): string {
    return this.playerColor === 'w' ? this.game.white : this.game.black;
  }

  private get difficultySettings(): DifficultyConfig {
    return KIDS_DIFFICULTIES[this.difficulty];
  }

  changeLanguage(code: string): void {
    if (!this.language.setLanguage(code)) return;
    if (this.isGameOver) {
      this.applyResultCopy();
    }
    this.buddyMessage = this.buddyText();
  }

  ngAfterViewInit(): void {
    this.initBoard();
    this.buildConfetti();
    void this.initEngine();
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.pendingEngineMove = false;
    this.engine.stop();
    this.engineSubs.forEach(sub => sub.unsubscribe());
    this.engineSubs = [];
    if (this.board) {
      try {
        this.board.destroy();
      } catch (_) {}
    }
  }

  /* ------------------- Board setup ------------------- */
  private initBoard(): void {
    if (this.board) {
      try {
        this.board.destroy();
      } catch (_) {}
    }

    this.board = new Chessboard(this.boardElement.nativeElement, {
      position: this.chess.fen(),
      orientation: this.playerColor === 'w' ? COLOR.white : COLOR.black,
      assetsUrl: '/assets/cm-chessboard/',
      style: {
        cssClass: 'kids',
        showCoordinates: true,
        borderType: BORDER_TYPE.none
      },
      responsive: true,
      extensions: [
        { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
        { class: Arrows }
      ]
    });

    this.setupMoveInput();
  }

  private setupMoveInput(): void {
    this.board.enableMoveInput((event: any) => {
      if (this.buddyThinking || this.isGameOver || !this.isPlayerTurn) {
        return false;
      }

      switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted: {
          if (!event.squareFrom) return false;
          const piece = this.chess.get(event.squareFrom as Square);
          if (!piece || piece.color !== this.playerColor) return false;

          const legalMoves = this.chess.moves({ square: event.squareFrom as Square, verbose: true });
          (this.board as any).removeLegalMovesMarkers?.();
          (this.board as any).addLegalMovesMarkers?.(legalMoves);
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
          (this.board as any).removeLegalMovesMarkers?.();
          const from = event.squareFrom || this.pendingMove?.from;
          const to = event.squareTo || this.pendingMove?.to;
          this.pendingMove = null;

          if (from && to) {
            this.makePlayerMove(from, to);
          }
          return true;
        }

        case INPUT_EVENT_TYPE.moveInputCanceled: {
          (this.board as any).removeLegalMovesMarkers?.();
          this.pendingMove = null;
          return true;
        }
      }

      return true;
    });
  }

  /* ------------------- Player moves ------------------- */
  private makePlayerMove(from: string, to: string): void {
    const legalMoves = this.chess.moves({ square: from as Square, verbose: true });
    const target = legalMoves.find(m => m.to === to);
    if (!target) {
      this.board.setPosition(this.chess.fen());
      return;
    }

    const move = this.chess.move({
      from,
      to,
      promotion: target.promotion ? 'q' : undefined
    });

    if (!move) {
      this.board.setPosition(this.chess.fen());
      return;
    }

    this.clearHint();
    this.moveHistory.push(move.san);
    this.board.setPosition(this.chess.fen(), true);
    this.playMoveSound(!!move.captured, this.chess.inCheck());
    this.updateCheckState();

    if (this.checkGameOver()) {
      return;
    }

    if (this.chess.inCheck()) {
      this.setBuddyState('checkPraise');
    } else if (move.captured) {
      this.setBuddyState('capturePraise');
    } else {
      this.showPraise();
    }

    this.scheduleBuddyMove();
  }

  /* ------------------- Chess Buddy / Stockfish ------------------- */
  private async initEngine(): Promise<void> {
    try {
      await this.engine.init();
      this.engineFailed = false;
      this.engine.newGame();
      this.applyDifficultyToEngine();

      this.engineSubs.push(
        this.engine.status.subscribe(status => {
          if (status === 'error') {
            this.engineFailed = true;
          }
        })
      );

      this.engineSubs.push(
        this.engine.bestMove.subscribe(bestMove => this.onEngineBestMove(bestMove.move))
      );
    } catch (error) {
      console.error('Kids Stockfish failed to start:', error);
      this.engineFailed = true;
    }
  }

  private applyDifficultyToEngine(): void {
    if (!this.engine.isReady()) return;
    this.engine.setSkillLevel(this.difficultySettings.skill);
  }

  private scheduleBuddyMove(delay = 700 + Math.random() * 800): void {
    if (this.isGameOver || !this.isBuddyTurn) return;

    if (this.buddyTimeout) {
      clearTimeout(this.buddyTimeout);
      this.buddyTimeout = null;
    }

    this.buddyThinking = true;
    this.setBuddyState('thinking');

    this.buddyTimeout = setTimeout(() => {
      this.buddyTimeout = null;
      this.makeBuddyMove();
    }, delay);
  }

  private makeBuddyMove(): void {
    if (this.isGameOver || !this.isBuddyTurn) {
      this.buddyThinking = false;
      return;
    }

    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) {
      this.buddyThinking = false;
      this.checkGameOver();
      return;
    }

    // Give the WASM engine a moment to finish loading on the first move.
    if (!this.engine.isReady() && !this.engineFailed) {
      if (this.engineWaitDeadline === 0) {
        this.engineWaitDeadline = Date.now() + 2500;
      }
      if (Date.now() < this.engineWaitDeadline) {
        this.buddyTimeout = setTimeout(() => {
          this.buddyTimeout = null;
          this.makeBuddyMove();
        }, 150);
        return;
      }
    }

    this.engineWaitDeadline = 0;

    if (this.engine.isReady()) {
      this.requestEngineMove();
    } else {
      this.makeRandomBuddyMove(moves);
    }
  }

  private requestEngineMove(): void {
    const fen = this.chess.fen();
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) {
      this.buddyThinking = false;
      this.checkGameOver();
      return;
    }

    this.applyDifficultyToEngine();
    this.engine.setPosition(fen);
    this.pendingEngineMove = true;
    this.engineMoveFen = fen;
    this.clearEngineFallback();

    this.engineFallbackTimeout = setTimeout(() => {
      if (!this.pendingEngineMove) return;
      this.pendingEngineMove = false;
      this.engine.stop();
      this.makeRandomBuddyMove();
    }, 7000);

    this.engine.go({ depth: this.difficultySettings.depth });
  }

  private onEngineBestMove(uciMove: string): void {
    if (!this.pendingEngineMove || this.isGameOver || !this.isBuddyTurn) {
      return;
    }

    // Ignore a late reply for a position that has already been undone or reset.
    if (this.engineMoveFen !== this.chess.fen()) {
      return;
    }

    this.pendingEngineMove = false;
    this.clearEngineFallback();

    if (!uciMove || uciMove === '(none)') {
      this.makeRandomBuddyMove();
      return;
    }

    try {
      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      const promotion = uciMove.length > 4 ? uciMove.charAt(4) : undefined;
      const move = this.chess.move({ from, to, promotion });

      if (!move) {
        this.makeRandomBuddyMove();
        return;
      }

      this.finishBuddyMove(move);
    } catch (error) {
      console.error('Invalid kids Stockfish move:', uciMove, error);
      this.makeRandomBuddyMove();
    }
  }

  private makeRandomBuddyMove(moves?: any[]): void {
    if (this.isGameOver || !this.isBuddyTurn) {
      this.buddyThinking = false;
      return;
    }

    const legalMoves = moves ?? this.chess.moves({ verbose: true });
    if (legalMoves.length === 0) {
      this.buddyThinking = false;
      this.checkGameOver();
      return;
    }

    const chosen = this.chooseBuddyMove(legalMoves);
    const move = this.chess.move({
      from: chosen.from,
      to: chosen.to,
      promotion: chosen.promotion ? 'q' : undefined
    });

    this.buddyThinking = false;

    if (!move) {
      this.board.setPosition(this.chess.fen());
      return;
    }

    this.finishBuddyMove(move);
  }

  private finishBuddyMove(move: any): void {
    this.buddyThinking = false;
    this.moveHistory.push(move.san);
    this.board.setPosition(this.chess.fen(), true);
    this.playMoveSound(!!move.captured, this.chess.inCheck());
    this.updateCheckState();

    if (this.checkGameOver()) {
      return;
    }

    if (this.chess.inCheck()) {
      this.setBuddyState('buddyCheck');
    } else if (move.captured) {
      this.setBuddyState('buddyCapture');
    } else {
      this.setBuddyState('yourTurn');
    }
  }

  /**
   * Fallback for browsers where the engine cannot start. The bot gets a
   * little sharper at higher levels, but stays beatable by young beginners.
   */
  private chooseBuddyMove(moves: any[]): any {
    const interesting = moves.filter(m => m.captured || m.san.includes('+'));
    const chance = this.difficulty === 'hard' ? 0.75 : this.difficulty === 'medium' ? 0.45 : 0.2;

    if (interesting.length > 0 && Math.random() < chance) {
      return interesting[Math.floor(Math.random() * interesting.length)];
    }

    return moves[Math.floor(Math.random() * moves.length)];
  }

  /* ------------------- Hints ------------------- */
  showHint(): void {
    if (!this.isPlayerTurn || this.buddyThinking || this.isGameOver) {
      return;
    }

    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return;

    const goodMoves = moves.filter(m => m.captured || m.san.includes('+'));
    const move = goodMoves.length > 0 && Math.random() < 0.6
      ? goodMoves[Math.floor(Math.random() * goodMoves.length)]
      : moves[Math.floor(Math.random() * moves.length)];

    this.clearHint();
    this.hintArrow = { from: move.from, to: move.to };

    if ((this.board as any).addArrow) {
      (this.board as any).addArrow(ARROW_TYPE.default, move.from, move.to);
    }

    this.setBuddyState('hint');
    this.hintTimeout = setTimeout(() => this.clearHint(), 3500);
  }

  private clearHint(): void {
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
    if (this.hintArrow && (this.board as any)?.removeArrows) {
      (this.board as any).removeArrows();
    }
    this.hintArrow = null;
  }

  /* ------------------- Controls ------------------- */
  chooseColor(color: PlayerColor): void {
    if (this.playerColor === color) return;

    this.playerColor = color;
    this.board.setOrientation(color === 'w' ? COLOR.white : COLOR.black);
    this.newGame();
  }

  setDifficulty(level: KidsDifficulty): void {
    if (this.difficulty === level) return;

    this.difficulty = level;
    this.applyDifficultyToEngine();

    if (this.isBuddyTurn && !this.isGameOver) {
      this.clearTimers();
      this.pendingEngineMove = false;
      this.engine.stop();
      this.engineWaitDeadline = 0;
      this.buddyThinking = false;
      this.scheduleBuddyMove(250);
    }
  }

  newGame(): void {
    this.clearTimers();
    this.clearHint();
    this.pendingEngineMove = false;
    this.engineWaitDeadline = 0;
    this.engine.stop();

    this.chess.reset();
    this.moveHistory = [];
    this.buddyThinking = false;
    this.isGameOver = false;
    this.gameOverResult = '';
    this.resultEmoji = '';
    this.resultTitle = '';
    this.resultText = '';
    this.inCheck = false;
    this.setBuddyState('newGame');

    this.board.setPosition(this.chess.fen());
    if ((this.board as any).removeArrows) {
      (this.board as any).removeArrows();
    }

    this.engine.newGame();
    this.applyDifficultyToEngine();

    if (this.playerColor === 'b') {
      this.scheduleBuddyMove(500);
    }
  }

  undoMove(): void {
    if (this.moveHistory.length === 0) return;

    this.clearTimers();
    this.clearHint();
    this.pendingEngineMove = false;
    this.engineWaitDeadline = 0;
    this.engine.stop();
    this.buddyThinking = false;
    this.isGameOver = false;
    this.gameOverResult = '';

    // Undo the buddy reply plus the player's move, or just the player's move
    // while the buddy is still thinking.
    const plies = this.isPlayerTurn ? 2 : 1;
    for (let i = 0; i < plies && this.chess.history().length > 0; i++) {
      this.chess.undo();
      this.moveHistory.pop();
    }

    this.board.setPosition(this.chess.fen(), true);
    this.updateCheckState();

    if (this.isBuddyTurn) {
      this.scheduleBuddyMove(400);
    } else {
      this.setBuddyState('undo');
    }
  }

  toggleSound(): void {
    this.isMuted = !this.isMuted;
  }

  /* ------------------- Game state ------------------- */
  private updateCheckState(): void {
    this.inCheck = this.chess.inCheck() && this.chess.turn() === this.playerColor;
  }

  private checkGameOver(): boolean {
    if (!this.chess.isGameOver()) {
      return false;
    }

    this.isGameOver = true;
    this.buddyThinking = false;
    this.pendingEngineMove = false;
    this.engineWaitDeadline = 0;
    this.engine.stop();
    this.clearTimers();

    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'b' : 'w';
      if (winner === this.playerColor) {
        this.gameOverResult = 'win';
        this.resultEmoji = '🏆';
        this.applyResultCopy();
        this.setBuddyState('win');
        this.playVictorySound();
        this.buildConfetti();
      } else {
        this.gameOverResult = 'loss';
        this.resultEmoji = '🙂';
        this.applyResultCopy();
        this.setBuddyState('loss');
      }
    } else {
      this.gameOverResult = 'draw';
      this.resultEmoji = '🤝';
      this.applyResultCopy();
      this.setBuddyState('draw');
    }

    return true;
  }

  private applyResultCopy(): void {
    const results = this.game.results;
    switch (this.gameOverResult) {
      case 'win':
        this.resultTitle = results.winTitle;
        this.resultText = results.winText;
        break;
      case 'loss':
        this.resultTitle = results.lossTitle;
        this.resultText = results.lossText;
        break;
      case 'draw':
        this.resultTitle = results.drawTitle;
        this.resultText = results.drawText;
        break;
      default:
        this.resultTitle = '';
        this.resultText = '';
    }
  }

  private setBuddyState(state: BuddyState): void {
    this.buddyState = state;
    this.buddyMessage = this.buddyText();
  }

  private showPraise(): void {
    const praise = this.game.buddy.praise;
    this.praiseIndex = Math.floor(Math.random() * praise.length);
    this.setBuddyState('praise');
  }

  private buddyText(): string {
    const buddy = this.game.buddy;
    const results = this.game.results;
    switch (this.buddyState) {
      case 'newGame':
        return buddy.newGame;
      case 'thinking':
        return buddy.thinking;
      case 'checkPraise':
        return buddy.checkPraise;
      case 'capturePraise':
        return buddy.capturePraise;
      case 'praise':
        return buddy.praise[this.praiseIndex] ?? buddy.praise[0] ?? buddy.welcome;
      case 'buddyCheck':
        return buddy.buddyCheck;
      case 'buddyCapture':
        return buddy.buddyCapture;
      case 'yourTurn':
        return buddy.yourTurn;
      case 'hint':
        return buddy.hint;
      case 'undo':
        return buddy.undo;
      case 'win':
        return results.winMessage;
      case 'loss':
        return results.lossMessage;
      case 'draw':
        return results.drawMessage;
      default:
        return buddy.welcome;
    }
  }

  private buildConfetti(): void {
    const colors = ['#f472b6', '#facc15', '#34d399', '#60a5fa', '#a78bfa', '#fb923c'];
    this.confetti = Array.from({ length: 28 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 1.6 + Math.random() * 1.6,
      color: colors[i % colors.length]
    }));
  }

  /* ------------------- Tiny WebAudio sounds ------------------- */
  private playMoveSound(isCapture: boolean, isCheck: boolean): void {
    if (this.isMuted) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (isCheck) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.09);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (isCapture) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.07);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (_) {}
  }

  private playVictorySound(): void {
    if (this.isMuted) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.13);
      osc.frequency.setValueAtTime(783.99, now + 0.26);
      osc.frequency.setValueAtTime(1046.5, now + 0.39);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } catch (_) {}
  }

  private clearEngineFallback(): void {
    if (this.engineFallbackTimeout) {
      clearTimeout(this.engineFallbackTimeout);
      this.engineFallbackTimeout = null;
    }
  }

  private clearTimers(): void {
    if (this.buddyTimeout) {
      clearTimeout(this.buddyTimeout);
      this.buddyTimeout = null;
    }
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
    this.clearEngineFallback();
  }
}
