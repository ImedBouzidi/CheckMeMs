import { computed, effect, Injectable, inject, signal } from '@angular/core';
import type { TranslationKey } from '../i18n/app-i18n';
import { StorageScopeService } from './storage-scope.service';

export interface PuzzleTrack {
  id: string;
  icon: string;
  labelKey: TranslationKey;
  total: number;
  accent: 'blue' | 'gold' | 'green' | 'slate';
}

export const PUZZLE_TRACKS: ReadonlyArray<PuzzleTrack> = [
  { id: 'fork', icon: 'call_split', labelKey: 'puzzles.fork', total: 12, accent: 'blue' },
  { id: 'pin', icon: 'push_pin', labelKey: 'puzzles.pin', total: 10, accent: 'gold' },
  { id: 'back-rank', icon: 'vertical_align_top', labelKey: 'puzzles.backRank', total: 8, accent: 'green' },
  { id: 'discovered', icon: 'flare', labelKey: 'puzzles.discovered', total: 10, accent: 'slate' },
  { id: 'endgame', icon: 'flag', labelKey: 'puzzles.endgame', total: 12, accent: 'blue' }
];

interface PuzzleState {
  solved: Record<string, number>;
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
  lastPlayedAt: string | null;
}

const STORAGE_KEY = 'checkme.puzzles.progress.v1';

const EMPTY_STATE: PuzzleState = {
  solved: {},
  attempts: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayedAt: null
};

/**
 * Puzzle progress is device-local for now. The shape is ready to be swapped for a
 * `puzzle_attempts(user_id, puzzle_id, solved_at)` table when puzzle-service lands.
 */
@Injectable({ providedIn: 'root' })
export class PuzzleProgressService {
  private readonly storage = inject(StorageScopeService);

  private readonly state = signal<PuzzleState>(this.readState());

  constructor() {
    effect(() => {
      this.storage.scope();
      this.state.set(this.readState());
    });
  }

  readonly progress = this.state.asReadonly();

  readonly totalSolved = computed(() =>
    Object.values(this.state().solved).reduce((sum, count) => sum + count, 0)
  );

  readonly totalPuzzles = PUZZLE_TRACKS.reduce((sum, track) => sum + track.total, 0);

  readonly accuracy = computed(() => {
    const state = this.state();
    return state.attempts > 0 ? Math.round((state.correct / state.attempts) * 100) : 0;
  });

  solvedCount(trackId: string): number {
    return this.state().solved[trackId] ?? 0;
  }

  trackPercent(track: PuzzleTrack): number {
    if (track.total <= 0) return 0;
    return Math.round((this.solvedCount(track.id) / track.total) * 100);
  }

  recordAttempt(trackId: string, success: boolean): void {
    const current = this.state();
    const solved = { ...current.solved };

    if (success) {
      solved[trackId] = Math.min(this.trackTotal(trackId), (solved[trackId] ?? 0) + 1);
    }

    const streak = success ? current.streak + 1 : 0;

    this.write({
      solved,
      attempts: current.attempts + 1,
      correct: current.correct + (success ? 1 : 0),
      streak,
      bestStreak: Math.max(current.bestStreak, streak),
      lastPlayedAt: new Date().toISOString()
    });
  }

  reset(): void {
    this.write({ ...EMPTY_STATE, solved: {} });
  }

  private trackTotal(trackId: string): number {
    return PUZZLE_TRACKS.find(track => track.id === trackId)?.total ?? Number.MAX_SAFE_INTEGER;
  }

  private write(next: PuzzleState): void {
    this.state.set(next);
    this.storage.write(STORAGE_KEY, next);
  }

  private readState(): PuzzleState {
    const parsed = this.storage.read<Partial<PuzzleState>>(STORAGE_KEY);
    if (!parsed) return { ...EMPTY_STATE, solved: {} };

    return {
      solved: parsed.solved && typeof parsed.solved === 'object' ? parsed.solved : {},
      attempts: numberOrZero(parsed.attempts),
      correct: numberOrZero(parsed.correct),
      streak: numberOrZero(parsed.streak),
      bestStreak: numberOrZero(parsed.bestStreak),
      lastPlayedAt: typeof parsed.lastPlayedAt === 'string' ? parsed.lastPlayedAt : null
    };
  }
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}
