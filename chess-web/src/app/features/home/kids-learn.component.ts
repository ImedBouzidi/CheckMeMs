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

import { KidsPiecePopupComponent } from './kids-piece-popup.component';
import { KID_PIECES, KidPiece } from './kids-piece.model';
import { InstructorCopy, InstructorLanguage } from './kids-learn.i18n';
import { KidsLanguageService } from './kids-language.service';

interface PracticeSetup {
  start: Square;
  captures: Square[];
}

interface MoveFeedback {
  kind: 'good' | 'wrong';
  title: string;
  message: string;
}

const LEARN_MOVE_MARKER = { class: 'marker-learn-move', slice: 'markerSquare' };
const LEARN_CAPTURE_MARKER = { class: 'marker-learn-capture', slice: 'markerSquare' };

@Component({
  selector: 'app-kids-learn',
  standalone: true,
  imports: [RouterLink, KidsPiecePopupComponent],
  template: `
    <div class="learn-world">
      <!-- Playful background -->
      <div class="learn-sky" aria-hidden="true">
        <span class="sky-emoji se1">⭐</span>
        <span class="sky-emoji se2">✨</span>
        <span class="sky-emoji se3">☁️</span>
        <span class="sky-emoji se4">🎈</span>
        <img class="sky-piece sp1" src="assets/chess-pieces/wB.svg" alt="" />
        <img class="sky-piece sp2" src="assets/chess-pieces/bR.svg" alt="" />
        <img class="sky-piece sp3" src="assets/chess-pieces/wQ.svg" alt="" />
      </div>

      <!-- Header -->
      <header class="learn-header">
        <a class="home-pill" routerLink="/kids">
          <span>🏠</span> {{ ui.common.kidsHome }}
        </a>
        <div class="learn-title">
          <span class="title-icon">🧩</span>
          <span>{{ ui.learn.pageTitlePrefix }} <strong>{{ ui.learn.pageTitleStrong }}</strong></span>
        </div>
        <div class="header-actions">
          <label class="language-picker">
            <span aria-hidden="true">🌍</span>
            <span class="language-label">{{ copy.languageLabel }}</span>
            <select
              #languageSelect
              class="language-select"
              [value]="languageCode"
              [attr.aria-label]="copy.languageLabel"
              (change)="changeLanguage(languageSelect.value)">
              @for (language of languages; track language.code) {
                <option [value]="language.code" [selected]="language.code === languageCode">
                  {{ language.name }}
                </option>
              }
            </select>
          </label>
          <button class="clear-pill" (click)="clearBoard()">
            <span>🧹</span> {{ ui.learn.clearBoard }}
          </button>
        </div>
      </header>

      <main class="learn-stage">
        <!-- Board -->
        <section class="board-panel">
          <div class="coach-row">
            <div class="coach-avatar" [class.talking]="isSpeaking" aria-hidden="true">
              🦉
              <span class="coach-dot"></span>
            </div>
            <div class="coach-main">
              <div class="coach-meta">
                <span class="coach-name">{{ copy.coachName }}</span>
                <button
                  class="voice-toggle"
                  type="button"
                  (click)="toggleVoice()"
                  [attr.aria-label]="voiceEnabled ? ui.learn.voiceOnLabel : ui.learn.voiceOffLabel"
                  [attr.title]="voiceEnabled ? ui.learn.voiceOnTitle : ui.learn.voiceOffTitle">
                  {{ voiceEnabled ? '🔊' : '🔇' }}
                </button>
              </div>
              <div class="coach-bubble">
                <span
                  class="coach-text"
                  [attr.dir]="activeLanguage.dir"
                  [attr.lang]="activeLanguage.speechLang">{{ hint }}</span>
                <button
                  class="speak-btn"
                  type="button"
                  (click)="sayHint()"
                  [attr.aria-label]="ui.learn.hearAgain"
                  [attr.title]="ui.learn.sayAgain">
                  🔊
                </button>
              </div>
            </div>
          </div>

          @if (practicePiece) {
            <div class="legend-row">
              <span class="legend-chip move">
                <span class="legend-swatch move"></span> {{ ui.learn.moveSquares }}
              </span>
              <span class="legend-chip capture">
                <span class="legend-swatch capture"></span> {{ ui.learn.captureSquares }}
              </span>
              <span class="legend-chip count">
                {{ ui.learn.possibleSquares(possibleSquares) }}
              </span>
            </div>
          }

          <div class="board-frame" [class.try-active]="practicePiece">
            <div class="frame-sparkles" aria-hidden="true">
              <span></span><span></span><span></span><span></span>
            </div>
            <div #boardElement class="learn-board"></div>
          </div>

          <div class="practice-bar">
            @if (practicePiece) {
              <span class="practice-chip">
                <img
                  [src]="'assets/chess-pieces/' + practicePiece.image + '.svg'"
                  [alt]="pieceLabel(practicePiece)" />
                {{ ui.learn.practicing(pieceLabel(practicePiece)) }}
              </span>
              <button class="small-clear-btn" (click)="clearBoard()">{{ ui.learn.clear }}</button>
            } @else {
              <span class="practice-chip empty">{{ ui.learn.emptyPick }}</span>
            }
          </div>
        </section>

        <!-- Piece sidebar -->
        <aside class="piece-sidebar">
          <h2>{{ ui.learn.allPieces }}</h2>
          <p>{{ ui.learn.allPiecesSub }}</p>

          <div class="sidebar-list">
            @for (piece of pieces; track piece.name; let i = $index) {
              <button
                class="sidebar-piece"
                [class.active]="practicePiece?.name === piece.name"
                [style.--piece-color]="piece.color"
                [style.animation-delay.ms]="i * 70"
                (click)="openPiece(piece)">
                <span class="piece-thumb">
                  <img [src]="'assets/chess-pieces/' + piece.image + '.svg'" [alt]="pieceLabel(piece)" />
                </span>
                <span class="piece-info">
                  <strong>{{ pieceLabel(piece) }}</strong>
                  <small>{{ piece.emoji }} {{ ui.learn.tapToLearn }}</small>
                </span>
                <span class="piece-go">›</span>
              </button>
            }
          </div>

          <div class="sidebar-note">
            <span>💡</span>
            <p>{{ ui.learn.sidebarNote(copy.coachName) }}</p>
          </div>
        </aside>
      </main>

      <footer class="learn-footer">
        <span>{{ ui.learn.footer }}</span>
        <a routerLink="/">{{ ui.common.backToNormalHome }}</a>
      </footer>

      <app-kids-piece-popup
        [piece]="selectedPiece"
        [showTryMe]="true"
        (closed)="closePiece()"
        (tryMe)="tryPiece($event)" />

      @if (feedback) {
        <div
          class="feedback-dialogue"
          [class.good]="feedback.kind === 'good'"
          [class.wrong]="feedback.kind === 'wrong'"
          role="alert"
          aria-live="assertive">
          <span class="feedback-emoji">{{ feedback.kind === 'good' ? '🌟' : '🙈' }}</span>
          <div class="feedback-copy" [attr.dir]="activeLanguage.dir" [attr.lang]="activeLanguage.speechLang">
            <strong>{{ feedback.title }}</strong>
            <span>{{ feedback.message }}</span>
          </div>
          <button class="feedback-close" type="button" (click)="dismissFeedback()" [attr.aria-label]="ui.learn.closeMessage">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .learn-world {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      color: #1e293b;
      background: linear-gradient(145deg, #eef2ff 0%, #fdf2f8 55%, #ecfeff 100%);
    }

    /* ---- Background ---- */
    .learn-sky {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }

    .sky-emoji {
      position: absolute;
      font-size: 28px;
      opacity: 0.65;
      animation: sky-float 7s ease-in-out infinite;
    }
    .se1 { top: 12%; left: 5%; }
    .se2 { top: 46%; right: 6%; animation-delay: 1.2s; font-size: 22px; }
    .se3 { bottom: 16%; left: 9%; animation-delay: 2.4s; font-size: 34px; }
    .se4 { top: 72%; right: 12%; animation-delay: 3.2s; }

    @keyframes sky-float {
      0%, 100% { transform: translateY(0) rotate(-6deg); }
      50% { transform: translateY(-18px) rotate(7deg); }
    }

    .sky-piece {
      position: absolute;
      width: 48px;
      height: 48px;
      opacity: 0.2;
      animation: sky-piece-drift 11s ease-in-out infinite;
    }
    .sp1 { top: 20%; right: 3%; }
    .sp2 { bottom: 28%; left: 3%; animation-delay: 2s; }
    .sp3 { top: 58%; right: 18%; width: 38px; height: 38px; animation-delay: 3.5s; }

    @keyframes sky-piece-drift {
      0%, 100% { transform: translateY(0) rotate(-9deg); }
      50% { transform: translateY(-20px) rotate(9deg); }
    }

    /* ---- Header ---- */
    .learn-header {
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
    .clear-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-weight: 800;
      font-size: 0.95rem;
      text-decoration: none;
      padding: 10px 16px;
      border-radius: 999px;
      box-shadow: 0 4px 0 rgba(148, 163, 184, 0.35);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .home-pill {
      color: #7c2d12;
      background: #ffffff;
    }

    .clear-pill {
      color: #9d174d;
      background: #fce7f3;
    }

    .home-pill:hover,
    .clear-pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 0 rgba(148, 163, 184, 0.35);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
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

    .language-picker .language-label {
      white-space: nowrap;
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

    .learn-title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      box-shadow: 0 4px 0 rgba(196, 181, 253, 0.6);
      font-size: 1.2rem;
      font-weight: 700;
    }

    .learn-title strong {
      background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .title-icon {
      font-size: 1.45rem;
      animation: title-wiggle 2.6s ease-in-out infinite;
    }

    @keyframes title-wiggle {
      0%, 100% { transform: rotate(-6deg) scale(1); }
      50% { transform: rotate(6deg) scale(1.12); }
    }

    /* ---- Stage ---- */
    .learn-stage {
      position: relative;
      z-index: 5;
      max-width: 1180px;
      margin: 0 auto;
      padding: 26px 22px 40px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 26px;
      align-items: start;
    }

    .board-panel {
      min-width: 0;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    }

    /* ---- Instructor ---- */
    .coach-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .coach-avatar {
      position: relative;
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      display: grid;
      place-items: center;
      font-size: 2rem;
      border-radius: 50%;
      background: linear-gradient(145deg, #a5f3fc, #bae6fd);
      box-shadow: 0 6px 0 #38bdf8, 0 10px 18px -8px rgba(56, 189, 248, 0.65);
      animation: coach-bob 2.8s ease-in-out infinite;
    }

    .coach-avatar.talking {
      animation: coach-talk 0.34s ease-in-out infinite;
    }

    @keyframes coach-bob {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50% { transform: translateY(-6px) rotate(2deg); }
    }

    @keyframes coach-talk {
      0%, 100% { transform: translateY(0) scale(1) rotate(-3deg); }
      50% { transform: translateY(-4px) scale(1.07) rotate(3deg); }
    }

    .coach-dot {
      position: absolute;
      right: 3px;
      bottom: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid #ffffff;
    }

    .coach-main {
      flex: 1;
      min-width: 0;
    }

    .coach-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 4px 6px;
    }

    .coach-name {
      font-size: 0.76rem;
      font-weight: 900;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: #0369a1;
    }

    .voice-toggle {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 0.9rem;
      background: #e0f2fe;
      box-shadow: 0 2px 0 #bae6fd;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .voice-toggle:hover {
      transform: scale(1.1);
      background: #bae6fd;
    }

    .coach-bubble {
      min-height: 58px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px 12px 18px;
      border: 3px solid #bae6fd;
      border-radius: 20px 20px 20px 6px;
      background: #ffffff;
      box-shadow: 0 6px 0 rgba(125, 211, 252, 0.45);
      color: #0369a1;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.35;
      animation: coach-bubble-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .coach-text {
      flex: 1;
      min-width: 0;
    }

    .speak-btn {
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
      background: #e0f2fe;
      box-shadow: 0 2px 0 #bae6fd;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .speak-btn:hover {
      transform: scale(1.1) rotate(-6deg);
      background: #bae6fd;
    }

    @keyframes coach-bubble-pop {
      0% { transform: scale(0.95); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* ---- Possible-square legend ---- */
    .legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin: 0 0 12px 72px;
      animation: coach-bubble-pop 0.35s ease;
    }

    .legend-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 999px;
      border: 2px solid #ffffff;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 3px 0 rgba(148, 163, 184, 0.22);
      font-size: 0.76rem;
      font-weight: 800;
      color: #475569;
    }

    .legend-chip.move {
      color: #15803d;
    }

    .legend-chip.capture {
      color: #be185d;
    }

    .legend-chip.count {
      color: #6d28d9;
      background: #f5f3ff;
    }

    .legend-swatch {
      width: 14px;
      height: 14px;
      border-radius: 4px;
    }

    .legend-swatch.move {
      background: #22c55e;
      opacity: 0.7;
    }

    .legend-swatch.capture {
      background: #ec4899;
      opacity: 0.75;
    }

    /* ---- Board frame ---- */
    .board-frame {
      position: relative;
      padding: 14px;
      border-radius: 30px;
      background: linear-gradient(145deg, #bae6fd, #c4b5fd 48%, #fbcfe8);
      box-shadow: 0 12px 0 #a78bfa, 0 26px 45px -18px rgba(139, 92, 246, 0.65);
      transition: box-shadow 0.3s ease;
    }

    .board-frame.try-active {
      box-shadow: 0 12px 0 #34d399, 0 26px 45px -18px rgba(16, 185, 129, 0.65);
      animation: frame-glow-learn 2s ease-in-out infinite;
    }

    @keyframes frame-glow-learn {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.05); }
    }

    .frame-sparkles span {
      position: absolute;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.9);
      animation: sparkle-twinkle 2.4s ease-in-out infinite;
    }
    .frame-sparkles span:nth-child(1) { top: 8px; left: 20px; }
    .frame-sparkles span:nth-child(2) { top: 8px; right: 20px; animation-delay: 0.6s; }
    .frame-sparkles span:nth-child(3) { bottom: 8px; left: 20px; animation-delay: 1.2s; }
    .frame-sparkles span:nth-child(4) { bottom: 8px; right: 20px; animation-delay: 1.8s; }

    @keyframes sparkle-twinkle {
      0%, 100% { opacity: 0.35; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.15); }
    }

    .learn-board {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 18px;
      overflow: hidden;
      background: #fff7cc;
      box-shadow: inset 0 0 0 4px #ffffff;
    }

    /* ---- Practice info ---- */
    .practice-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 14px;
      min-height: 50px;
    }

    .practice-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.85);
      border: 3px solid #ffffff;
      box-shadow: 0 5px 0 rgba(167, 243, 208, 0.7);
      color: #14532d;
      font-weight: 800;
      font-size: 0.95rem;
    }

    .practice-chip img {
      width: 30px;
      height: 30px;
    }

    .practice-chip.empty {
      color: #64748b;
      box-shadow: 0 5px 0 rgba(226, 232, 240, 0.9);
      font-weight: 700;
    }

    .small-clear-btn {
      margin-left: auto;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-weight: 800;
      font-size: 0.9rem;
      color: #9d174d;
      background: #fce7f3;
      padding: 9px 16px;
      border-radius: 999px;
      box-shadow: 0 4px 0 #fbcfe8;
      transition: transform 0.14s ease;
    }

    .small-clear-btn:hover {
      transform: translateY(-2px);
    }

    /* ---- Sidebar ---- */
    .piece-sidebar {
      position: sticky;
      top: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      border: 3px solid #ffffff;
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 10px 0 rgba(224, 231, 255, 0.9), 0 22px 40px -22px rgba(99, 102, 241, 0.45);
      backdrop-filter: blur(6px);
    }

    .piece-sidebar h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #1e293b;
    }

    .piece-sidebar > p {
      margin: 0 0 6px;
      color: #64748b;
      font-size: 0.86rem;
      line-height: 1.4;
    }

    .sidebar-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .sidebar-piece {
      --piece-color: #bbf7d0;
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      text-align: left;
      font-family: inherit;
      cursor: pointer;
      border: 3px solid #ffffff;
      border-radius: 18px;
      padding: 9px 12px 9px 9px;
      background: linear-gradient(135deg, #ffffff, var(--piece-color));
      box-shadow: 0 5px 0 rgba(148, 163, 184, 0.3);
      transition: transform 0.16s ease, box-shadow 0.16s ease;
      animation: piece-slide-in 0.45s ease both;
    }

    @keyframes piece-slide-in {
      0% { transform: translateX(20px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }

    .sidebar-piece:hover {
      transform: translateY(-3px) translateX(-2px);
      box-shadow: 0 8px 0 rgba(148, 163, 184, 0.3);
    }

    .sidebar-piece.active {
      border-color: #34d399;
      box-shadow: 0 6px 0 #34d399, 0 0 0 3px rgba(52, 211, 153, 0.22);
      transform: translateY(-2px);
    }

    .piece-thumb {
      flex-shrink: 0;
      width: 46px;
      height: 46px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.7);
    }

    .piece-thumb img {
      width: 38px;
      height: 38px;
      filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.18));
      transition: transform 0.16s ease;
    }

    .sidebar-piece:hover .piece-thumb img {
      transform: scale(1.1) rotate(-5deg);
    }

    .piece-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .piece-info strong {
      font-size: 1rem;
      color: #1e293b;
    }

    .piece-info small {
      font-size: 0.76rem;
      font-weight: 700;
      color: #64748b;
    }

    .piece-go {
      margin-left: auto;
      font-size: 1.5rem;
      font-weight: 800;
      color: #94a3b8;
      transition: transform 0.16s ease, color 0.16s ease;
    }

    .sidebar-piece:hover .piece-go {
      color: #8b5cf6;
      transform: translateX(3px);
    }

    .sidebar-note {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin-top: 4px;
      padding: 12px;
      border-radius: 16px;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .sidebar-note span {
      font-size: 1.2rem;
      line-height: 1;
    }

    .sidebar-note p {
      margin: 0;
    }

    /* ---- Good move / wrong move dialogue ---- */
    .feedback-dialogue {
      position: fixed;
      left: 50%;
      bottom: 22px;
      z-index: 1200;
      width: min(470px, calc(100vw - 28px));
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 14px 14px 16px;
      border: 3px solid #ffffff;
      border-radius: 22px;
      transform: translateX(-50%);
      animation: feedback-pop 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .feedback-dialogue.good {
      background: linear-gradient(135deg, #dcfce7, #bbf7d0);
      color: #14532d;
      box-shadow: 0 7px 0 #86efac, 0 20px 35px -15px rgba(22, 163, 74, 0.55);
    }

    .feedback-dialogue.wrong {
      background: linear-gradient(135deg, #ffe4e6, #fecdd3);
      color: #881337;
      box-shadow: 0 7px 0 #fda4af, 0 20px 35px -15px rgba(225, 29, 72, 0.5);
    }

    @keyframes feedback-pop {
      0% { transform: translate(-50%, 22px) scale(0.9); opacity: 0; }
      100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
    }

    .feedback-emoji {
      flex-shrink: 0;
      font-size: 1.85rem;
      line-height: 1;
    }

    .feedback-copy {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .feedback-copy strong {
      font-size: 1.06rem;
      font-weight: 900;
    }

    .feedback-copy span {
      font-size: 0.87rem;
      line-height: 1.3;
      font-weight: 600;
    }

    .feedback-close {
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 900;
      color: inherit;
      background: rgba(255, 255, 255, 0.7);
      transition: transform 0.15s ease;
    }

    .feedback-close:hover {
      transform: rotate(90deg) scale(1.08);
    }

    /* ---- Footer ---- */
    .learn-footer {
      position: relative;
      z-index: 5;
      max-width: 1180px;
      margin: 0 auto;
      padding: 0 22px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      color: #64748b;
      font-size: 0.9rem;
    }

    .learn-footer a {
      color: #7c3aed;
      font-weight: 700;
      text-decoration: none;
    }

    .learn-footer a:hover {
      text-decoration: underline;
    }

    /* ---- Responsive ---- */
    @media (max-width: 980px) {
      .learn-stage {
        grid-template-columns: 1fr;
        max-width: 740px;
      }
      .piece-sidebar {
        position: static;
      }
      .sidebar-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 600px) {
      .learn-header {
        justify-content: center;
        padding-top: 12px;
      }
      .learn-title {
        order: -1;
        width: 100%;
        justify-content: center;
      }
      .learn-stage {
        padding: 18px 12px 30px;
        gap: 18px;
      }
      .coach-bubble {
        font-size: 0.9rem;
        min-height: 52px;
        padding: 10px 14px;
      }
      .coach-avatar {
        width: 50px;
        height: 50px;
        font-size: 1.7rem;
      }
      .legend-row {
        margin: 0 0 12px;
      }
      .feedback-dialogue {
        bottom: 14px;
        padding: 12px;
      }
      .feedback-emoji {
        font-size: 1.55rem;
      }
      .feedback-copy strong {
        font-size: 1rem;
      }
      .feedback-copy span {
        font-size: 0.8rem;
      }
      .board-frame {
        padding: 9px;
        border-radius: 22px;
      }
      .practice-bar {
        flex-wrap: wrap;
      }
      .sidebar-list {
        grid-template-columns: 1fr;
      }
      .piece-sidebar {
        padding: 16px;
      }
      .learn-footer {
        justify-content: center;
        text-align: center;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .sky-emoji,
      .sky-piece,
      .title-icon,
      .coach-avatar,
      .coach-avatar.talking,
      .coach-bubble,
      .legend-row,
      .feedback-dialogue,
      .frame-sparkles span,
      .board-frame.try-active,
      .sidebar-piece {
        animation: none !important;
      }
    }
  `]
})
export class KidsLearnComponent implements AfterViewInit, OnDestroy {
  @ViewChild('boardElement', { static: true }) boardElement!: ElementRef;

  board!: Chessboard;
  chess = new Chess();

  readonly pieces = KID_PIECES;
  readonly language = inject(KidsLanguageService);
  selectedPiece: KidPiece | null = null;
  practicePiece: KidPiece | null = null;
  practiceSquare: Square | null = null;
  possibleSquares = 0;
  feedback: MoveFeedback | null = null;
  voiceEnabled = true;
  isSpeaking = false;
  hint = this.copy.welcome;

  get languages() {
    return this.language.languages;
  }

  get languageCode() {
    return this.language.languageCode;
  }

  get copy(): InstructorCopy {
    return this.language.instructor;
  }

  get ui() {
    return this.language.copy;
  }

  get activeLanguage(): InstructorLanguage {
    return this.language.activeLanguage;
  }

  readonly speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  private boardIsCleared = false;
  private pendingMove: { from: string; to: string } | null = null;
  private markerTimeout: any = null;
  private feedbackTimeout: any = null;
  private speechTimeout: any = null;
  private speechToken = 0;
  private voices: SpeechSynthesisVoice[] = [];
  private audioFallback: HTMLAudioElement | null = null;
  private readonly onVoicesChanged = () => this.refreshVoices();

  private readonly practiceSetups: Record<string, PracticeSetup> = {
    Pawn: { start: 'd2', captures: ['c3', 'e3'] },
    Knight: { start: 'd4', captures: ['b5', 'f5'] },
    Bishop: { start: 'd4', captures: ['b2', 'f6'] },
    Rook: { start: 'd4', captures: ['d7', 'g4'] },
    Queen: { start: 'd4', captures: ['d7', 'g7'] },
    King: { start: 'd4', captures: ['c4', 'e4'] }
  };

  ngAfterViewInit(): void {
    this.chess.clear();
    this.initBoard();
    this.initVoices();
  }

  ngOnDestroy(): void {
    if (this.markerTimeout) {
      clearTimeout(this.markerTimeout);
    }
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
    }
    if (this.speechSupported) {
      try {
        window.speechSynthesis.removeEventListener('voiceschanged', this.onVoicesChanged);
      } catch (_) {}
    }
    this.stopSpeaking();
    if (this.board) {
      try {
        this.board.destroy();
      } catch (_) {}
    }
  }

  /* ------------------- Board setup ------------------- */
  private initBoard(): void {
    this.board = new Chessboard(this.boardElement.nativeElement, {
      position: this.chess.fen(),
      orientation: COLOR.white,
      assetsUrl: '/assets/cm-chessboard/',
      style: {
        cssClass: 'kids kids-learn',
        showCoordinates: true,
        borderType: BORDER_TYPE.none
      },
      responsive: true,
      extensions: [
        { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
        { class: Arrows, props: { headSize: 7, offsetTo: 0.55 } }
      ]
    });

    this.setupMoveInput();
  }

  private setupMoveInput(): void {
    this.board.enableMoveInput((event: any) => {
      if (!this.practicePiece || !this.practiceSquare) {
        return false;
      }

      switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted: {
          if (!event.squareFrom) {
            return false;
          }

          if (event.squareFrom !== this.practiceSquare) {
            const otherPiece = this.chess.get(event.squareFrom as Square);
            if (otherPiece) {
              const pieceName = this.pieceName(this.practicePiece);
              const message = this.copy.wrongPieceMessage(pieceName);
              this.hint = message;
              this.showFeedback('wrong', this.copy.wrongPieceTitle, message);
            }
            return false;
          }

          const piece = this.chess.get(event.squareFrom as Square);
          if (!piece || piece.color !== 'w') {
            return false;
          }

          this.highlightPracticeMoves();
          return true;
        }

        case INPUT_EVENT_TYPE.validateMoveInput: {
          if (!event.squareFrom || !event.squareTo) return false;
          const legalMoves = this.chess.moves({ square: event.squareFrom as Square, verbose: true });
          const isValid = legalMoves.some(m => m.to === event.squareTo);
          if (isValid) {
            this.pendingMove = { from: event.squareFrom, to: event.squareTo };
          } else {
            this.hint = this.copy.wrongMoveShort;
            this.showFeedback('wrong', this.copy.wrongMoveTitle, this.copy.tryGlowing);
          }
          return isValid;
        }

        case INPUT_EVENT_TYPE.moveInputFinished: {
          this.clearMoveMarkers();
          const from = event.squareFrom || this.pendingMove?.from;
          const to = event.squareTo || this.pendingMove?.to;
          this.pendingMove = null;

          if (from && to) {
            this.makePracticeMove(from, to);
          }
          return true;
        }

        case INPUT_EVENT_TYPE.moveInputCanceled: {
          this.pendingMove = null;
          this.highlightPracticeMoves();
          return true;
        }
      }

      return true;
    });
  }

  /* ------------------- Practice ------------------- */
  openPiece(piece: KidPiece): void {
    this.stopSpeaking();
    this.dismissFeedback();
    this.selectedPiece = piece;
  }

  closePiece(): void {
    this.selectedPiece = null;
  }

  tryPiece(piece: KidPiece): void {
    this.selectedPiece = null;
    this.clearTimers();
    this.dismissFeedback();
    this.clearBoardMarkers();
    this.stopSpeaking();

    const setup = this.practiceSetups[piece.name];
    if (!setup) return;

    this.practicePiece = piece;
    this.boardIsCleared = false;
    this.possibleSquares = 0;
    this.chess.clear();
    this.chess.put({ type: this.pieceType(piece) as any, color: 'w' }, setup.start);
    for (const square of setup.captures) {
      this.chess.put({ type: 'p', color: 'b' }, square);
    }

    this.practiceSquare = setup.start;
    this.hint = this.practiceInstruction();
    this.board.setPosition(this.chess.fen(), true);

    this.markerTimeout = setTimeout(() => this.highlightPracticeMoves(), 300);
    this.speak(this.hint);
  }

  clearBoard(): void {
    this.clearTimers();
    this.clearBoardMarkers();
    this.stopSpeaking();

    this.chess.clear();
    this.practicePiece = null;
    this.practiceSquare = null;
    this.possibleSquares = 0;
    this.pendingMove = null;
    this.boardIsCleared = true;
    this.hint = this.copy.emptyBoard;
    this.dismissFeedback();

    this.board.setPosition(this.chess.fen(), true);
  }

  private makePracticeMove(from: string, to: string): void {
    const legalMoves = this.chess.moves({ square: from as Square, verbose: true });
    const target = legalMoves.find(m => m.to === to);
    if (!target) {
      this.board.setPosition(this.chess.fen());
      this.hint = this.copy.wrongMoveShort;
      this.showFeedback('wrong', this.copy.wrongMoveTitle, this.copy.tryGlowing);
      this.highlightPracticeMoves();
      return;
    }

    const move = this.chess.move({
      from,
      to,
      promotion: target.promotion ? 'q' : undefined
    });

    if (!move) {
      this.board.setPosition(this.chess.fen());
      this.hint = this.copy.wrongMoveShort;
      this.showFeedback('wrong', this.copy.wrongMoveTitle, this.copy.tryGlowing);
      return;
    }

    // Keep it as White's turn forever, so kids can try as many moves as they like.
    this.chess.setTurn('w');
    this.practiceSquare = move.to as Square;
    this.board.setPosition(this.chess.fen(), true);

    const pieceName = this.practicePiece
      ? this.pieceName(this.practicePiece)
      : this.language.pieceName({ name: 'Pawn' });
    if (move.captured) {
      this.hint = this.copy.goodCaptureHint;
      this.showFeedback('good', this.copy.goodCaptureTitle, this.copy.goodCaptureMessage);
    } else {
      this.hint = this.copy.goodMoveHint;
      this.showFeedback('good', this.copy.goodMoveTitle, this.copy.goodMoveMessage(pieceName));
    }

    this.markerTimeout = setTimeout(() => this.highlightPracticeMoves(), 450);
  }

  private highlightPracticeMoves(): void {
    if (!this.board || !this.practiceSquare || !this.practicePiece) return;

    const legalMoves = this.chess.moves({ square: this.practiceSquare, verbose: true });
    const targets = new Map<string, boolean>();
    for (const move of legalMoves) {
      const isCapture = !!move.captured || !!this.chess.get(move.to as Square);
      targets.set(move.to, isCapture || (targets.get(move.to) ?? false));
    }

    this.possibleSquares = targets.size;
    this.clearMoveMarkers();

    // Tint every possible square, then ring the capture squares.
    for (const [square, isCapture] of targets) {
      const marker = isCapture ? LEARN_CAPTURE_MARKER : LEARN_MOVE_MARKER;
      (this.board as any).addMarker?.(marker, square);
      if (isCapture) {
        (this.board as any).addMarker?.(MARKER_TYPE.bevel, square);
      }
    }
    this.drawMoveArrow(legalMoves);
    (this.board as any).removeMarkers?.(MARKER_TYPE.frame);
    (this.board as any).addMarker?.(MARKER_TYPE.frame, this.practiceSquare);
  }

  private drawMoveArrow(legalMoves: any[]): void {
    if (!this.board || !this.practiceSquare) return;
    (this.board as any).removeArrows?.();

    const suggested =
      legalMoves.find(m => !m.captured && !this.chess.get(m.to as Square)) ?? legalMoves[0];
    if (!suggested) return;
    (this.board as any).addArrow?.(ARROW_TYPE.warning, this.practiceSquare, suggested.to);
  }

  private clearMoveMarkers(): void {
    if (!this.board) return;
    (this.board as any).removeMarkers?.(LEARN_MOVE_MARKER);
    (this.board as any).removeMarkers?.(LEARN_CAPTURE_MARKER);
    (this.board as any).removeLegalMovesMarkers?.();
    (this.board as any).removeArrows?.();
  }

  private clearBoardMarkers(): void {
    if (!this.board) return;
    this.clearMoveMarkers();
    (this.board as any).removeMarkers?.(MARKER_TYPE.frame);
  }

  /* ------------------- Instructor voice + dialogue ------------------- */
  changeLanguage(code: string): void {
    const previous = this.languageCode;
    if (!this.language.setLanguage(code)) return;

    this.stopSpeaking();
    this.voiceEnabled = true;
    if (previous !== code) {
      this.dismissFeedback();
    }

    if (this.practicePiece) {
      this.hint = this.practiceInstruction();
    } else if (this.boardIsCleared) {
      this.hint = this.copy.emptyBoard;
    } else {
      this.hint = this.copy.welcome;
    }

    this.speak(this.hint);
  }

  toggleVoice(): void {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled) {
      this.stopSpeaking();
    } else {
      this.speak(this.hint);
    }
  }

  sayHint(): void {
    this.voiceEnabled = true;
    this.speak(this.hint);
  }

  dismissFeedback(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
    this.feedback = null;
  }

  private showFeedback(kind: MoveFeedback['kind'], title: string, message: string): void {
    this.feedback = { kind, title, message };
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    this.feedbackTimeout = setTimeout(() => {
      this.feedback = null;
      this.feedbackTimeout = null;
      if (this.practicePiece) {
        this.hint = this.practiceInstruction();
      }
    }, 2800);
    this.speak(`${title} ${message}`);
  }

  private practiceInstruction(): string {
    if (!this.practicePiece) {
      return this.copy.emptyBoard;
    }
    return this.copy.practiceIntro(this.pieceName(this.practicePiece));
  }

  private initVoices(): void {
    if (!this.speechSupported) return;
    try {
      this.refreshVoices();
      window.speechSynthesis.addEventListener('voiceschanged', this.onVoicesChanged);
    } catch (_) {}
  }

  private refreshVoices(): void {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        this.voices = voices;
      }
    } catch (_) {}
  }

  private speak(text: string): void {
    if (!this.voiceEnabled) return;

    const cleanText = text
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return;

    const token = ++this.speechToken;
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }

    this.stopAudioFallback();

    // Chrome can silently drop an utterance that is queued immediately after cancel().
    // Do not cancel when nothing is playing: keeping the call synchronous also preserves
    // the user gesture that some browsers require to start audio.
    const shouldWaitForCancel =
      this.speechSupported && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
    if (shouldWaitForCancel) {
      this.cancelSpeech();
      this.isSpeaking = false;
      this.speechTimeout = setTimeout(() => this.trySpeak(cleanText, token, 0), 80);
      return;
    }

    this.isSpeaking = false;
    this.trySpeak(cleanText, token, 0);
  }

  private trySpeak(text: string, token: number, attempts: number): void {
    if (token !== this.speechToken) return;
    this.refreshVoices();

    // Voice lists are loaded asynchronously in most browsers. Some browsers add
    // more voices after the first batch, so also give a missing language match a
    // short chance to appear before falling back.
    if (!this.speechSupported) {
      this.speakWithAudioFallback(text, token);
      return;
    }

    const voice = this.findVoice(this.activeLanguage);
    if (!voice) {
      const maxAttempts = this.voices.length ? 2 : 8;
      if (attempts < maxAttempts) {
        this.speechTimeout = setTimeout(() => this.trySpeak(text, token, attempts + 1), 150);
        return;
      }

      // Some browsers have no installed voice for the selected language (notably
      // Arabic on Linux/Chrome). Use the online fallback instead of doing nothing.
      this.speakWithAudioFallback(text, token);
      return;
    }

    this.speakNow(text, token, true);
  }

  private speakNow(text: string, token: number, allowVoiceFallback: boolean): void {
    if (token !== this.speechToken) return;

    const language = this.activeLanguage;
    const voice = this.findVoice(language);

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1;
      utterance.rate = language.code === 'ar' ? 0.9 : 0.92;
      utterance.pitch = language.code === 'ar' ? 1 : 1.25;
      utterance.lang = voice?.lang ?? language.speechLang;
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        if (token === this.speechToken) this.isSpeaking = true;
      };
      utterance.onend = () => {
        if (token === this.speechToken) this.isSpeaking = false;
      };
      utterance.onerror = (event: any) => {
        if (token !== this.speechToken) return;
        this.isSpeaking = false;
        const error = event?.error;
        if (allowVoiceFallback && error !== 'interrupted' && error !== 'canceled') {
          this.speakWithAudioFallback(text, token);
        }
      };
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      this.isSpeaking = false;
      if (allowVoiceFallback) {
        this.speakWithAudioFallback(text, token);
      }
    }
  }

  /**
   * Best-effort fallback for devices with no installed voice for the selected
   * language. It is only used when the Web Speech API has no matching voice (or
   * the matching voice fails), so normal offline speech still uses the device.
   */
  private speakWithAudioFallback(text: string, token: number): void {
    if (token !== this.speechToken || !this.voiceEnabled) return;
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    const language = this.activeLanguage.speechLang.split('-')[0] || this.activeLanguage.code;
    const chunks = this.splitSpeechText(text);
    if (!chunks.length) return;

    this.stopAudioFallback();
    let index = 0;

    const playNext = () => {
      if (token !== this.speechToken || !this.voiceEnabled) {
        this.isSpeaking = false;
        return;
      }
      if (index >= chunks.length) {
        this.isSpeaking = false;
        this.audioFallback = null;
        return;
      }

      const query = encodeURIComponent(chunks[index++]);
      const audio = new Audio(
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(language)}&q=${query}`
      );
      this.audioFallback = audio;
      audio.onplay = () => {
        if (token === this.speechToken) this.isSpeaking = true;
      };
      audio.onended = playNext;
      audio.onerror = () => {
        if (token === this.speechToken) {
          this.isSpeaking = false;
          this.audioFallback = null;
        }
      };

      const playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          if (token === this.speechToken) this.isSpeaking = false;
        });
      }
    };

    playNext();
  }

  private splitSpeechText(text: string): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    let current = '';

    for (const word of words) {
      if (!current) {
        current = word;
      } else if (`${current} ${word}`.length <= 180) {
        current = `${current} ${word}`;
      } else {
        chunks.push(current);
        current = word;
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }

  private stopAudioFallback(): void {
    if (!this.audioFallback) return;
    try {
      this.audioFallback.onplay = null;
      this.audioFallback.onended = null;
      this.audioFallback.onerror = null;
      this.audioFallback.pause();
      this.audioFallback.currentTime = 0;
    } catch (_) {}
    this.audioFallback = null;
  }

  private findVoice(language: InstructorLanguage): SpeechSynthesisVoice | null {
    const voices = this.voices.length ? this.voices : window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const normalize = (lang: string) => lang.replace('_', '-').toLowerCase();
    const target = normalize(language.speechLang);
    const base = target.split('-')[0];
    const exact = voices.filter(voice => normalize(voice.lang) === target);
    const matching = exact.length
      ? exact
      : voices.filter(voice => normalize(voice.lang).startsWith(base));

    // Local voices are more reliable than network-backed ones.
    return matching.find(voice => voice.localService) ?? matching[0] ?? null;
  }

  private cancelSpeech(): void {
    if (!this.speechSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }

  private stopSpeaking(): void {
    this.speechToken++;
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
    this.cancelSpeech();
    this.stopAudioFallback();
    this.isSpeaking = false;
  }

  pieceLabel(piece: KidPiece): string {
    return this.language.pieceLabel(piece);
  }

  private pieceName(piece: KidPiece): string {
    return this.language.pieceName(piece);
  }

  private pieceType(piece: KidPiece): string {
    switch (piece.name) {
      case 'Pawn': return 'p';
      case 'Knight': return 'n';
      case 'Bishop': return 'b';
      case 'Rook': return 'r';
      case 'Queen': return 'q';
      case 'King': return 'k';
      default: return 'p';
    }
  }

  private clearTimers(): void {
    if (this.markerTimeout) {
      clearTimeout(this.markerTimeout);
      this.markerTimeout = null;
    }
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
  }
}
