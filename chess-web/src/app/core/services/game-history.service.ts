import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chess } from 'chess.js';
import { APP_CONFIG_TOKEN } from '../tokens/app-config.token';
import { AuthService } from './auth.service';
import { StorageScopeService } from './storage-scope.service';

export type GameOutcome = 'win' | 'loss' | 'draw';

export interface GameHistoryEntry {
  /** Stable id for local entries; remote entries use `remote-<uuid>`. */
  id: string;
  remoteId: string | null;
  pgn: string;
  result: GameOutcome;
  reason: string;
  playerColor: 'white' | 'black';
  opponent: string;
  skillLevel: number | null;
  timeControl: string;
  playedAt: string;
  plies: number;
  analysisRequestId: string | null;
  analysisStatus: string | null;
  source: 'local' | 'remote';
}

export interface NewGameHistory {
  pgn: string;
  result: GameOutcome;
  reason: string;
  playerColor: 'white' | 'black';
  opponent: string;
  skillLevel?: number | null;
  timeControl: string;
  playedAt?: string;
  plies: number;
  analysisRequestId?: string | null;
}

interface RemoteGame {
  id: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  ownerId: string | null;
  pgn: string | null;
  result: string | null;
  status: string | null;
  mode: string | null;
  timeControl: string | null;
  metadata: string | null;
  submittedForAnalysis: boolean | null;
  analysisStatus: string | null;
  analysisRequestId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface RemotePage {
  content: RemoteGame[];
}

interface GameMetadata {
  opponent?: string;
  playerColor?: 'white' | 'black';
  reason?: string;
  plies?: number;
  skillLevel?: number;
}

const STORAGE_KEY = 'checkme.games.history.v1';
const MAX_LOCAL_GAMES = 40;

@Injectable({ providedIn: 'root' })
export class GameHistoryService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageScopeService);

  private readonly localState = signal<GameHistoryEntry[]>(this.readLocal());
  private readonly remoteState = signal<GameHistoryEntry[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal(false);

  constructor() {
    // Switching accounts swaps the whole history; a sign-in also pulls the server copy.
    effect(() => {
      this.storage.scope();
      this.localState.set(this.readLocal());
      this.loadRemote();
    });
  }

  /** Local games win over their remote copies so the review link is never lost. */
  readonly games = computed(() => mergeGames(this.localState(), this.remoteState()));
  readonly loading = this.loadingState.asReadonly();
  readonly remoteError = this.errorState.asReadonly();

  readonly stats = computed(() => {
    const games = this.games();
    const played = games.length;
    const wins = games.filter(game => game.result === 'win').length;
    const losses = games.filter(game => game.result === 'loss').length;
    const draws = games.filter(game => game.result === 'draw').length;
    const analysed = games.filter(game => !!game.analysisRequestId).length;

    return {
      played,
      wins,
      losses,
      draws,
      analysed,
      winRate: played ? Math.round((wins / played) * 100) : 0
    };
  });

  /** Persist a finished game on this device, then mirror it to games-service when signed in. */
  recordGame(input: NewGameHistory): string {
    const entry: GameHistoryEntry = {
      id: createId(),
      remoteId: null,
      pgn: input.pgn,
      result: input.result,
      reason: input.reason,
      playerColor: input.playerColor,
      opponent: input.opponent,
      skillLevel: input.skillLevel ?? null,
      timeControl: input.timeControl,
      playedAt: input.playedAt ?? new Date().toISOString(),
      plies: input.plies,
      analysisRequestId: input.analysisRequestId ?? null,
      analysisStatus: input.analysisRequestId ? 'REQUESTED' : null,
      source: 'local'
    };

    this.localState.update(games => [entry, ...games].slice(0, MAX_LOCAL_GAMES));
    this.persist();
    this.syncToServer(entry);
    return entry.id;
  }

  attachAnalysis(id: string | null, requestId: string): void {
    if (!id) return;

    const patch = (game: GameHistoryEntry): GameHistoryEntry =>
      game.id === id
        ? { ...game, analysisRequestId: requestId, analysisStatus: 'REQUESTED' }
        : game;

    this.localState.update(games => games.map(patch));
    this.remoteState.update(games => games.map(patch));
    this.persist();
  }

  updateAnalysisStatus(id: string, status: string): void {
    const patch = (game: GameHistoryEntry): GameHistoryEntry =>
      game.id === id ? { ...game, analysisStatus: status } : game;

    this.localState.update(games => games.map(patch));
    this.remoteState.update(games => games.map(patch));
    this.persist();
  }

  /** Merge the signed-in player's games from games-service with the local device history. */
  loadRemote(): void {
    if (!this.auth.isAuthenticated()) {
      this.remoteState.set([]);
      this.errorState.set(false);
      this.loadingState.set(false);
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(false);

    this.http
      .get<RemotePage>(`${this.config.apiBaseUrl}/games?size=20&sort=createdAt,desc`)
      .subscribe({
        next: page => {
          this.remoteState.set((page.content ?? []).map(game => this.fromRemote(game)));
          this.loadingState.set(false);
        },
        error: () => {
          this.remoteState.set([]);
          this.errorState.set(true);
          this.loadingState.set(false);
        }
      });
  }

  private syncToServer(entry: GameHistoryEntry): void {
    if (!this.auth.isAuthenticated()) return;

    const user = this.auth.currentUser();
    if (!user) return;

    const metadata: GameMetadata = {
      opponent: entry.opponent,
      playerColor: entry.playerColor,
      reason: entry.reason,
      plies: entry.plies,
      skillLevel: entry.skillLevel ?? undefined
    };

    const body = {
      pgn: entry.pgn,
      whitePlayerId: entry.playerColor === 'white' ? user.id : 'stockfish',
      blackPlayerId: entry.playerColor === 'black' ? user.id : 'stockfish',
      result: this.remoteResult(entry),
      status: 'COMPLETED',
      mode: 'BOT',
      timeControl: entry.timeControl,
      metadata: JSON.stringify(metadata),
      submitForAnalysis: false
    };

    this.http.post<RemoteGame>(`${this.config.apiBaseUrl}/games`, body).subscribe({
      next: remote => {
        this.localState.update(games =>
          games.map(game => (game.id === entry.id ? { ...game, remoteId: remote.id } : game))
        );
        this.persist();
      },
      // A failed sync must never lose the local record.
      error: () => undefined
    });
  }

  private fromRemote(game: RemoteGame): GameHistoryEntry {
    const metadata = parseMetadata(game.metadata);
    const user = this.auth.currentUser();
    const userIds = [user?.id, user?.username].filter((value): value is string => !!value);

    let playerColor: 'white' | 'black' = metadata.playerColor ?? 'white';
    if (!metadata.playerColor && userIds.length) {
      if (game.blackPlayerId && userIds.includes(game.blackPlayerId)) {
        playerColor = 'black';
      } else if (game.whitePlayerId && userIds.includes(game.whitePlayerId)) {
        playerColor = 'white';
      }
    }

    const opponent =
      metadata.opponent ??
      (playerColor === 'white' ? game.blackPlayerId : game.whitePlayerId) ??
      'Stockfish';

    return {
      id: `remote-${game.id}`,
      remoteId: game.id,
      pgn: game.pgn ?? '',
      result: this.outcome(game.result, playerColor),
      reason: metadata.reason ?? '',
      playerColor,
      opponent,
      skillLevel: metadata.skillLevel ?? null,
      timeControl: game.timeControl ?? '',
      playedAt: game.endedAt ?? game.createdAt ?? new Date().toISOString(),
      plies: metadata.plies ?? countPlies(game.pgn ?? ''),
      analysisRequestId: game.analysisRequestId,
      analysisStatus: game.analysisStatus,
      source: 'remote'
    };
  }

  private outcome(result: string | null, playerColor: 'white' | 'black'): GameOutcome {
    if (result === 'WHITE_WIN') return playerColor === 'white' ? 'win' : 'loss';
    if (result === 'BLACK_WIN') return playerColor === 'black' ? 'win' : 'loss';
    return 'draw';
  }

  private remoteResult(entry: GameHistoryEntry): string {
    if (entry.result === 'draw') return 'DRAW';
    if (entry.result === 'win') {
      return entry.playerColor === 'white' ? 'WHITE_WIN' : 'BLACK_WIN';
    }
    return entry.playerColor === 'white' ? 'BLACK_WIN' : 'WHITE_WIN';
  }

  private persist(): void {
    this.storage.write(STORAGE_KEY, this.localState());
  }

  private readLocal(): GameHistoryEntry[] {
    const parsed = this.storage.read<unknown>(STORAGE_KEY);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, MAX_LOCAL_GAMES);
  }
}

function mergeGames(
  local: GameHistoryEntry[],
  remote: GameHistoryEntry[]
): GameHistoryEntry[] {
  const seen = new Set<string>();
  const merged: GameHistoryEntry[] = [];

  for (const game of local) {
    const key = game.remoteId ?? game.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(game);
  }

  for (const game of remote) {
    const key = game.remoteId ?? game.id;
    if (seen.has(key)) continue;
    if (local.some(entry => entry.pgn && entry.pgn === game.pgn)) continue;
    seen.add(key);
    merged.push(game);
  }

  return merged.sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt));
}

function isEntry(value: unknown): value is GameHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<GameHistoryEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.pgn === 'string' &&
    (entry.result === 'win' || entry.result === 'loss' || entry.result === 'draw') &&
    (entry.playerColor === 'white' || entry.playerColor === 'black') &&
    typeof entry.playedAt === 'string'
  );
}

function parseMetadata(raw: string | null): GameMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as GameMetadata;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function countPlies(pgn: string): number {
  if (!pgn) return 0;
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.history().length;
  } catch {
    return 0;
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
