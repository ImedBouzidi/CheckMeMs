import { Component, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { Chessboard, COLOR, INPUT_EVENT_TYPE } from 'cm-chessboard';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-board',
  standalone: true,
  template: `
    <div class="board-shell">
      <div
        #boardElement
        class="board-container"
        role="application"
        aria-label="Interactive chess board">
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .board-shell {
      width: 100%;
      max-width: 640px;
      margin: 0 auto;
      padding: clamp(6px, 1vw, 12px);
      border: 1px solid rgba(203, 213, 225, 0.8);
      border-radius: 18px;
      background: #ffffff;
      box-shadow: var(--cm-shadow);
    }

    .board-container {
      width: 100%;
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 10px;
      background: #243528;
    }
  `]
})
export class BoardComponent implements AfterViewInit {
  @ViewChild('boardElement', { static: true }) boardElement!: ElementRef;
  @Input() fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  board!: Chessboard;
  chess = new Chess();

  ngAfterViewInit(): void {
    this.chess.load(this.fen);
    this.board = new Chessboard(this.boardElement.nativeElement, {
      position: this.fen,
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
        }
      }
      return true;
    });
  }
}
