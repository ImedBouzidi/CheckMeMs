export interface KidPiece {
  name: string;
  image: string;
  emoji: string;
  tip: string;
  color: string;
  moveText: string;
  captureText: string;
  moves: string[];
  captures: string[];
}

export const KID_PIECES: KidPiece[] = [
  {
    name: 'Pawn',
    image: 'wP',
    emoji: '🐣',
    tip: 'The little hero of the chess board.',
    color: '#bbf7d0',
    moveText: 'Steps forward one square. On its very first move, it can take a big two-square step.',
    captureText: 'Captures one square diagonally in front of it — never straight ahead.',
    moves: ['2,1', '2,0'],
    captures: ['1,1', '3,1']
  },
  {
    name: 'Knight',
    image: 'wN',
    emoji: '🐴',
    tip: 'The only piece that can jump over others!',
    color: '#bfdbfe',
    moveText: 'Jumps in an L shape: two squares one way, then one square to the side.',
    captureText: 'Captures whatever it lands on — even if pieces are in the way.',
    moves: ['0,1', '1,0', '3,0', '4,1', '0,3', '1,4', '3,4', '4,3'],
    captures: ['0,1', '4,3']
  },
  {
    name: 'Bishop',
    image: 'wB',
    emoji: '🎩',
    tip: 'A sliding piece that loves diagonals.',
    color: '#ddd6fe',
    moveText: 'Slides diagonally as far as the board lets it go.',
    captureText: 'Captures an enemy piece anywhere along its diagonal path.',
    moves: ['0,0', '1,1', '3,3', '4,4', '0,4', '1,3', '3,1', '4,0'],
    captures: ['0,0', '4,4']
  },
  {
    name: 'Rook',
    image: 'wR',
    emoji: '🏰',
    tip: 'A castle tower that guards straight lines.',
    color: '#fde68a',
    moveText: 'Slides in straight lines: up, down, left, or right.',
    captureText: 'Captures along its row or column. It cannot jump over pieces.',
    moves: ['0,2', '1,2', '3,2', '4,2', '2,0', '2,1', '2,3', '2,4'],
    captures: ['4,2', '2,0']
  },
  {
    name: 'Queen',
    image: 'wQ',
    emoji: '👑',
    tip: 'The most powerful piece on the board!',
    color: '#fbcfe8',
    moveText: 'Slides straight or diagonally — as far as she likes.',
    captureText: 'Captures in any direction along a straight line of squares.',
    moves: [
      '0,0', '1,1', '3,3', '4,4', '0,4', '1,3', '3,1', '4,0',
      '0,2', '1,2', '3,2', '4,2', '2,0', '2,1', '2,3', '2,4'
    ],
    captures: ['4,4', '0,2', '2,0']
  },
  {
    name: 'King',
    image: 'wK',
    emoji: '🤴',
    tip: 'The most important piece — keep him safe!',
    color: '#fecaca',
    moveText: 'Moves just one square in any direction.',
    captureText: 'Captures one square away, but never move into check!',
    moves: ['1,1', '1,2', '1,3', '2,1', '2,3', '3,1', '3,2', '3,3'],
    captures: ['1,1', '3,3']
  }
];

export const KID_PIECE_GRID = [0, 1, 2, 3, 4];

export function isCenterSquare(col: number, row: number): boolean {
  return col === 2 && row === 2;
}

export function isMoveSquare(piece: KidPiece, col: number, row: number): boolean {
  if (isCenterSquare(col, row)) return false;
  const key = `${col},${row}`;
  return piece.moves.includes(key) && !piece.captures.includes(key);
}

export function isCaptureSquare(piece: KidPiece, col: number, row: number): boolean {
  return piece.captures.includes(`${col},${row}`);
}
