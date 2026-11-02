import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import {
  KidPiece,
  KID_PIECE_GRID,
  isCaptureSquare,
  isCenterSquare,
  isMoveSquare
} from './kids-piece.model';
import { KidsLanguageService } from './kids-language.service';

@Component({
  selector: 'app-kids-piece-popup',
  standalone: true,
  template: `
    @if (piece; as current) {
      <div class="piece-modal-backdrop" (click)="close()">
        <div
          class="piece-modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="pieceLabel(current)"
          (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="close()" [attr.aria-label]="ui.popup.close">✕</button>

          <header class="piece-modal-header">
            <div class="modal-piece-halo"></div>
            <img
              class="modal-piece-img"
              [src]="'assets/chess-pieces/' + current.image + '.svg'"
              [alt]="pieceLabel(current)" />
            <div
              class="modal-title-block"
              [attr.dir]="language.activeLanguage.dir"
              [attr.lang]="language.activeLanguage.speechLang">
              <span class="modal-emoji">{{ current.emoji }}</span>
              <h2>{{ pieceLabel(current) }}</h2>
              <p>{{ pieceDetails(current).tip }}</p>
            </div>
          </header>

          <!-- Mini board showing moves and captures -->
          <div class="mini-board-wrap">
            <div class="mini-board" aria-hidden="true">
              @for (row of grid; track row) {
                @for (col of grid; track col) {
                  <div
                    class="mini-square"
                    [class.dark]="(row + col) % 2 === 1"
                    [class.center-square]="isCenter(col, row)"
                    [class.move-target]="isMove(current, col, row)"
                    [class.capture-target]="isCapture(current, col, row)">
                    @if (isCenter(col, row)) {
                      <img
                        class="mini-piece"
                        [src]="'assets/chess-pieces/' + current.image + '.svg'"
                        [alt]="pieceLabel(current)" />
                    } @else if (isCapture(current, col, row)) {
                      <img class="mini-enemy" src="assets/chess-pieces/bP.svg" [alt]="ui.popup.enemyPawn" />
                    } @else if (isMove(current, col, row)) {
                      <span class="mini-dot"></span>
                    }
                  </div>
                }
              }
            </div>

            <div class="mini-legend" [attr.dir]="language.activeLanguage.dir">
              <span class="legend-item"><span class="legend-dot"></span> {{ ui.popup.canMoveHere }}</span>
              <span class="legend-item"><span class="legend-ring"></span> {{ ui.popup.canCaptureHere }}</span>
            </div>
          </div>

          <div class="move-info-grid">
            <div class="move-info move-box">
              <span class="info-icon">🟢</span>
              <div [attr.dir]="language.activeLanguage.dir" [attr.lang]="language.activeLanguage.speechLang">
                <strong>{{ ui.popup.howItMoves }}</strong>
                <p>{{ pieceDetails(current).moveText }}</p>
              </div>
            </div>
            <div class="move-info capture-box">
              <span class="info-icon">🎯</span>
              <div [attr.dir]="language.activeLanguage.dir" [attr.lang]="language.activeLanguage.speechLang">
                <strong>{{ ui.popup.howItCaptures }}</strong>
                <p>{{ pieceDetails(current).captureText }}</p>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            @if (showTryMe) {
              <button class="try-me-btn" (click)="onTryMe(current)">{{ ui.popup.tryMe }}</button>
            }
            <button class="got-it-btn" [class.secondary]="showTryMe" (click)="close()">{{ ui.popup.gotIt }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .piece-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow-y: auto;
      background: rgba(15, 10, 32, 0.78);
      backdrop-filter: blur(8px);
      animation: backdrop-in 0.2s ease;
      font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    }

    @keyframes backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .piece-modal {
      position: relative;
      width: min(580px, 100%);
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 30px 28px 26px;
      border: 3px solid #f5c45e;
      border-radius: 32px;
      background: linear-gradient(160deg, #29204b 0%, #1c1538 55%, #17112d 100%);
      color: #fff9f0;
      box-shadow: 0 16px 0 #120b24, 0 40px 70px -20px rgba(0, 0, 0, 0.8), 0 0 24px rgba(245, 196, 94, 0.35);
      animation: modal-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes modal-pop {
      0% { transform: scale(0.8) translateY(24px); opacity: 0; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }

    .modal-close {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 3;
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border: 2px solid #f5c45e;
      border-radius: 50%;
      cursor: pointer;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.2rem;
      font-weight: 700;
      color: #211200;
      background: linear-gradient(135deg, #f5c45e, #e5a82e);
      box-shadow: 0 4px 0 #925807;
      transition: transform 0.18s ease, background 0.18s ease;
    }

    .modal-close:hover {
      transform: rotate(90deg) scale(1.08);
      filter: brightness(1.1);
    }

    .piece-modal-header {
      position: relative;
      display: flex;
      align-items: center;
      gap: 18px;
      padding-right: 48px;
      margin-bottom: 22px;
    }

    .modal-piece-halo {
      position: absolute;
      left: -12px;
      top: -14px;
      width: 125px;
      height: 125px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 196, 94, 0.4) 0%, rgba(183, 138, 255, 0.25) 55%, transparent 72%);
      filter: blur(8px);
      animation: halo-pulse 3.5s ease-in-out infinite;
    }

    @keyframes halo-pulse {
      0%, 100% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.08); opacity: 1; }
    }

    .modal-piece-img {
      position: relative;
      flex-shrink: 0;
      width: 98px;
      height: 98px;
      filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 12px rgba(245, 196, 94, 0.4));
      animation: modal-piece-float 2.8s ease-in-out infinite;
    }

    @keyframes modal-piece-float {
      0%, 100% { transform: translateY(0) rotate(-3deg); }
      50% { transform: translateY(-8px) rotate(3deg); }
    }

    .modal-title-block {
      position: relative;
    }

    .modal-emoji {
      font-size: 1.4rem;
    }

    .modal-title-block h2 {
      margin: 2px 0 4px;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 2.1rem;
      line-height: 1.1;
      font-weight: 700;
      color: #fff9f0;
    }

    .modal-title-block p {
      margin: 0;
      color: #d6ccf5;
      line-height: 1.45;
      font-size: 1rem;
      font-weight: 600;
    }

    /* ---- Mini Board Diagram ---- */
    .mini-board-wrap {
      background: #1f173b;
      border: 2px solid rgba(183, 138, 255, 0.35);
      border-radius: 24px;
      padding: 18px;
      box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.4);
    }

    .mini-board {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      width: 100%;
      max-width: 320px;
      margin: 0 auto;
      border: 4px solid #352078;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 0 #120b24, 0 0 16px rgba(183, 138, 255, 0.25);
    }

    .mini-square {
      position: relative;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1dccb;
    }

    .mini-square.dark {
      background: #9273b7;
    }

    .mini-square.center-square {
      background: #fef08a;
      box-shadow: inset 0 0 0 3px #f5c45e;
      z-index: 2;
    }

    .mini-piece {
      width: 78%;
      height: 78%;
      filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.4));
      animation: mini-piece-bob 2s ease-in-out infinite;
    }

    @keyframes mini-piece-bob {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-5%) scale(1.05); }
    }

    .mini-enemy {
      position: relative;
      z-index: 1;
      width: 64%;
      height: 64%;
      opacity: 0.95;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
    }

    .mini-dot {
      width: 34%;
      height: 34%;
      border-radius: 50%;
      background: #b78aff;
      box-shadow: 0 0 0 3px rgba(255, 249, 240, 0.8), 0 0 8px #b78aff;
      animation: mini-dot-pulse 1.4s ease-in-out infinite;
    }

    @keyframes mini-dot-pulse {
      0%, 100% { transform: scale(0.85); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 1; }
    }

    .mini-square.capture-target::after {
      content: '';
      position: absolute;
      inset: 8%;
      z-index: 2;
      border-radius: 50%;
      border: 3.5px solid #f5c45e;
      box-shadow: 0 0 0 2px rgba(255, 249, 240, 0.8), 0 0 10px #f5c45e;
      animation: mini-ring-pulse 1.4s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes mini-ring-pulse {
      0%, 100% { transform: scale(0.92); opacity: 0.8; }
      50% { transform: scale(1.06); opacity: 1; }
    }

    .mini-legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 14px;
      font-size: 0.9rem;
      font-family: 'Quicksand', sans-serif;
      font-weight: 700;
      color: #d6ccf5;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .legend-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #b78aff;
      box-shadow: 0 0 6px #b78aff;
    }

    .legend-ring {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid #f5c45e;
      box-shadow: 0 0 6px #f5c45e;
    }

    /* ---- Move / Capture Explanations ---- */
    .move-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 18px;
    }

    .move-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 20px;
    }

    .move-box {
      background: #251c44;
      border: 2px solid rgba(183, 138, 255, 0.45);
    }

    .capture-box {
      background: #2b1f48;
      border: 2px solid rgba(245, 196, 94, 0.45);
    }

    .info-icon {
      font-size: 1.5rem;
      line-height: 1;
    }

    .move-info strong {
      display: block;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: #fff9f0;
      margin-bottom: 4px;
    }

    .move-info p {
      margin: 0;
      font-family: 'Quicksand', sans-serif;
      font-size: 0.92rem;
      font-weight: 600;
      line-height: 1.45;
      color: #d6ccf5;
    }

    /* ---- Actions ---- */
    .modal-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }

    .try-me-btn,
    .got-it-btn {
      width: 100%;
      min-height: 52px;
      border: none;
      cursor: pointer;
      font-family: 'Fredoka', 'Quicksand', sans-serif;
      font-size: 1.15rem;
      font-weight: 700;
      padding: 14px;
      border-radius: 20px;
      transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
    }

    .try-me-btn {
      color: #211200;
      background: linear-gradient(135deg, #f5c45e, #e5a82e);
      box-shadow: 0 6px 0 #925807, 0 10px 20px rgba(245, 196, 94, 0.4);
      animation: try-me-pulse 2s ease-in-out infinite;
    }

    @keyframes try-me-pulse {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .got-it-btn {
      color: #fff9f0;
      background: linear-gradient(135deg, #4f46e5, #352078);
      border: 2px solid rgba(183, 138, 255, 0.4);
      box-shadow: 0 6px 0 #1b1338;
    }

    .got-it-btn.secondary {
      color: #fff9f0;
      background: #251c44;
      border: 2px solid #b78aff;
      box-shadow: 0 5px 0 #120b24;
    }

    .try-me-btn:hover,
    .got-it-btn:hover {
      transform: translateY(-2px);
      filter: brightness(1.08);
    }

    .try-me-btn:active,
    .got-it-btn:active {
      transform: translateY(3px);
      box-shadow: none;
    }

    @media (max-width: 520px) {
      .piece-modal {
        padding: 22px 18px 20px;
        border-radius: 26px;
      }
      .move-info-grid {
        grid-template-columns: 1fr;
      }
      .modal-piece-img {
        width: 74px;
        height: 74px;
      }
      .modal-title-block h2 {
        font-size: 1.7rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .piece-modal,
      .modal-piece-img,
      .modal-piece-halo,
      .mini-piece,
      .mini-dot,
      .try-me-btn {
        animation: none !important;
      }
    }

  `]
})
export class KidsPiecePopupComponent {
  @Input() piece: KidPiece | null = null;
  @Input() showTryMe = false;
  @Output() closed = new EventEmitter<void>();
  @Output() tryMe = new EventEmitter<KidPiece>();

  readonly grid = KID_PIECE_GRID;
  readonly language = inject(KidsLanguageService);

  get ui() {
    return this.language.copy;
  }

  isCenter = isCenterSquare;
  isMove = isMoveSquare;
  isCapture = isCaptureSquare;

  pieceLabel(piece: KidPiece): string {
    return this.language.pieceLabel(piece);
  }

  pieceDetails(piece: KidPiece) {
    return this.language.pieceDetails(piece);
  }

  close(): void {
    this.closed.emit();
  }

  onTryMe(piece: KidPiece): void {
    this.tryMe.emit(piece);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.piece) {
      this.close();
    }
  }
}
