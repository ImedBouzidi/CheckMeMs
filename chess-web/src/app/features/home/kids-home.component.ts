import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { KidsPiecePopupComponent } from './kids-piece-popup.component';
import { KID_PIECES, KidPiece } from './kids-piece.model';
import { KidsLanguageService } from './kids-language.service';

@Component({
  selector: 'app-kids-home',
  standalone: true,
  imports: [RouterLink, KidsPiecePopupComponent],
  template: `
    <div class="kids-world">
      <!-- Animated background -->
      <div class="sky" aria-hidden="true">
        <span class="bubble b1"></span>
        <span class="bubble b2"></span>
        <span class="bubble b3"></span>
        <span class="bubble b4"></span>
        <img class="float-piece p1" src="assets/chess-pieces/wN.svg" alt="" />
        <img class="float-piece p2" src="assets/chess-pieces/bQ.svg" alt="" />
        <img class="float-piece p3" src="assets/chess-pieces/wR.svg" alt="" />
        <img class="float-piece p4" src="assets/chess-pieces/bP.svg" alt="" />
        <span class="star s1">✦</span>
        <span class="star s2">✦</span>
        <span class="star s3">✦</span>
      </div>

      <!-- Kids header -->
      <header class="kids-header">
        <a class="kids-logo" routerLink="/kids">
          <img src="assets/logo/knight-dark.svg" alt="" />
          <span>CheckMe <strong>Kids</strong></span>
        </a>
        <nav class="kids-nav">
          <a href="#play">{{ ui.common.play }}</a>
          <a href="#pieces">{{ ui.common.learn }}</a>
          <label class="kids-language">
            <span aria-hidden="true">🌍</span>
            <select
              #kidsLanguage
              [value]="languageCode"
              [attr.aria-label]="copy.languageLabel"
              (change)="changeLanguage(kidsLanguage.value)">
              @for (language of languages; track language.code) {
                <option [value]="language.code" [selected]="language.code === languageCode">
                  {{ language.name }}
                </option>
              }
            </select>
          </label>
          <a class="exit-link" routerLink="/" [attr.title]="ui.common.backToNormalHome">
            <span class="exit-icon">🏠</span> {{ ui.common.grownUps }}
          </a>
        </nav>
      </header>

      <main class="kids-main">
        <!-- Hero -->
        <section class="hero">
          <div class="hero-text">
            <span class="hero-badge">{{ ui.home.kidsMode }}</span>
            <h1>{{ ui.home.heroLine1 }}<br /><span class="rainbow-text">{{ ui.home.heroLine2 }}</span></h1>
            <p class="hero-sub">{{ ui.home.heroSub }}</p>
            <button class="mega-play-btn" (click)="playWithBuddy()">
              <span class="play-emoji">🤖</span>
              {{ ui.home.playWithBuddy }}
            </button>
            <p class="hero-hint">{{ ui.home.stuckHint }}</p>
          </div>

          <div class="hero-mascot" aria-hidden="true">
            <div class="mascot-halo"></div>
            <img src="assets/chess-pieces/wN.svg" alt="" class="mascot-knight" />
            <span class="mascot-face">😊</span>
            <span class="sparkle sp1">✨</span>
            <span class="sparkle sp2">⭐</span>
            <span class="sparkle sp3">✨</span>
          </div>
        </section>

        <!-- Big simple choices -->
        <section id="play" class="choice-grid">
          <button class="choice-card play-choice" (click)="playWithBuddy()">
            <span class="choice-emoji">🤖</span>
            <span class="choice-title">{{ ui.home.playChessTitle }}</span>
            <span class="choice-text">{{ ui.home.playChessText }}</span>
            <span class="choice-cta">{{ ui.home.playChessCta }}</span>
          </button>

          <a class="choice-card learn-choice" routerLink="/kids/learn">
            <span class="choice-emoji">🧩</span>
            <span class="choice-title">{{ ui.home.learnPiecesTitle }}</span>
            <span class="choice-text">{{ ui.home.learnPiecesText }}</span>
            <span class="choice-cta">{{ ui.home.learnPiecesCta }}</span>
          </a>

          <a class="choice-card puzzle-choice" routerLink="/puzzles">
            <span class="choice-emoji">🌟</span>
            <span class="choice-title">{{ ui.home.funPuzzlesTitle }}</span>
            <span class="choice-text">{{ ui.home.funPuzzlesText }}</span>
            <span class="choice-cta">{{ ui.home.funPuzzlesCta }}</span>
          </a>
        </section>

        <!-- Piece guide -->
        <section id="pieces" class="pieces-section">
          <h2>{{ ui.home.meetPiecesTitle }}</h2>
          <p class="section-sub">{{ ui.home.meetPiecesSub }}</p>

          <div class="piece-grid">
            @for (piece of pieces; track piece.name; let i = $index) {
              <button
                class="piece-card"
                [style.--card-color]="piece.color"
                [style.animation-delay.ms]="i * 90"
                (click)="openPiece(piece)">
                <span class="piece-emoji">{{ piece.emoji }}</span>
                <img class="piece-img" [src]="'assets/chess-pieces/' + piece.image + '.svg'" [alt]="pieceLabel(piece)" />
                <span class="piece-name">{{ pieceLabel(piece) }}</span>
                <span class="piece-tap">{{ ui.home.tapToLearn }}</span>
              </button>
            }
          </div>
        </section>

        <!-- Simple how-to -->
        <section class="how-to">
          <h2>{{ ui.home.howToPlayTitle }}</h2>
          <div class="steps">
            <div class="step">
              <span class="step-num">1</span>
              <span class="step-emoji">👆</span>
              <p>{{ ui.home.step1 }}</p>
            </div>
            <div class="step">
              <span class="step-num">2</span>
              <span class="step-emoji">🟢</span>
              <p>{{ ui.home.step2 }}</p>
            </div>
            <div class="step">
              <span class="step-num">3</span>
              <span class="step-emoji">👑</span>
              <p>{{ ui.home.step3 }}</p>
            </div>
          </div>
          <button class="mega-play-btn small" (click)="playWithBuddy()">
            <span class="play-emoji">▶️</span> {{ ui.home.startPlaying }}
          </button>
        </section>
      </main>

      <footer class="kids-footer">
        <span>{{ ui.home.footer }}</span>
        <a routerLink="/">{{ ui.common.backToNormalHome }}</a>
      </footer>

      <!-- Piece popup -->
      <app-kids-piece-popup [piece]="selectedPiece" (closed)="closePiece()" />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .kids-world {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      color: #1e293b;
      background: linear-gradient(135deg, #fef3c7, #fce7f3, #dbeafe, #d1fae5, #fef3c7);
      background-size: 400% 400%;
      animation: gradient-shift 18s ease infinite;
    }

    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* ---- Animated background ---- */
    .sky {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }

    .bubble {
      position: absolute;
      border-radius: 50%;
      opacity: 0.5;
      filter: blur(2px);
      animation: float-up 16s linear infinite;
    }
    .b1 { width: 90px; height: 90px; left: 6%; bottom: -120px; background: #fca5a5; animation-delay: 0s; }
    .b2 { width: 60px; height: 60px; left: 28%; bottom: -100px; background: #93c5fd; animation-delay: 5s; animation-duration: 20s; }
    .b3 { width: 120px; height: 120px; left: 62%; bottom: -160px; background: #fcd34d; animation-delay: 2s; animation-duration: 22s; }
    .b4 { width: 70px; height: 70px; left: 85%; bottom: -110px; background: #6ee7b7; animation-delay: 9s; animation-duration: 18s; }

    @keyframes float-up {
      0% { transform: translateY(0) scale(0.8); opacity: 0; }
      10% { opacity: 0.55; }
      90% { opacity: 0.35; }
      100% { transform: translateY(-135vh) scale(1.15); opacity: 0; }
    }

    .float-piece {
      position: absolute;
      width: 54px;
      height: 54px;
      opacity: 0.35;
      animation: drift 12s ease-in-out infinite;
    }
    .p1 { top: 14%; left: 4%; animation-delay: 0s; }
    .p2 { top: 60%; left: 8%; width: 44px; height: 44px; animation-delay: 2s; }
    .p3 { top: 22%; right: 5%; animation-delay: 4s; }
    .p4 { bottom: 18%; right: 10%; width: 40px; height: 40px; animation-delay: 1s; }

    @keyframes drift {
      0%, 100% { transform: translateY(0) rotate(-8deg); }
      50% { transform: translateY(-22px) rotate(8deg); }
    }

    .star {
      position: absolute;
      color: #f59e0b;
      font-size: 24px;
      animation: twinkle 3s ease-in-out infinite;
    }
    .s1 { top: 10%; left: 45%; }
    .s2 { top: 46%; right: 22%; animation-delay: 1s; font-size: 18px; }
    .s3 { bottom: 22%; left: 38%; animation-delay: 2s; font-size: 20px; }

    @keyframes twinkle {
      0%, 100% { opacity: 0.25; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.15); }
    }

    /* ---- Header ---- */
    .kids-header {
      position: relative;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 24px 0;
    }

    .kids-logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: #1e293b;
      font-size: 1.35rem;
      font-weight: 700;
    }

    .kids-logo img {
      width: 42px;
      height: 42px;
      background: #ffffff;
      border-radius: 14px;
      padding: 5px;
      box-shadow: 0 4px 0 #c084fc;
      animation: logo-bounce 2.6s ease-in-out infinite;
    }

    .kids-logo strong {
      background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    @keyframes logo-bounce {
      0%, 100% { transform: translateY(0) rotate(-3deg); }
      50% { transform: translateY(-5px) rotate(3deg); }
    }

    .kids-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .kids-nav a {
      text-decoration: none;
      color: #475569;
      font-weight: 700;
      padding: 9px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.7);
      box-shadow: 0 3px 0 rgba(148, 163, 184, 0.35);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .kids-nav a:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 0 rgba(148, 163, 184, 0.35);
    }

    .kids-nav .exit-link {
      color: #7c2d12;
      background: #fef3c7;
    }

    .kids-language {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.7);
      box-shadow: 0 3px 0 rgba(148, 163, 184, 0.35);
      color: #475569;
      font-weight: 700;
    }

    .kids-language select {
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      color: inherit;
      cursor: pointer;
      outline: none;
      padding: 2px;
      border-radius: 8px;
    }

    .kids-language select:focus-visible {
      outline: 2px solid #8b5cf6;
      outline-offset: 2px;
    }

    .kids-language option {
      color: #1e293b;
      background: #ffffff;
    }

    .exit-icon {
      margin-right: 2px;
    }

    /* ---- Main ---- */
    .kids-main {
      position: relative;
      z-index: 5;
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }

    /* Hero */
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
      gap: 32px;
      align-items: center;
      background: rgba(255, 255, 255, 0.72);
      border: 4px solid #ffffff;
      border-radius: 36px;
      padding: 40px 44px;
      box-shadow: 0 20px 0 rgba(224, 231, 255, 0.8), 0 30px 60px -20px rgba(99, 102, 241, 0.35);
      backdrop-filter: blur(6px);
      animation: hero-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    @keyframes hero-pop {
      0% { transform: translateY(30px) scale(0.96); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }

    .hero-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 999px;
      background: #ffffff;
      color: #7c3aed;
      font-weight: 800;
      font-size: 0.82rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      box-shadow: 0 3px 0 #ddd6fe;
    }

    .hero h1 {
      margin: 14px 0 12px;
      font-size: clamp(2.2rem, 5vw, 3.6rem);
      line-height: 1.05;
      color: #1e293b;
    }

    .rainbow-text {
      background: linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #10b981);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: rainbow-move 5s linear infinite;
    }

    @keyframes rainbow-move {
      0% { background-position: 0% center; }
      100% { background-position: 200% center; }
    }

    .hero-sub {
      font-size: 1.15rem;
      line-height: 1.55;
      color: #475569;
      margin: 0 0 22px;
      max-width: 36ch;
    }

    .mega-play-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 1.2rem;
      font-weight: 800;
      color: #ffffff;
      padding: 18px 30px;
      border-radius: 999px;
      background: linear-gradient(135deg, #22c55e, #06b6d4);
      box-shadow: 0 8px 0 #15803d, 0 16px 30px -10px rgba(34, 197, 94, 0.7);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      animation: pulse-btn 2.4s ease-in-out infinite;
    }

    .mega-play-btn:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 11px 0 #15803d, 0 20px 36px -10px rgba(34, 197, 94, 0.75);
    }

    .mega-play-btn:active {
      transform: translateY(5px) scale(0.99);
      box-shadow: 0 3px 0 #15803d;
    }

    .mega-play-btn.small {
      margin-top: 24px;
      font-size: 1.05rem;
      padding: 14px 24px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      box-shadow: 0 7px 0 #6d28d9, 0 14px 26px -10px rgba(139, 92, 246, 0.7);
    }

    @keyframes pulse-btn {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }

    .play-emoji {
      font-size: 1.5rem;
    }

    .hero-hint {
      margin: 14px 0 0;
      font-size: 0.9rem;
      color: #64748b;
    }

    /* Mascot */
    .hero-mascot {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 260px;
    }

    .mascot-halo {
      position: absolute;
      width: 230px;
      height: 230px;
      border-radius: 50%;
      background: radial-gradient(circle, #fde68a 0%, #fbcfe8 55%, transparent 72%);
      animation: halo-pulse 3.5s ease-in-out infinite;
    }

    @keyframes halo-pulse {
      0%, 100% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.08); opacity: 1; }
    }

    .mascot-knight {
      position: relative;
      width: 190px;
      height: 190px;
      filter: drop-shadow(0 18px 20px rgba(99, 102, 241, 0.3));
      animation: knight-bounce 2.8s ease-in-out infinite;
    }

    @keyframes knight-bounce {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50% { transform: translateY(-16px) rotate(2deg); }
    }

    .mascot-face {
      position: absolute;
      top: 42%;
      right: 18%;
      font-size: 2rem;
      animation: wink 4s ease-in-out infinite;
    }

    @keyframes wink {
      0%, 80%, 100% { transform: scale(1) rotate(0deg); }
      88% { transform: scale(1.2) rotate(10deg); }
    }

    .sparkle {
      position: absolute;
      font-size: 1.6rem;
      animation: twinkle 2.4s ease-in-out infinite;
    }
    .sp1 { top: 8%; left: 12%; }
    .sp2 { top: 18%; right: 10%; animation-delay: 0.8s; }
    .sp3 { bottom: 12%; left: 24%; animation-delay: 1.6s; }

    /* ---- Choice cards ---- */
    .choice-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 22px;
      margin-top: 34px;
    }

    .choice-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      text-align: left;
      text-decoration: none;
      font-family: inherit;
      color: #1e293b;
      border: 4px solid #ffffff;
      border-radius: 28px;
      padding: 26px 24px;
      cursor: pointer;
      min-height: 210px;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      animation: card-rise 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    .choice-card:nth-child(1) { animation-delay: 0.12s; }
    .choice-card:nth-child(2) { animation-delay: 0.22s; }
    .choice-card:nth-child(3) { animation-delay: 0.32s; }

    @keyframes card-rise {
      0% { transform: translateY(28px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    .choice-card:hover {
      transform: translateY(-7px) rotate(-1deg);
    }

    .play-choice {
      background: linear-gradient(150deg, #d1fae5, #a7f3d0);
      box-shadow: 0 12px 0 #6ee7b7, 0 22px 36px -16px rgba(16, 185, 129, 0.6);
    }

    .learn-choice {
      background: linear-gradient(150deg, #dbeafe, #bfdbfe);
      box-shadow: 0 12px 0 #93c5fd, 0 22px 36px -16px rgba(59, 130, 246, 0.6);
    }

    .puzzle-choice {
      background: linear-gradient(150deg, #fef3c7, #fde68a);
      box-shadow: 0 12px 0 #fcd34d, 0 22px 36px -16px rgba(245, 158, 11, 0.6);
    }

    .choice-emoji {
      font-size: 2.8rem;
      line-height: 1;
      filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.12));
    }

    .choice-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
    }

    .choice-text {
      font-size: 0.98rem;
      line-height: 1.45;
      color: #334155;
      flex: 1;
    }

    .choice-cta {
      font-weight: 800;
      font-size: 0.95rem;
      color: #0f172a;
      padding: 7px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.75);
      margin-top: 6px;
    }

    /* ---- Piece guide ---- */
    .pieces-section {
      margin-top: 48px;
      padding: 38px 34px;
      background: rgba(255, 255, 255, 0.78);
      border: 4px solid #ffffff;
      border-radius: 34px;
      box-shadow: 0 16px 0 rgba(224, 231, 255, 0.85), 0 26px 50px -22px rgba(99, 102, 241, 0.35);
      scroll-margin-top: 20px;
    }

    .pieces-section h2,
    .how-to h2 {
      margin: 0 0 6px;
      font-size: clamp(1.6rem, 3vw, 2.2rem);
      color: #1e293b;
    }

    .section-sub {
      margin: 0 0 24px;
      color: #64748b;
      font-size: 1rem;
    }

    .piece-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
    }

    .piece-card {
      --card-color: #a7f3d0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
      font-family: inherit;
      border: 3px solid #ffffff;
      border-radius: 22px;
      padding: 16px 12px 18px;
      background: linear-gradient(160deg, #ffffff, var(--card-color));
      box-shadow: 0 7px 0 rgba(148, 163, 184, 0.35);
      cursor: pointer;
      transition: transform 0.16s ease, box-shadow 0.16s ease;
      animation: card-rise 0.5s ease both;
    }

    .piece-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 0 rgba(148, 163, 184, 0.35);
    }

    .piece-emoji {
      font-size: 1.3rem;
      line-height: 1;
    }

    .piece-img {
      width: 66px;
      height: 66px;
      filter: drop-shadow(0 5px 5px rgba(0, 0, 0, 0.16));
      transition: transform 0.18s ease;
    }

    .piece-card:hover .piece-img {
      transform: scale(1.1) rotate(-4deg);
    }

    .piece-name {
      font-weight: 800;
      font-size: 1.05rem;
      color: #1e293b;
    }

    .piece-tap {
      margin-top: 2px;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.75);
      color: #7c3aed;
      font-size: 0.8rem;
      font-weight: 800;
      transition: color 0.16s ease, background 0.16s ease;
    }

    .piece-card:hover .piece-tap {
      color: #db2777;
      background: #ffffff;
    }

    /* ---- How to ---- */
    .how-to {
      margin-top: 40px;
      text-align: center;
      padding: 34px 24px 40px;
      border-radius: 34px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.85), rgba(254, 243, 199, 0.85));
      border: 4px solid #ffffff;
      box-shadow: 0 16px 0 rgba(253, 230, 138, 0.75);
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 24px;
    }

    .step {
      position: relative;
      background: #ffffff;
      border-radius: 22px;
      padding: 20px 16px;
      box-shadow: 0 6px 0 rgba(148, 163, 184, 0.25);
    }

    .step-num {
      position: absolute;
      top: -12px;
      left: -8px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #8b5cf6;
      color: #ffffff;
      font-weight: 800;
      box-shadow: 0 3px 0 #6d28d9;
    }

    .step-emoji {
      display: block;
      font-size: 2rem;
      margin-bottom: 6px;
    }

    .step p {
      margin: 0;
      font-weight: 700;
      color: #334155;
      line-height: 1.4;
    }

    /* ---- Footer ---- */
    .kids-footer {
      position: relative;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px 30px;
      color: #64748b;
      font-size: 0.9rem;
    }

    .kids-footer a {
      color: #7c3aed;
      font-weight: 700;
      text-decoration: none;
    }

    .kids-footer a:hover {
      text-decoration: underline;
    }

    /* ---- Responsive ---- */
    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
        padding: 32px 26px;
        text-align: center;
      }
      .hero-sub {
        margin-left: auto;
        margin-right: auto;
      }
      .hero-mascot {
        order: -1;
        min-height: 200px;
      }
      .mascot-knight {
        width: 150px;
        height: 150px;
      }
      .choice-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .kids-header {
        justify-content: center;
      }
      .kids-main {
        padding: 22px 14px 36px;
      }
      .hero {
        border-radius: 26px;
        padding: 26px 18px;
      }
      .pieces-section,
      .how-to {
        padding: 26px 16px;
        border-radius: 26px;
      }
      .steps {
        grid-template-columns: 1fr;
      }
      .kids-footer {
        justify-content: center;
        text-align: center;
      }
      .mega-play-btn {
        width: 100%;
        justify-content: center;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .kids-world,
      .rainbow-text,
      .mega-play-btn,
      .mascot-knight,
      .mascot-halo,
      .float-piece,
      .star,
      .sparkle,
      .mascot-face,
      .bubble,
      .kids-logo img {
        animation: none !important;
      }
      .choice-card,
      .piece-card {
        animation: none !important;
      }
    }
  `]
})
export class KidsHomeComponent {
  readonly language = inject(KidsLanguageService);
  selectedPiece: KidPiece | null = null;
  readonly pieces = KID_PIECES;

  constructor(private router: Router) {}

  get languages() {
    return this.language.languages;
  }

  get languageCode() {
    return this.language.languageCode;
  }

  get copy() {
    return this.language.instructor;
  }

  get ui() {
    return this.language.copy;
  }

  changeLanguage(code: string): void {
    this.language.setLanguage(code);
  }

  pieceLabel(piece: KidPiece): string {
    return this.language.pieceLabel(piece);
  }

  playWithBuddy(): void {
    this.router.navigate(['/kids/play']);
  }

  openPiece(piece: KidPiece): void {
    this.selectedPiece = piece;
  }

  closePiece(): void {
    this.selectedPiece = null;
  }
}
