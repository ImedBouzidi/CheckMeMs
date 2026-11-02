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
      font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    }

    .kids-world {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      color: #fff9f0;
      background: radial-gradient(circle at 18% 20%, #2a1a5e 0%, #17112d 55%, #0f0a20 100%);
      background-attachment: fixed;
    }

    /* ---- Enchanted Royal Sky ---- */
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
      opacity: 0.35;
      filter: blur(12px);
      animation: float-up 18s linear infinite;
    }
    .b1 { width: 140px; height: 140px; left: 8%; bottom: -140px; background: #b78aff; animation-delay: 0s; }
    .b2 { width: 90px; height: 90px; left: 32%; bottom: -100px; background: #f5c45e; animation-delay: 6s; animation-duration: 22s; }
    .b3 { width: 160px; height: 160px; left: 68%; bottom: -180px; background: #7c3aed; animation-delay: 2s; animation-duration: 24s; }
    .b4 { width: 110px; height: 110px; left: 88%; bottom: -120px; background: #352078; animation-delay: 10s; animation-duration: 20s; }

    @keyframes float-up {
      0% { transform: translateY(0) scale(0.85); opacity: 0; }
      15% { opacity: 0.35; }
      85% { opacity: 0.25; }
      100% { transform: translateY(-135vh) scale(1.2); opacity: 0; }
    }

    .float-piece {
      position: absolute;
      width: 58px;
      height: 58px;
      opacity: 0.25;
      filter: drop-shadow(0 0 10px rgba(183, 138, 255, 0.4));
      animation: drift 12s ease-in-out infinite;
    }
    .p1 { top: 14%; left: 4%; animation-delay: 0s; }
    .p2 { top: 62%; left: 6%; width: 48px; height: 48px; animation-delay: 2.5s; }
    .p3 { top: 20%; right: 5%; animation-delay: 4.5s; }
    .p4 { bottom: 18%; right: 8%; width: 44px; height: 44px; animation-delay: 1.2s; }

    @keyframes drift {
      0%, 100% { transform: translateY(0) rotate(-6deg); }
      50% { transform: translateY(-22px) rotate(6deg); }
    }

    .star {
      position: absolute;
      color: #f5c45e;
      font-size: 26px;
      filter: drop-shadow(0 0 8px rgba(245, 196, 94, 0.7));
      animation: twinkle 3.2s ease-in-out infinite;
    }
    .s1 { top: 12%; left: 45%; }
    .s2 { top: 44%; right: 20%; animation-delay: 1.1s; font-size: 20px; }
    .s3 { bottom: 22%; left: 36%; animation-delay: 2.2s; font-size: 22px; }

    @keyframes twinkle {
      0%, 100% { opacity: 0.3; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    /* ---- Royal Header ---- */
    .kids-header {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      max-width: 1200px;
      margin: 0 auto;
      padding: 22px 24px 0;
    }

    .kids-logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: #fff9f0;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.45rem;
      font-weight: 700;
      min-height: 48px;
    }

    .kids-logo img {
      width: 44px;
      height: 44px;
      background: #29204b;
      border: 2px solid #f5c45e;
      border-radius: 16px;
      padding: 5px;
      box-shadow: 0 4px 0 #352078, 0 0 14px rgba(245, 196, 94, 0.4);
      animation: logo-bounce 3s ease-in-out infinite;
    }

    .kids-logo strong {
      background: linear-gradient(90deg, #f5c45e, #b78aff, #ffffff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 2px 8px rgba(245, 196, 94, 0.4));
    }

    @keyframes logo-bounce {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50% { transform: translateY(-4px) rotate(2deg); }
    }

    .kids-nav {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .kids-nav a {
      display: inline-flex;
      align-items: center;
      min-height: 48px;
      min-width: 48px;
      text-decoration: none;
      color: #fff9f0;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 600;
      font-size: 1rem;
      padding: 10px 18px;
      border-radius: 999px;
      border: 2px solid rgba(183, 138, 255, 0.4);
      background: rgba(41, 32, 75, 0.85);
      box-shadow: 0 4px 0 #1b1338;
      backdrop-filter: blur(8px);
      transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease;
    }

    .kids-nav a:hover {
      transform: translateY(-2px);
      border-color: #f5c45e;
      background: rgba(53, 32, 120, 0.95);
      box-shadow: 0 6px 0 #1b1338, 0 0 12px rgba(245, 196, 94, 0.35);
    }

    .kids-nav .exit-link {
      color: #17112d;
      background: linear-gradient(135deg, #f5c45e, #fde68a);
      border-color: #f5c45e;
      font-weight: 700;
      box-shadow: 0 4px 0 #b45309;
    }

    .kids-nav .exit-link:hover {
      background: linear-gradient(135deg, #fef08a, #f5c45e);
      box-shadow: 0 6px 0 #b45309, 0 0 14px rgba(245, 196, 94, 0.5);
    }

    .kids-language {
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
    }

    .kids-language select {
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: 0.96rem;
      font-weight: 600;
      color: #fff9f0;
      cursor: pointer;
      outline: none;
      padding: 4px;
      border-radius: 8px;
    }

    .kids-language select:focus-visible {
      outline: 2px solid #f5c45e;
      outline-offset: 2px;
    }

    .kids-language option {
      color: #fff9f0;
      background: #29204b;
    }

    .exit-icon {
      margin-right: 4px;
    }

    /* ---- Main Section ---- */
    .kids-main {
      position: relative;
      z-index: 10;
      max-width: 1200px;
      margin: 0 auto;
      padding: 34px 24px 52px;
    }

    /* Hero */
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
      gap: 32px;
      align-items: center;
      background: linear-gradient(150deg, rgba(41, 32, 75, 0.88), rgba(23, 17, 45, 0.95));
      border: 3px solid rgba(183, 138, 255, 0.5);
      border-radius: 36px;
      padding: 44px 48px;
      box-shadow: 0 16px 0 #120b24, 0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(183, 138, 255, 0.2);
      backdrop-filter: blur(12px);
      animation: hero-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    @keyframes hero-pop {
      0% { transform: translateY(30px) scale(0.96); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 38px;
      padding: 6px 16px;
      border-radius: 999px;
      border: 1.5px solid #f5c45e;
      background: rgba(53, 32, 120, 0.8);
      color: #f5c45e;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      font-size: 0.88rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      box-shadow: 0 3px 0 #1c113b, 0 0 12px rgba(245, 196, 94, 0.4);
    }

    .hero h1 {
      margin: 16px 0 14px;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: clamp(2.3rem, 5.2vw, 3.8rem);
      line-height: 1.08;
      font-weight: 700;
      color: #fff9f0;
      letter-spacing: -0.01em;
    }

    .rainbow-text {
      background: linear-gradient(90deg, #f5c45e 0%, #b78aff 45%, #ffd670 85%, #f5c45e 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 2px 10px rgba(245, 196, 94, 0.4));
      animation: rainbow-move 6s linear infinite;
    }

    @keyframes rainbow-move {
      0% { background-position: 0% center; }
      100% { background-position: 200% center; }
    }

    .hero-sub {
      font-family: 'Quicksand', sans-serif;
      font-size: 1.2rem;
      font-weight: 600;
      line-height: 1.6;
      color: #e5deff;
      margin: 0 0 24px;
      max-width: 38ch;
    }

    .mega-play-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 60px;
      border: 2px solid #fff5d6;
      cursor: pointer;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #211200;
      padding: 16px 36px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f5c45e, #e5a82e);
      box-shadow: 0 8px 0 #925807, 0 16px 32px -8px rgba(245, 196, 94, 0.6);
      transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
      animation: pulse-btn 2.8s ease-in-out infinite;
    }

    .mega-play-btn:hover {
      transform: translateY(-3px) scale(1.02);
      filter: brightness(1.06);
      box-shadow: 0 11px 0 #925807, 0 20px 38px -8px rgba(245, 196, 94, 0.7);
    }

    .mega-play-btn:active {
      transform: translateY(5px) scale(0.99);
      box-shadow: 0 3px 0 #925807;
    }

    .mega-play-btn.small {
      margin-top: 26px;
      min-height: 52px;
      font-size: 1.1rem;
      padding: 14px 28px;
      background: linear-gradient(135deg, #f5c45e, #df9b20);
      box-shadow: 0 6px 0 #925807, 0 12px 24px -6px rgba(245, 196, 94, 0.5);
    }

    @keyframes pulse-btn {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .play-emoji {
      font-size: 1.6rem;
    }

    .hero-hint {
      margin: 14px 0 0;
      font-family: 'Quicksand', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      color: #b78aff;
    }

    /* Mascot */
    .hero-mascot {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
    }

    .mascot-halo {
      position: absolute;
      width: 250px;
      height: 250px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 196, 94, 0.35) 0%, rgba(183, 138, 255, 0.25) 50%, transparent 72%);
      filter: blur(10px);
      animation: halo-pulse 3.8s ease-in-out infinite;
    }

    @keyframes halo-pulse {
      0%, 100% { transform: scale(0.95); opacity: 0.7; }
      50% { transform: scale(1.1); opacity: 1; }
    }

    .mascot-knight {
      position: relative;
      width: 200px;
      height: 200px;
      filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 16px rgba(245, 196, 94, 0.5));
      animation: knight-bounce 3s ease-in-out infinite;
    }

    @keyframes knight-bounce {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50% { transform: translateY(-16px) rotate(2deg); }
    }

    .mascot-face {
      position: absolute;
      top: 42%;
      right: 18%;
      font-size: 2.2rem;
      animation: wink 4.2s ease-in-out infinite;
    }

    @keyframes wink {
      0%, 80%, 100% { transform: scale(1) rotate(0deg); }
      88% { transform: scale(1.2) rotate(10deg); }
    }

    .sparkle {
      position: absolute;
      font-size: 1.8rem;
      filter: drop-shadow(0 0 8px rgba(245, 196, 94, 0.8));
      animation: twinkle 2.6s ease-in-out infinite;
    }
    .sp1 { top: 8%; left: 12%; }
    .sp2 { top: 16%; right: 10%; animation-delay: 0.9s; }
    .sp3 { bottom: 12%; left: 22%; animation-delay: 1.8s; }

    /* ---- Royal Choice cards ---- */
    .choice-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
      margin-top: 36px;
    }

    .choice-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      text-align: left;
      text-decoration: none;
      font-family: inherit;
      color: #fff9f0;
      border: 3px solid rgba(183, 138, 255, 0.45);
      border-radius: 30px;
      padding: 28px 26px;
      cursor: pointer;
      min-height: 220px;
      background: linear-gradient(150deg, #29204b 0%, #1f173b 100%);
      box-shadow: 0 10px 0 #130c26, 0 20px 36px -12px rgba(0, 0, 0, 0.6);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
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
      transform: translateY(-6px) scale(1.01);
      border-color: #f5c45e;
      box-shadow: 0 14px 0 #130c26, 0 24px 40px -12px rgba(245, 196, 94, 0.3);
    }

    .play-choice {
      border-color: rgba(245, 196, 94, 0.6);
    }

    .learn-choice {
      border-color: rgba(183, 138, 255, 0.6);
    }

    .puzzle-choice {
      border-color: rgba(251, 191, 36, 0.6);
    }

    .choice-emoji {
      font-size: 2.9rem;
      line-height: 1;
      filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4));
    }

    .choice-title {
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.55rem;
      font-weight: 700;
      color: #fff9f0;
    }

    .choice-text {
      font-family: 'Quicksand', sans-serif;
      font-size: 1.02rem;
      font-weight: 600;
      line-height: 1.5;
      color: #d6ccf5;
      flex: 1;
    }

    .choice-cta {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      font-size: 0.98rem;
      color: #211200;
      padding: 8px 18px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f5c45e, #e5a82e);
      box-shadow: 0 4px 0 #925807;
      margin-top: 8px;
    }

    /* ---- Royal Piece Guide ---- */
    .pieces-section {
      margin-top: 50px;
      padding: 40px 36px;
      background: linear-gradient(150deg, rgba(41, 32, 75, 0.9), rgba(23, 17, 45, 0.94));
      border: 3px solid rgba(183, 138, 255, 0.45);
      border-radius: 36px;
      box-shadow: 0 16px 0 #120b24, 0 30px 60px -18px rgba(0, 0, 0, 0.7);
      scroll-margin-top: 24px;
    }

    .pieces-section h2,
    .how-to h2 {
      margin: 0 0 8px;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: clamp(1.8rem, 3.4vw, 2.4rem);
      font-weight: 700;
      color: #fff9f0;
    }

    .section-sub {
      margin: 0 0 28px;
      font-family: 'Quicksand', sans-serif;
      color: #b78aff;
      font-size: 1.08rem;
      font-weight: 600;
    }

    .piece-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
      gap: 18px;
    }

    .piece-card {
      --card-color: #352078;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
      font-family: inherit;
      border: 2px solid rgba(183, 138, 255, 0.35);
      border-radius: 24px;
      padding: 20px 14px 20px;
      background: linear-gradient(160deg, #2f2457, #1f173b);
      box-shadow: 0 8px 0 #120b24;
      cursor: pointer;
      min-height: 180px;
      transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
      animation: card-rise 0.5s ease both;
    }

    .piece-card:hover {
      transform: translateY(-5px);
      border-color: #f5c45e;
      box-shadow: 0 12px 0 #120b24, 0 0 18px rgba(245, 196, 94, 0.35);
    }

    .piece-emoji {
      font-size: 1.4rem;
      line-height: 1;
    }

    .piece-img {
      width: 70px;
      height: 70px;
      filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 8px rgba(183, 138, 255, 0.35));
      transition: transform 0.18s ease;
    }

    .piece-card:hover .piece-img {
      transform: scale(1.12) rotate(-4deg);
    }

    .piece-name {
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      font-size: 1.15rem;
      color: #fff9f0;
    }

    .piece-tap {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      margin-top: 4px;
      padding: 4px 14px;
      border-radius: 999px;
      background: rgba(53, 32, 120, 0.75);
      border: 1px solid #b78aff;
      color: #f5c45e;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease;
    }

    .piece-card:hover .piece-tap {
      color: #211200;
      background: #f5c45e;
      border-color: #f5c45e;
    }

    /* ---- Royal How To Play ---- */
    .how-to {
      margin-top: 44px;
      text-align: center;
      padding: 38px 28px 44px;
      border-radius: 36px;
      background: linear-gradient(150deg, rgba(41, 32, 75, 0.9), rgba(23, 17, 45, 0.95));
      border: 3px solid rgba(183, 138, 255, 0.45);
      box-shadow: 0 16px 0 #120b24, 0 30px 60px -18px rgba(0, 0, 0, 0.7);
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      margin-top: 26px;
    }

    .step {
      position: relative;
      background: #251c44;
      border: 2px solid rgba(183, 138, 255, 0.35);
      border-radius: 24px;
      padding: 24px 18px 20px;
      box-shadow: 0 6px 0 #120b24;
    }

    .step-num {
      position: absolute;
      top: -14px;
      left: -8px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #f5c45e, #d97706);
      color: #211200;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      font-size: 1.1rem;
      box-shadow: 0 4px 0 #78350f, 0 0 12px rgba(245, 196, 94, 0.45);
    }

    .step-emoji {
      display: block;
      font-size: 2.2rem;
      margin-bottom: 8px;
    }

    .step p {
      margin: 0;
      font-family: 'Quicksand', sans-serif;
      font-weight: 600;
      color: #fff9f0;
      font-size: 1.05rem;
      line-height: 1.5;
    }

    /* ---- Royal Footer ---- */
    .kids-footer {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px 34px;
      color: #b78aff;
      font-family: 'Quicksand', sans-serif;
      font-size: 0.98rem;
      font-weight: 600;
    }

    .kids-footer a {
      color: #f5c45e;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-weight: 700;
      text-decoration: none;
      min-height: 48px;
      display: inline-flex;
      align-items: center;
    }

    .kids-footer a:hover {
      text-decoration: underline;
      filter: drop-shadow(0 0 6px rgba(245, 196, 94, 0.5));
    }

    /* ---- Responsive ---- */
    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
        padding: 34px 28px;
        text-align: center;
      }
      .hero-sub {
        margin-left: auto;
        margin-right: auto;
      }
      .hero-mascot {
        order: -1;
        min-height: 220px;
      }
      .mascot-knight {
        width: 160px;
        height: 160px;
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
        padding: 24px 16px 40px;
      }
      .hero {
        border-radius: 28px;
        padding: 28px 20px;
      }
      .pieces-section,
      .how-to {
        padding: 28px 18px;
        border-radius: 28px;
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
