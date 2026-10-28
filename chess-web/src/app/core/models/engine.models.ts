export interface EngineEvaluation {
  depth: number;
  score: {
    type: 'cp' | 'mate'; // centipawns or mate in N
    value: number; // cp value (positive = white better) or mate moves
  };
  pv: string[]; // principal variation
  nodes?: number;
  nps?: number;
  time?: number;
  multipv?: number;
}

export interface EngineBestMove {
  move: string; // e.g., "e2e4"
  ponder?: string;
}

export interface EngineConfig {
  skillLevel?: number; // 0-20
  depth?: number;
  movetime?: number;
  multiPV?: number;
  threads?: number;
}

export type EngineStatus = 'uninitialized' | 'initializing' | 'ready' | 'thinking' | 'error';
