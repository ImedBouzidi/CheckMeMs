import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { EngineBestMove, EngineConfig, EngineEvaluation, EngineStatus } from '../models/engine.models';

@Injectable({
  providedIn: 'root'
})
export class StockfishEngineService {
  private worker: Worker | null = null;
  private status$ = new BehaviorSubject<EngineStatus>('uninitialized');
  private evaluation$ = new Subject<EngineEvaluation>();
  private bestMove$ = new Subject<EngineBestMove>();
  private ready = false;
  private isThinking = false;

  constructor() {}

  get status(): Observable<EngineStatus> {
    return this.status$.asObservable();
  }

  get evaluation(): Observable<EngineEvaluation> {
    return this.evaluation$.asObservable();
  }

  get bestMove(): Observable<EngineBestMove> {
    return this.bestMove$.asObservable();
  }

  init(workerPath: string = 'assets/stockfish/stockfish-19-single.js'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.worker) {
        resolve();
        return;
      }

      this.status$.next('initializing');
      
      try {
        this.worker = new Worker(workerPath);
        this.worker.onmessage = (event) => this.handleMessage(event.data);
        this.worker.onerror = (error) => {
          console.error('Stockfish worker error:', error);
          this.status$.next('error');
          reject(error);
        };

        this.send('uci');
        
        const checkReady = (data: string) => {
          if (typeof data === 'string') {
            if (data.includes('uciok')) {
              this.send('isready');
            } else if (data.includes('readyok')) {
              this.ready = true;
              this.status$.next('ready');
              this.worker!.removeEventListener('message', tempListener);
              resolve();
            }
          }
        };
        
        const tempListener = (event: MessageEvent) => checkReady(event.data);
        this.worker.addEventListener('message', tempListener);
        
        setTimeout(() => {
          if (!this.ready) {
            this.worker?.removeEventListener('message', tempListener);
            reject(new Error('Stockfish initialization timeout'));
          }
        }, 10000);
      } catch (error) {
        this.status$.next('error');
        reject(error);
      }
    });
  }

  private handleMessage(data: string) {
    if (typeof data !== 'string') return;
    
    if (data.startsWith('info')) {
      this.parseInfo(data);
    } else if (data.startsWith('bestmove')) {
      this.parseBestMove(data);
      this.isThinking = false;
      if (this.status$.value === 'thinking') {
        this.status$.next('ready');
      }
    }
  }

  private parseInfo(line: string) {
    try {
      const evaluation: Partial<EngineEvaluation> = {};
      
      const depthMatch = line.match(/depth (\d+)/);
      if (depthMatch) evaluation.depth = parseInt(depthMatch[1]);
      
      const cpMatch = line.match(/score cp (-?\d+)/);
      if (cpMatch) {
        evaluation.score = { type: 'cp', value: parseInt(cpMatch[1]) };
      }
      const mateMatch = line.match(/score mate (-?\d+)/);
      if (mateMatch) {
        evaluation.score = { type: 'mate', value: parseInt(mateMatch[1]) };
      }
      
      const pvIndex = line.indexOf(' pv ');
      if (pvIndex >= 0) {
        const pvPart = line.substring(pvIndex + 4);
        evaluation.pv = pvPart.trim().split(/\s+/).filter(x => x && x !== '(none)');
      }
      
      const nodesMatch = line.match(/nodes (\d+)/);
      if (nodesMatch) evaluation.nodes = parseInt(nodesMatch[1]);
      
      const npsMatch = line.match(/nps (\d+)/);
      if (npsMatch) evaluation.nps = parseInt(npsMatch[1]);
      
      const timeMatch = line.match(/time (\d+)/);
      if (timeMatch) evaluation.time = parseInt(timeMatch[1]);
      
      const multipvMatch = line.match(/multipv (\d+)/);
      if (multipvMatch) evaluation.multipv = parseInt(multipvMatch[1]);
      
      if (evaluation.depth !== undefined && evaluation.score) {
        this.evaluation$.next(evaluation as EngineEvaluation);
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  private parseBestMove(line: string) {
    try {
      const parts = line.trim().split(/\s+/);
      const moveStr = parts[1];
      
      if (!moveStr || moveStr === '(none)') {
        this.bestMove$.next({ move: '' });
        return;
      }
      
      const bestMove: EngineBestMove = {
        move: moveStr
      };
      if (parts[2] === 'ponder' && parts[3] && parts[3] !== '(none)') {
        bestMove.ponder = parts[3];
      }
      this.bestMove$.next(bestMove);
    } catch (e) {
      this.bestMove$.next({ move: '' });
    }
  }

  setPosition(fen: string) {
    this.send(`position fen ${fen}`);
  }

  setStartPosition() {
    this.send('position startpos');
  }

  go(config: EngineConfig = {}) {
    if (!this.ready || !this.worker) {
      return;
    }
    
    this.isThinking = true;
    this.status$.next('thinking');
    
    let command = 'go';
    if (config.depth) {
      command += ` depth ${config.depth}`;
    } else if (config.movetime) {
      command += ` movetime ${config.movetime}`;
    } else {
      command += ' depth 15';
    }
    
    if (config.multiPV) {
      this.send(`setoption name MultiPV value ${config.multiPV}`);
    }
    
    this.send(command);
  }

  goInfinite() {
    if (!this.ready || !this.worker) return;
    this.isThinking = true;
    this.status$.next('thinking');
    this.send('go infinite');
  }

  stop() {
    if (!this.worker) return;
    this.send('stop');
  }

  setSkillLevel(level: number) {
    const clampedLevel = Math.max(0, Math.min(20, level));
    this.send(`setoption name Skill Level value ${clampedLevel}`);
    if (clampedLevel < 20) {
      this.send('setoption name UCI_LimitStrength value true');
      const elo = 1320 + clampedLevel * 60;
      this.send(`setoption name UCI_Elo value ${elo}`);
    } else {
      this.send('setoption name UCI_LimitStrength value false');
    }
  }

  setThreads(threads: number) {
    this.send(`setoption name Threads value ${threads}`);
  }

  setHash(sizeMB: number) {
    this.send(`setoption name Hash value ${sizeMB}`);
  }

  newGame() {
    this.send('ucinewgame');
    this.send('isready');
  }

  quit() {
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
      this.status$.next('uninitialized');
    }
  }

  private send(command: string) {
    if (this.worker) {
      try {
        this.worker.postMessage(command);
      } catch (e) {
        // ignore
      }
    }
  }

  isReady(): boolean {
    return this.ready;
  }
}
