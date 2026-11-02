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
      font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    }

    .learn-world {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background: radial-gradient(circle at 75% 20%, #2a1a5e 0%, #17112d 55%, #0f0a20 100%);
      background-attachment: fixed;
      color: #fff9f0;
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
      font-size: 26px;
      opacity: 0.5;
      filter: drop-shadow(0 0 10px rgba(245, 196, 94, 0.6));
      animation: emoji-float 8s ease-in-out infinite;
    }
    .se1 { top: 12%; left: 8%; }
    .se2 { top: 22%; right: 14%; animation-delay: 1.5s; font-size: 30px; }
    .se3 { top: 62%; left: 5%; animation-delay: 3s; font-size: 34px; opacity: 0.2; }
    .se4 { bottom: 16%; right: 8%; animation-delay: 2s; font-size: 32px; }

    @keyframes emoji-float {
      0%, 100% { transform: translateY(0) rotate(-6deg); }
      50% { transform: translateY(-18px) rotate(8deg); }
    }

    .sky-piece {
      position: absolute;
      width: 50px;
      height: 50px;
      opacity: 0.2;
      filter: drop-shadow(0 0 12px rgba(183, 138, 255, 0.4));
      animation: piece-drift 12s ease-in-out infinite;
    }
    .sp1 { top: 18%; right: 4%; }
    .sp2 { bottom: 22%; left: 3%; animation-delay: 2s; width: 44px; height: 44px; }
    .sp3 { top: 55%; right: 6%; animation-delay: 4s; }

    @keyframes piece-drift {
      0%, 100% { transform: translateY(0) rotate(-8deg); }
      50% { transform: translateY(-20px) rotate(8deg); }
    }

    /* ---- Royal Header ---- */
    .learn-header {
      position: relative;
      z-index: 10;
      max-width: 1180px;
      margin: 0 auto;
      padding: 20px 22px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }

    .home-pill,
    .clear-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 48px;
      min-width: 48px;
      border: 2px solid rgba(183, 138, 255, 0.4);
      cursor: pointer;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      font-size: 1rem;
      text-decoration: none;
      padding: 10px 18px;
      border-radius: 999px;
      box-shadow: 0 4px 0 #1b1338;
      backdrop-filter: blur(8px);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .home-pill {
      color: #fff9f0;
      background: rgba(41, 32, 75, 0.85);
    }

    .clear-pill {
      color: #fff9f0;
      background: rgba(53, 32, 120, 0.85);
      border-color: rgba(245, 196, 94, 0.4);
    }

    .home-pill:hover,
    .clear-pill:hover {
      transform: translateY(-2px);
      border-color: #f5c45e;
      background: rgba(53, 32, 120, 0.95);
      box-shadow: 0 6px 0 #1b1338, 0 0 12px rgba(245, 196, 94, 0.35);
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
      gap: 8px;
      min-height: 48px;
      padding: 8px 14px;
      border-radius: 999px;
      border: 2px solid rgba(183, 138, 255, 0.4);
      background: rgba(41, 32, 75, 0.85);
      box-shadow: 0 4px 0 #1b1338;
      color: #f5c45e;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .language-picker .language-label {
      white-space: nowrap;
    }

    .language-select {
      border: none;
      background: transparent;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.95rem;
      color: #fff9f0;
      cursor: pointer;
      outline: none;
      padding: 4px;
      border-radius: 8px;
    }

    .language-select:focus-visible {
      outline: 2px solid #f5c45e;
      outline-offset: 2px;
    }

    .language-select option {
      color: #fff9f0;
      background: #29204b;
    }

    .learn-title {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 10px 20px;
      border-radius: 999px;
      background: rgba(41, 32, 75, 0.85);
      border: 2px solid rgba(183, 138, 255, 0.45);
      box-shadow: 0 4px 0 #1b1338;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff9f0;
    }

    .learn-title strong {
      background: linear-gradient(90deg, #f5c45e, #b78aff, #ffffff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .title-icon {
      font-size: 1.55rem;
      animation: title-wiggle 2.6s ease-in-out infinite;
    }

    @keyframes title-wiggle {
      0%, 100% { transform: rotate(-6deg) scale(1); }
      50% { transform: rotate(6deg) scale(1.12); }
    }

    /* ---- Stage ---- */
    .learn-stage {
      position: relative;
      z-index: 10;
      max-width: 1180px;
      margin: 0 auto;
      padding: 26px 22px 48px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 310px;
      gap: 28px;
      align-items: start;
    }

    .board-panel {
      min-width: 0;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    }

    /* ---- Instructor / Coach Owl ---- */
    .coach-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 14px;
    }

    .coach-avatar {
      position: relative;
      flex-shrink: 0;
      width: 66px;
      height: 66px;
      display: grid;
      place-items: center;
      font-size: 2.2rem;
      border-radius: 50%;
      background: linear-gradient(145deg, #352078, #29204b);
      border: 2px solid #f5c45e;
      box-shadow: 0 6px 0 #1b1338, 0 0 16px rgba(245, 196, 94, 0.4);
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
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid #fff9f0;
    }

    .coach-main {
      flex: 1;
      min-width: 0;
    }

    .coach-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 6px 6px;
    }

    .coach-name {
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #f5c45e;
    }

    .voice-toggle {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(183, 138, 255, 0.4);
      border-radius: 50%;
      cursor: pointer;
      font-size: 0.95rem;
      color: #fff9f0;
      background: #29204b;
      box-shadow: 0 2px 0 #120b24;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .voice-toggle:hover {
      transform: scale(1.1);
      background: #352078;
      border-color: #f5c45e;
    }

    .coach-bubble {
      min-height: 62px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border: 2px solid rgba(183, 138, 255, 0.45);
      border-radius: 22px 22px 22px 6px;
      background: #29204b;
      box-shadow: 0 6px 0 #130c26, 0 10px 20px rgba(0, 0, 0, 0.4);
      color: #fff9f0;
      font-family: 'Quicksand', sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.45;
      animation: coach-bubble-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .coach-text {
      flex: 1;
      min-width: 0;
    }

    .speak-btn {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border: 2px solid rgba(245, 196, 94, 0.5);
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.15rem;
      color: #fff9f0;
      background: linear-gradient(135deg, #352078, #29204b);
      box-shadow: 0 3px 0 #120b24;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .speak-btn:hover {
      transform: scale(1.1) rotate(-6deg);
      border-color: #f5c45e;
      box-shadow: 0 4px 0 #120b24, 0 0 10px rgba(245, 196, 94, 0.5);
    }

    @keyframes coach-bubble-pop {
      0% { transform: scale(0.95); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* ---- Possible-square Legend ---- */
    .legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 14px 74px;
      animation: coach-bubble-pop 0.35s ease;
    }

    .legend-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1.5px solid rgba(183, 138, 255, 0.4);
      background: rgba(41, 32, 75, 0.9);
      box-shadow: 0 3px 0 #120b24;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 0.84rem;
      font-weight: 700;
      color: #fff9f0;
    }

    .legend-chip.move {
      color: #b78aff;
      border-color: #b78aff;
    }

    .legend-chip.capture {
      color: #f5c45e;
      border-color: #f5c45e;
    }

    .legend-chip.count {
      color: #f5c45e;
      background: rgba(53, 32, 120, 0.9);
      border-color: #f5c45e;
    }

    .legend-swatch {
      width: 14px;
      height: 14px;
      border-radius: 4px;
    }

    .legend-swatch.move {
      background: #b78aff;
      box-shadow: 0 0 6px #b78aff;
    }

    .legend-swatch.capture {
      background: #f5c45e;
      box-shadow: 0 0 6px #f5c45e;
    }

    /* ---- Board Frame ---- */
    .board-frame {
      position: relative;
      padding: 16px;
      border-radius: 32px;
      background: linear-gradient(150deg, #352078 0%, #29204b 50%, #1c1538 100%);
      border: 3px solid #f5c45e;
      box-shadow: 0 16px 0 #120b24, 0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 24px rgba(245, 196, 94, 0.35);
      transition: box-shadow 0.3s ease;
    }

    .board-frame.try-active {
      box-shadow: 0 16px 0 #120b24, 0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 32px rgba(183, 138, 255, 0.6);
      animation: frame-glow-learn 2s ease-in-out infinite;
    }

    @keyframes frame-glow-learn {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.08); }
    }

    .frame-sparkles span {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #f5c45e;
      box-shadow: 0 0 10px rgba(245, 196, 94, 0.9);
      animation: sparkle-twinkle 2.4s ease-in-out infinite;
    }
    .frame-sparkles span:nth-child(1) { top: 10px; left: 24px; }
    .frame-sparkles span:nth-child(2) { top: 10px; right: 24px; animation-delay: 0.6s; }
    .frame-sparkles span:nth-child(3) { bottom: 10px; left: 24px; animation-delay: 1.2s; }
    .frame-sparkles span:nth-child(4) { bottom: 10px; right: 24px; animation-delay: 1.8s; }

    @keyframes sparkle-twinkle {
      0%, 100% { opacity: 0.4; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    .learn-board {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 20px;
      overflow: hidden;
      background: #17112d;
      box-shadow: inset 0 0 0 4px #352078;
    }

    /* ---- Practice Info ---- */
    .practice-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      min-height: 52px;
    }

    .practice-chip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 8px 18px;
      border-radius: 999px;
      background: rgba(41, 32, 75, 0.9);
      border: 2px solid rgba(183, 138, 255, 0.4);
      box-shadow: 0 4px 0 #120b24;
      color: #fff9f0;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      font-size: 1rem;
    }

    .practice-chip img {
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
    }

    .practice-chip.empty {
      color: #b78aff;
      box-shadow: 0 4px 0 #120b24;
      font-weight: 600;
    }

    .small-clear-btn {
      margin-left: auto;
      min-height: 48px;
      border: 2px solid rgba(245, 196, 94, 0.4);
      cursor: pointer;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      font-size: 0.95rem;
      color: #fff9f0;
      background: #352078;
      padding: 10px 18px;
      border-radius: 999px;
      box-shadow: 0 4px 0 #120b24;
      transition: transform 0.14s ease, border-color 0.14s ease;
    }

    .small-clear-btn:hover {
      transform: translateY(-2px);
      border-color: #f5c45e;
      box-shadow: 0 6px 0 #120b24, 0 0 10px rgba(245, 196, 94, 0.4);
    }

    /* ---- Sidebar ---- */
    .piece-sidebar {
      position: sticky;
      top: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 24px 20px;
      border: 3px solid rgba(183, 138, 255, 0.4);
      border-radius: 30px;
      background: linear-gradient(150deg, rgba(41, 32, 75, 0.9), rgba(23, 17, 45, 0.95));
      box-shadow: 0 10px 0 #130c26, 0 22px 40px -22px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
    }

    .piece-sidebar h2 {
      margin: 0;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      color: #fff9f0;
    }

    .piece-sidebar > p {
      margin: 0 0 6px;
      color: #b78aff;
      font-family: 'Quicksand', sans-serif;
      font-size: 0.92rem;
      font-weight: 600;
      line-height: 1.45;
    }

    .sidebar-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sidebar-piece {
      --piece-color: #352078;
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 58px;
      width: 100%;
      text-align: left;
      font-family: inherit;
      cursor: pointer;
      border: 2px solid rgba(183, 138, 255, 0.35);
      border-radius: 20px;
      padding: 8px 14px 8px 10px;
      background: linear-gradient(135deg, #2b2050, #1c1538);
      box-shadow: 0 5px 0 #120b24;
      transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
      animation: piece-slide-in 0.45s ease both;
    }

    @keyframes piece-slide-in {
      0% { transform: translateX(20px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }

    .sidebar-piece:hover {
      transform: translateY(-3px) translateX(-2px);
      border-color: #f5c45e;
      box-shadow: 0 8px 0 #120b24, 0 0 14px rgba(245, 196, 94, 0.3);
    }

    .sidebar-piece.active {
      border-color: #f5c45e;
      background: linear-gradient(135deg, #352078, #2a1860);
      box-shadow: 0 6px 0 #120b24, 0 0 0 3px rgba(245, 196, 94, 0.35);
      transform: translateY(-2px);
    }

    .piece-thumb {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: rgba(53, 32, 120, 0.6);
      border: 1px solid rgba(183, 138, 255, 0.3);
    }

    .piece-thumb img {
      width: 40px;
      height: 40px;
      filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.4));
      transition: transform 0.16s ease;
    }

    .sidebar-piece:hover .piece-thumb img {
      transform: scale(1.1) rotate(-5deg);
    }

    .piece-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .piece-info strong {
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff9f0;
    }

    .piece-info small {
      font-family: 'Quicksand', sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      color: #d6ccf5;
    }

    .piece-go {
      margin-left: auto;
      font-size: 1.5rem;
      font-weight: 800;
      color: #b78aff;
      transition: transform 0.16s ease, color 0.16s ease;
    }

    .sidebar-piece:hover .piece-go {
      color: #f5c45e;
      transform: translateX(3px);
    }

    .sidebar-note {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-top: 6px;
      padding: 14px;
      border-radius: 18px;
      background: #251c44;
      border: 1px solid rgba(245, 196, 94, 0.4);
      color: #fff9f0;
      font-family: 'Quicksand', sans-serif;
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .sidebar-note span {
      font-size: 1.35rem;
      line-height: 1;
    }

    .sidebar-note p {
      margin: 0;
    }

    /* ---- Feedback Dialogue ---- */
    .feedback-dialogue {
      position: fixed;
      left: 50%;
      bottom: 24px;
      z-index: 1200;
      width: min(480px, calc(100vw - 28px));
      min-height: 56px;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
      border-radius: 24px;
      transform: translateX(-50%);
      animation: feedback-pop 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: 'Quicksand', sans-serif;
    }

    .feedback-dialogue.good {
      background: linear-gradient(135deg, #065f46, #047857);
      color: #fff9f0;
      border: 2px solid #34d399;
      box-shadow: 0 8px 0 #064e3b, 0 20px 35px -15px rgba(0, 0, 0, 0.7), 0 0 20px rgba(52, 211, 153, 0.4);
    }

    .feedback-dialogue.wrong {
      background: linear-gradient(135deg, #881337, #9f1239);
      color: #fff9f0;
      border: 2px solid #fb7185;
      box-shadow: 0 8px 0 #4c0519, 0 20px 35px -15px rgba(0, 0, 0, 0.7), 0 0 20px rgba(251, 113, 133, 0.4);
    }

    @keyframes feedback-pop {
      0% { transform: translate(-50%, 22px) scale(0.9); opacity: 0; }
      100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
    }

    .feedback-emoji {
      flex-shrink: 0;
      font-size: 2rem;
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
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.12rem;
      font-weight: 700;
    }

    .feedback-copy span {
      font-size: 0.92rem;
      line-height: 1.35;
      font-weight: 600;
    }

    .feedback-close {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: inherit;
      background: rgba(255, 255, 255, 0.2);
      transition: transform 0.15s ease;
    }

    .feedback-close:hover {
      transform: rotate(90deg) scale(1.1);
      background: rgba(255, 255, 255, 0.3);
    }

    /* ---- Footer ---- */
    .learn-footer {
      position: relative;
      z-index: 10;
      max-width: 1180px;
      margin: 0 auto;
      padding: 0 22px 34px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      color: #b78aff;
      font-family: 'Quicksand', sans-serif;
      font-size: 0.98rem;
      font-weight: 600;
    }

    .learn-footer a {
      color: #f5c45e;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      text-decoration: none;
      min-height: 48px;
      display: inline-flex;
      align-items: center;
    }

    .learn-footer a:hover {
      text-decoration: underline;
      filter: drop-shadow(0 0 6px rgba(245, 196, 94, 0.5));
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
        padding-top: 14px;
      }
      .learn-title {
        order: -1;
        width: 100%;
        justify-content: center;
      }
      .learn-stage {
        padding: 20px 14px 34px;
        gap: 20px;
      }
      .coach-bubble {
        font-size: 0.96rem;
        min-height: 56px;
        padding: 12px 16px;
      }
      .coach-avatar {
        width: 54px;
        height: 54px;
        font-size: 1.8rem;
      }
      .legend-row {
        margin: 0 0 14px;
      }
      .feedback-dialogue {
        bottom: 16px;
        padding: 14px;
      }
      .board-frame {
        padding: 10px;
        border-radius: 24px;
      }
      .practice-bar {
        flex-wrap: wrap;
      }
      .sidebar-list {
        grid-template-columns: 1fr;
      }
      .piece-sidebar {
        padding: 18px;
      }
      .learn-footer {
        justify-content: center;
        text-align: center;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .learn-world,
      .sky-emoji,
      .sky-piece,
      .frame-sparkles span,
      .coach-avatar,
      .title-icon,
      .practice-chip,
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
