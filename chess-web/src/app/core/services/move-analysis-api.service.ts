import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, retry } from 'rxjs/operators';
import { Chess } from 'chess.js';
import { APP_CONFIG_TOKEN } from '../tokens/app-config.token';

export type AnalysisJobStatus = 'PENDING' | 'PROCESSING' | 'PARTIAL' | 'COMPLETED' | 'FAILED';

export type MoveGrade =
  | 'brilliant'
  | 'great'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'book'
  | 'forced';

/** Wire shape of `MoveAnalysisResponse` (evaluations are already mirrored to White). */
interface RawMoveAnalysis {
  ply: number | null;
  moveNumber: number | null;
  color: string | null;
  san: string | null;
  uci: string | null;
  fenBefore: string | null;
  fenAfter: string | null;
  evalBeforeCp: number | null;
  evalAfterCp: number | null;
  evalBeforeMate: number | null;
  evalAfterMate: number | null;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  cpLoss: number | null;
  classification: string | null;
  pv: string | null;
}

interface RawAnalysisResponse {
  requestId: string;
  gameId: string | null;
  status: AnalysisJobStatus;
  moveCount: number | null;
  moves: RawMoveAnalysis[] | null;
  summary: string | Record<string, unknown> | null;
  openingEco?: string | null;
  openingName?: string | null;
}

export interface ReviewedMove {
  ply: number;
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  evalBeforeCp: number | null;
  evalAfterCp: number | null;
  evalBeforeMate: number | null;
  evalAfterMate: number | null;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  cpLoss: number;
  grade: MoveGrade;
  pv: string | null;
}

export interface PlayerSummary {
  moves: number;
  totalCpLoss: number;
  averageCpLoss: number;
}

export interface AnalysisSummary {
  moves: number;
  depth: number;
  averageCpLoss: number;
  classifications: Partial<Record<MoveGrade, number>>;
  players: { white: PlayerSummary; black: PlayerSummary };
}

export interface AnalysisReport {
  requestId: string;
  gameId: string | null;
  status: AnalysisJobStatus;
  moveCount: number;
  moves: ReviewedMove[];
  summary: AnalysisSummary | null;
  /** The detected ECO opening, e.g. `{ eco: 'C60', name: 'Ruy Lopez' }`, or null when unnamed. */
  opening: { eco: string; name: string } | null;
}

/** The ECO line presented for one side of the board. */
export interface PlayerOpening {
  kind: 'opening' | 'defense';
  /** Translation key of the kind label. */
  labelKey: 'analysis.opening' | 'analysis.defense';
  eco: string;
  name: string;
}

/**
 * A game carries a single ECO classification, but the two sides read it differently: the White
 * player steered the opening (full line name, e.g. "Ruy Lopez: Closed"), while the Black player
 * adopted a defense (the named family, deep sub-lines like ", Main Line, Mieses Variation" that
 * describe related tactical plans are dropped).
 */
export function playerOpening(opening: AnalysisReport['opening'],
                              side: 'white' | 'black'): PlayerOpening | null {
  if (!opening) return null;
  if (side === 'white') {
    return { kind: 'opening', labelKey: 'analysis.opening', eco: opening.eco, name: opening.name };
  }
  return {
    kind: 'defense',
    labelKey: 'analysis.defense',
    eco: opening.eco,
    name: opening.name.split(',')[0].trim()
  };
}

export interface LiveFinalizeResponse {
  requestId: string;
  gameId: string;
  status: AnalysisJobStatus;
  expectedPlies: number;
  completedPlies: number;
}

export interface LiveMoveAnalysisRequest {
  gameId: string;
  ply: number;
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
}

const GRADES: MoveGrade[] = [
  'brilliant', 'great', 'good', 'inaccuracy', 'mistake', 'blunder', 'book', 'forced'
];

function toGrade(value: string | null): MoveGrade {
  const candidate = (value ?? 'good').toLowerCase() as MoveGrade;
  return GRADES.includes(candidate) ? candidate : 'good';
}

function isTerminal(status: AnalysisJobStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}

@Injectable({ providedIn: 'root' })
export class MoveAnalysisApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN);

  /**
   * Hand a finished game to the engine service; the job answers with its request id.
   * `gameId` identifies the game for idempotency and must be a UUID.
   */
  submit(pgn: string, gameId: string): Observable<{ requestId: string; status: AnalysisJobStatus }> {
    const url = `${this.config.apiBaseUrl}/analysis/submit`;
    return this.http.post<{ requestId: string; status: AnalysisJobStatus }>(url, { pgn, gameId });
  }

  submitLiveMove(request: LiveMoveAnalysisRequest): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      `${this.config.apiBaseUrl}/analysis/live-moves`,
      request
    );
  }

  /** Tell the engine service that no more moves will stream in for this game. */
  finalizeLive(gameId: string, expectedPlies: number,
                pgn: string): Observable<LiveFinalizeResponse> {
    return this.http.post<LiveFinalizeResponse>(
      `${this.config.apiBaseUrl}/analysis/games/${gameId}/live-moves/finalize`,
      { expectedPlies, pgn }
    );
  }

  fetch(requestId: string): Observable<AnalysisReport> {
    const url = `${this.config.apiBaseUrl}/analysis/${requestId}`;
    return this.http.get<RawAnalysisResponse>(url).pipe(map(raw => this.toReport(raw)));
  }

  fetchByGameId(gameId: string): Observable<AnalysisReport> {
    return this.http
      .get<RawAnalysisResponse>(`${this.config.apiBaseUrl}/analysis/games/${gameId}`)
      .pipe(
        retry({ count: 10, delay: 500 }),
        map(raw => this.toReport(raw))
      );
  }

  /**
   * Emits on every poll and completes once the job reaches a terminal status, so callers can
   * show live progress without wiring their own timer.
   */
  watch(requestId: string, intervalMs = 2000): Observable<AnalysisReport> {
    return this.pollUntilTerminal(() => this.fetch(requestId), intervalMs);
  }

  /** Same as `watch`, but for a game that was analysed ply by ply while it was played. */
  watchByGameId(gameId: string, intervalMs = 2000): Observable<AnalysisReport> {
    return this.pollUntilTerminal(
      () => this.http.get<RawAnalysisResponse>(`${this.config.apiBaseUrl}/analysis/games/${gameId}`)
        .pipe(map(raw => this.toReport(raw))),
      intervalMs
    );
  }

  private pollUntilTerminal(read: () => Observable<AnalysisReport>,
                             intervalMs: number): Observable<AnalysisReport> {
    return new Observable<AnalysisReport>(subscriber => {
      let cancelled = false;
      let timerId: ReturnType<typeof setTimeout> | undefined;

      const poll = () => {
        if (cancelled) return;
        read().subscribe({
          next: report => {
            subscriber.next(report);
            if (isTerminal(report.status)) {
              subscriber.complete();
              return;
            }
            if (!cancelled) timerId = setTimeout(poll, intervalMs);
          },
          error: error => subscriber.error(error)
        });
      };

      poll();

      return () => {
        cancelled = true;
        if (timerId) clearTimeout(timerId);
      };
    });
  }

  private toReport(raw: RawAnalysisResponse): AnalysisReport {
    const moves = (raw.moves ?? []).map(move => this.toReviewedMove(move));
    this.ensurePositions(moves);

    return {
      requestId: raw.requestId,
      gameId: raw.gameId ?? null,
      status: raw.status,
      moveCount: raw.moveCount ?? 0,
      moves,
      summary: this.parseSummary(raw.summary),
      opening: raw.openingEco || raw.openingName
        ? { eco: raw.openingEco ?? '', name: raw.openingName ?? '' }
        : null
    };
  }

  /**
   * Some deployments only return the engine fields. Rebuild the missing plies and FENs from
   * the move list so the board can always be rendered.
   */
  private ensurePositions(moves: ReviewedMove[]): void {
    if (!moves.length) return;

    const chess = new Chess();
    moves.forEach((move, index) => {
      if (!move.ply) move.ply = index + 1;

      if (move.fenBefore) {
        try { chess.load(move.fenBefore); } catch { /* keep the replay position */ }
      } else {
        move.fenBefore = chess.fen();
      }

      let applied = false;
      try {
        if (move.uci.length >= 4) {
          chess.move({
            from: move.uci.slice(0, 2),
            to: move.uci.slice(2, 4),
            promotion: move.uci.length > 4 ? move.uci[4] : undefined
          });
        } else if (move.san) {
          chess.move(move.san);
        }
        applied = true;
      } catch {
        applied = false;
      }

      if (!move.fenAfter) {
        move.fenAfter = applied ? chess.fen() : move.fenBefore;
      }
    });
  }

  private toReviewedMove(move: RawMoveAnalysis): ReviewedMove {
    return {
      ply: move.ply ?? 0,
      moveNumber: move.moveNumber ?? 0,
      color: move.color === 'black' ? 'black' : 'white',
      san: move.san ?? '',
      uci: move.uci ?? '',
      fenBefore: move.fenBefore ?? '',
      fenAfter: move.fenAfter ?? '',
      evalBeforeCp: move.evalBeforeCp,
      evalAfterCp: move.evalAfterCp,
      evalBeforeMate: move.evalBeforeMate,
      evalAfterMate: move.evalAfterMate,
      bestMoveUci: move.bestMoveUci,
      bestMoveSan: move.bestMoveSan,
      cpLoss: move.cpLoss ?? 0,
      grade: toGrade(move.classification),
      pv: move.pv
    };
  }

  private parseSummary(summary: string | Record<string, unknown> | null): AnalysisSummary | null {
    if (!summary) return null;

    try {
      const parsed = (typeof summary === 'string'
        ? JSON.parse(summary)
        : summary) as Partial<AnalysisSummary> & {
        players?: Record<string, Partial<PlayerSummary>>;
      };
      const white: Partial<PlayerSummary> = parsed.players?.white ?? {};
      const black: Partial<PlayerSummary> = parsed.players?.black ?? {};

      return {
        moves: parsed.moves ?? 0,
        depth: parsed.depth ?? 0,
        averageCpLoss: parsed.averageCpLoss ?? 0,
        classifications: this.toClassifications(parsed.classifications),
        players: {
          white: {
            moves: white.moves ?? 0,
            totalCpLoss: white.totalCpLoss ?? 0,
            averageCpLoss: white.averageCpLoss ?? 0
          },
          black: {
            moves: black.moves ?? 0,
            totalCpLoss: black.totalCpLoss ?? 0,
            averageCpLoss: black.averageCpLoss ?? 0
          }
        }
      };
    } catch {
      return null;
    }
  }

  private toClassifications(raw: unknown): Partial<Record<MoveGrade, number>> {
    const counts: Partial<Record<MoveGrade, number>> = {};
    if (!raw || typeof raw !== 'object') return counts;

    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      counts[toGrade(key)] = typeof value === 'number' ? value : 0;
    }
    return counts;
  }
}
