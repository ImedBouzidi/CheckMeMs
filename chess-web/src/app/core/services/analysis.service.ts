import { Injectable } from '@angular/core';
import { Chess } from 'chess.js';

export interface MoveAnalysis {
  moveNumber: number;
  color: 'white' | 'black';
  move: string;
  san: string;
  evalBefore: number | null; // centipawns from side to move perspective
  evalAfter: number | null;
  bestMove: string | null;
  bestMoveSan: string | null;
  difference: number | null;
  classification: 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book' | 'forced';
  cpLoss: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  constructor() {}

  classifyMove(cpBefore: number | null, cpAfter: number | null, isBestMove: boolean): { classification: MoveAnalysis['classification'], cpLoss: number } {
    if (cpBefore === null || cpAfter === null) {
      return { classification: 'book', cpLoss: 0 };
    }

    if (isBestMove) {
      return { classification: 'good', cpLoss: 0 };
    }

    const cpLoss = Math.max(0, cpBefore - cpAfter);
    
    if (cpLoss < 10) {
      return { classification: 'good', cpLoss };
    } else if (cpLoss < 30) {
      return { classification: 'inaccuracy', cpLoss };
    } else if (cpLoss < 100) {
      return { classification: 'mistake', cpLoss };
    } else {
      return { classification: 'blunder', cpLoss };
    }
  }

  getWinChance(cp: number): number {
    // Convert centipawns to win percentage using Lichess formula
    const winChance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
    return Math.max(0, Math.min(100, winChance));
  }

  formatEvaluation(cp: number | null, mate: number | null = null): string {
    if (mate !== null) {
      if (mate > 0) {
        return `M${mate}`;
      } else {
        return `M${mate}`;
      }
    }
    if (cp === null) return '0.00';
    const score = cp / 100;
    if (score >= 0) {
      return `+${score.toFixed(2)}`;
    }
    return score.toFixed(2);
  }

  getEvaluationBarPercentage(cp: number | null, mate: number | null = null): number {
    if (mate !== null) {
      // Mate in favor of white
      if (mate > 0) return 95;
      if (mate < 0) return 5;
    }
    if (cp === null) return 50;
    // Use sigmoid to convert cp to percentage
    const winChance = this.getWinChance(cp);
    return winChance;
  }
}
