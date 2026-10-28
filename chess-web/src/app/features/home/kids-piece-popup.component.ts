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
      background: rgba(30, 41, 59, 0.55);
      backdrop-filter: blur(6px);
      animation: backdrop-in 0.2s ease;
    }

    @keyframes backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .piece-modal {
      position: relative;
      width: min(560px, 100%);
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 26px 26px 22px;
      border: 4px solid #ffffff;
      border-radius: 30px;
      background: linear-gradient(160deg, #ffffff, #fdf2f8 55%, #eef2ff);
      box-shadow: 0 16px 0 rgba(196, 181, 253, 0.85), 0 40px 70px -20px rgba(15, 23, 42, 0.6);
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
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 800;
      color: #7c2d12;
      background: #fef3c7;
      box-shadow: 0 3px 0 #fcd34d;
      transition: transform 0.18s ease, background 0.18s ease;
    }

    .modal-close:hover {
      transform: rotate(90deg) scale(1.08);
      background: #fde68a;
    }

    .piece-modal-header {
      position: relative;
      display: flex;
      align-items: center;
      gap: 16px;
      padding-right: 34px;
      margin-bottom: 18px;
    }

    .modal-piece-halo {
      position: absolute;
      left: -12px;
      top: -14px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle, #fde68a 0%, #fbcfe8 55%, transparent 72%);
      animation: halo-pulse 3.5s ease-in-out infinite;
    }

    @keyframes halo-pulse {
      0%, 100% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.08); opacity: 1; }
    }

    .modal-piece-img {
      position: relative;
      flex-shrink: 0;
      width: 96px;
      height: 96px;
      filter: drop-shadow(0 10px 12px rgba(99, 102, 241, 0.3));
      animation: modal-piece-float 2.6s ease-in-out infinite;
    }

    @keyframes modal-piece-float {
      0%, 100% { transform: translateY(0) rotate(-3deg); }
      50% { transform: translateY(-8px) rotate(3deg); }
    }

    .modal-title-block {
      position: relative;
    }

    .modal-emoji {
      font-size: 1.2rem;
    }

    .modal-title-block h2 {
      margin: 2px 0 4px;
      font-size: 2rem;
      line-height: 1.1;
      color: #1e293b;
    }

    .modal-title-block p {
      margin: 0;
      color: #64748b;
      line-height: 1.4;
      font-size: 0.92rem;
    }

    /* ---- Mini board diagram ---- */
    .mini-board-wrap {
      background: #ffffff;
      border-radius: 22px;
      padding: 16px;
      box-shadow: inset 0 0 0 3px #f3e8ff;
    }

    .mini-board {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      width: 100%;
      max-width: 320px;
      margin: 0 auto;
      border: 4px solid #a78bfa;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 6px 0 rgba(167, 139, 250, 0.5);
    }

    .mini-square {
      position: relative;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff7cc;
    }

    .mini-square.dark {
      background: #c4b5fd;
    }

    .mini-square.center-square {
      background: #fef08a;
      box-shadow: inset 0 0 0 3px #f59e0b;
      z-index: 2;
    }

    .mini-piece {
      width: 78%;
      height: 78%;
      filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.25));
      animation: mini-piece-bob 1.8s ease-in-out infinite;
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
      filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.25));
    }

    .mini-dot {
      width: 32%;
      height: 32%;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.75);
      animation: mini-dot-pulse 1.2s ease-in-out infinite;
    }

    @keyframes mini-dot-pulse {
      0%, 100% { transform: scale(0.85); opacity: 0.7; }
      50% { transform: scale(1.2); opacity: 1; }
    }

    .mini-square.capture-target::after {
      content: '';
      position: absolute;
      inset: 7%;
      z-index: 2;
      border-radius: 50%;
      border: 4px solid #ec4899;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.75);
      animation: mini-ring-pulse 1.2s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes mini-ring-pulse {
      0%, 100% { transform: scale(0.92); opacity: 0.7; }
      50% { transform: scale(1.06); opacity: 1; }
    }

    .mini-legend {
      display: flex;
      justify-content: center;
      gap: 18px;
      flex-wrap: wrap;
      margin-top: 12px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #475569;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
    }

    .legend-ring {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      border: 3px solid #ec4899;
    }

    /* ---- Move / capture explanations ---- */
    .move-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }

    .move-info {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px;
      border-radius: 16px;
    }

    .move-box {
      background: #ecfdf5;
      border: 2px solid #a7f3d0;
    }

    .capture-box {
      background: #fdf2f8;
      border: 2px solid #fbcfe8;
    }

    .info-icon {
      font-size: 1.35rem;
      line-height: 1;
    }

    .move-info strong {
      display: block;
      font-size: 0.9rem;
      color: #1e293b;
      margin-bottom: 3px;
    }

    .move-info p {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.4;
      color: #475569;
    }

    /* ---- Actions ---- */
    .modal-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 16px;
    }

    .try-me-btn,
    .got-it-btn {
      width: 100%;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 1.05rem;
      font-weight: 800;
      padding: 13px;
      border-radius: 16px;
      transition: transform 0.15s ease, filter 0.15s ease;
    }

    .try-me-btn {
      color: #ffffff;
      background: linear-gradient(135deg, #22c55e, #06b6d4);
      box-shadow: 0 6px 0 #15803d;
      animation: try-me-pulse 1.8s ease-in-out infinite;
    }

    @keyframes try-me-pulse {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }

    .got-it-btn {
      color: #ffffff;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      box-shadow: 0 6px 0 #6d28d9;
    }

    .got-it-btn.secondary {
      color: #6d28d9;
      background: #ffffff;
      border: 2px solid #ddd6fe;
      box-shadow: 0 5px 0 #ddd6fe;
    }

    .try-me-btn:hover,
    .got-it-btn:hover {
      transform: translateY(-2px);
      filter: brightness(1.05);
    }

    .try-me-btn:active,
    .got-it-btn:active {
      transform: translateY(3px);
      box-shadow: none;
    }

    @media (max-width: 600px) {
      .piece-modal {
        padding: 20px 16px 18px;
        border-radius: 24px;
      }
      .piece-modal-header {
        gap: 12px;
        padding-right: 30px;
      }
      .modal-piece-img {
        width: 72px;
        height: 72px;
      }
      .modal-title-block h2 {
        font-size: 1.6rem;
      }
      .mini-board-wrap {
        padding: 12px;
      }
      .move-info-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .piece-modal,
      .piece-modal-backdrop,
      .modal-piece-img,
      .modal-piece-halo,
      .mini-piece,
      .mini-dot,
      .mini-square.capture-target::after,
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
