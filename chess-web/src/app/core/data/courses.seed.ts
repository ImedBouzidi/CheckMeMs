import { Course, START_FEN } from '../models/course.models';

/**
 * Seed curriculum for Slice 1.
 *
 * Rules the UI relies on:
 * - `foundations` is the free course and stays fully playable.
 * - Premium courses keep their first lesson open as a teaser.
 *
 * Every task FEN must be legal and every solution SAN must be legal from that
 * FEN; see the checks in the plan before adding content.
 */
export const COURSES: Course[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    summary: 'Learn how the pieces move, what a good move looks like, and how to win your first game.',
    level: 'beginner',
    tier: 'free',
    icon: 'school',
    accent: 'blue',
    modules: [
      {
        id: 'first-steps',
        title: 'First steps',
        summary: 'The board, the pawns, and the minor pieces.',
        lessons: [
          {
            id: 'meet-the-board',
            title: 'Meet the board',
            summary: 'Squares, the centre, and your first move.',
            estimatedMinutes: 6,
            steps: [
              {
                kind: 'text',
                title: 'A board of 64 squares',
                text:
                  'Chess is played on an 8x8 board. Files are the columns a to h; ranks are the rows 1 to 8. ' +
                  'White starts at the bottom, black at the top.'
              },
              {
                kind: 'position',
                title: 'The centre matters',
                text:
                  'The four squares in the middle are e4, d4, e5 and d5. Pieces placed in the centre reach more squares.',
                fen: START_FEN,
                highlights: ['e4', 'd4', 'e5', 'd5']
              },
              {
                kind: 'text',
                title: 'Know what the pieces are worth',
                text:
                  'Pawn 1, knight 3, bishop 3, rook 5, queen 9. The king is priceless. ' +
                  'These numbers are a guide, not a rule.'
              },
              {
                kind: 'task',
                title: 'Your first move',
                text: 'Play the pawn in front of your king forward two squares.',
                fen: START_FEN,
                solution: ['e4'],
                hint: 'The pawn on e2 can move two squares on its first move.',
                success: 'e4! You took space in the centre.'
              },
              {
                kind: 'text',
                title: 'Recap',
                text:
                  'Control the centre, develop your pieces, and keep your king safe. ' +
                  'That is the whole opening in one sentence.'
              }
            ]
          },
          {
            id: 'how-the-pawn-moves',
            title: 'How the pawn moves',
            summary: 'Forward, two squares once, and captures on the diagonal.',
            estimatedMinutes: 6,
            steps: [
              {
                kind: 'text',
                title: 'Straight ahead, one square',
                text:
                  'Pawns move forward one square. On their first move they may move two. ' +
                  'They can never move backwards.'
              },
              {
                kind: 'position',
                title: 'A double step',
                text:
                  'The e-pawn jumps from e2 to e4. Notice how it passes through e3 without stopping there.',
                fen: START_FEN,
                arrows: [{ from: 'e2', to: 'e4' }],
                highlights: ['e4']
              },
              {
                kind: 'task',
                title: 'Try the double step',
                fen: START_FEN,
                solution: ['e4'],
                hint: 'Move the pawn two squares in one go.'
              },
              {
                kind: 'task',
                title: 'Captures happen sideways',
                text: 'The white pawn on e4 attacks d5 and f5. Capture the black pawn on d5.',
                fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                solution: ['exd5'],
                hint: 'Pawns capture one square diagonally forward.'
              },
              {
                kind: 'text',
                title: 'One job per pawn',
                text: 'Pawns are slow but they hold the structure together. Every pawn move creates a permanent weakness.'
              }
            ]
          },
          {
            id: 'knights-and-bishops',
            title: 'Knights and bishops',
            summary: 'The two pieces you develop first.',
            estimatedMinutes: 7,
            steps: [
              {
                kind: 'text',
                title: 'Two different movers',
                text:
                  'A knight moves in an L: two squares one way, one square the other. It jumps over pieces. ' +
                  'A bishop moves diagonally and needs open lines.'
              },
              {
                kind: 'position',
                title: 'Develop toward the centre',
                text: 'Knights belong on f3 and c3. Bishops want long diagonals.',
                fen: START_FEN,
                arrows: [
                  { from: 'g1', to: 'f3' },
                  { from: 'b1', to: 'c3' }
                ],
                highlights: ['f3', 'c3']
              },
              {
                kind: 'task',
                title: 'Develop a knight',
                text: 'White has played e4 and black replied e5. Bring a knight toward the centre.',
                fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                solution: ['Nf3'],
                hint: 'The g1 knight can jump to f3.'
              },
              {
                kind: 'task',
                title: 'Develop a bishop',
                text: 'The knight is out and black has answered with Nc6. Put the bishop on its best diagonal.',
                fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
                solution: ['Bc4'],
                hint: 'From c4 the bishop aims at f7.'
              },
              {
                kind: 'text',
                title: 'A simple opening',
                text: '1.e4 e5 2.Nf3 Nc6 3.Bc4 is the Italian. You already know the ideas behind it.'
              }
            ]
          }
        ]
      },
      {
        id: 'first-wins',
        title: 'First wins',
        summary: 'Checks, captures, threats, and mate.',
        lessons: [
          {
            id: 'checks-captures-threats',
            title: 'Checks, captures, threats',
            summary: 'The three forcing moves.',
            estimatedMinutes: 7,
            steps: [
              {
                kind: 'text',
                title: 'Look for forcing moves',
                text:
                  'A check, a capture, or a threat limits what your opponent can do. ' +
                  'When you are lost for a plan, calculate these first.'
              },
              {
                kind: 'position',
                title: 'The weakest square',
                text:
                  'The bishop on c4 stares at f7. That pawn is defended only by the king, which makes it a natural target.',
                fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
                arrows: [{ from: 'c4', to: 'f7', tone: 'warning' }],
                highlights: ['f7']
              },
              {
                kind: 'task',
                title: 'Take the free pawn',
                text: 'The black pawn on d5 is hanging. Win it.',
                fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
                solution: ['exd5'],
                hint: 'The e4 pawn attacks d5.'
              },
              {
                kind: 'text',
                title: 'Check the forcing order',
                text: 'Checks first, then captures, then threats. Most tactics are found in that order.'
              }
            ]
          },
          {
            id: 'checkmate-in-one',
            title: 'Checkmate in one',
            summary: 'Finish the game with a back-rank mate.',
            estimatedMinutes: 8,
            steps: [
              {
                kind: 'text',
                title: 'What checkmate is',
                text:
                  'Checkmate is a check the king cannot escape: it cannot move, block, or capture the attacker. ' +
                  'The game ends immediately.'
              },
              {
                kind: 'position',
                title: 'The back rank',
                text:
                  'The black king is trapped behind its own pawns. A rook on the eighth rank is enough.',
                fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
                arrows: [{ from: 'a1', to: 'a8', tone: 'success' }],
                highlights: ['a8', 'g8']
              },
              {
                kind: 'task',
                title: 'Deliver mate',
                text: 'White to move. Mate in one.',
                fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
                solution: ['Ra8#'],
                hint: 'Slide the rook to the eighth rank.',
                success: 'Ra8# — the king has no escape.'
              },
              {
                kind: 'text',
                title: 'Why it works',
                text:
                  'The pawns on f7, g7 and h7 take away the king’s own squares. ' +
                  'That is why we say to keep an eye on your back rank.'
              }
            ]
          },
          {
            id: 'your-first-game',
            title: 'Your first game',
            summary: 'Three opening rules and a checklist.',
            estimatedMinutes: 5,
            steps: [
              {
                kind: 'text',
                title: 'Three rules for the opening',
                text:
                  '1. Put a pawn in the centre. 2. Develop your knights and bishops. 3. Castle early. ' +
                  'Do not bring the queen out too soon.'
              },
              {
                kind: 'position',
                title: 'A healthy start',
                text: 'e4, Nf3 and Bc4: centre, development, and a target on f7.',
                fen: START_FEN,
                arrows: [
                  { from: 'e2', to: 'e4' },
                  { from: 'g1', to: 'f3' },
                  { from: 'f1', to: 'c4' }
                ]
              },
              {
                kind: 'text',
                title: 'Your checklist',
                text:
                  'Every move ask: is my king safe, is anything hanging, and can my opponent check or capture something?'
              },
              {
                kind: 'task',
                title: 'Start the game',
                text: 'Play the move you should make on move one.',
                fen: START_FEN,
                solution: ['e4'],
                hint: 'Claim the centre.'
              },
              {
                kind: 'text',
                title: 'You are ready',
                text: 'Play a game against the bot, then come back and review it. That loop is how you improve.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'tactical-patterns',
    title: 'Tactical Patterns',
    summary: 'Forks, pins and skewers: the three ideas behind most tactical wins.',
    level: 'intermediate',
    tier: 'premium',
    icon: 'bolt',
    accent: 'gold',
    modules: [
      {
        id: 'win-material',
        title: 'Patterns that win material',
        summary: 'Train your eye on the three most common tactics.',
        lessons: [
          {
            id: 'the-fork',
            title: 'The fork',
            summary: 'One piece, two targets.',
            estimatedMinutes: 6,
            steps: [
              {
                kind: 'text',
                title: 'Attack two things at once',
                text:
                  'A fork is a single move that attacks two targets. The opponent can only save one, ' +
                  'so you win the other.'
              },
              {
                kind: 'position',
                title: 'A knight fork',
                text: 'The knight on b5 can jump to c7, hitting the king on e8 and the rook on a8.',
                fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
                highlights: ['a8', 'e8'],
                arrows: [{ from: 'b5', to: 'c7', tone: 'success' }]
              },
              {
                kind: 'task',
                title: 'Find the fork',
                text: 'White to move. Attack the king and the rook with one move.',
                fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
                solution: ['Nc7+'],
                hint: 'Which square lets the knight touch both a8 and e8?',
                success: 'Nc7+ forks the king and the rook.'
              },
              {
                kind: 'text',
                title: 'Check first',
                text: 'Forks that come with check are strongest, because the opponent must answer the check before saving the other piece.'
              }
            ]
          },
          {
            id: 'the-pin',
            title: 'The pin',
            summary: 'Freeze a piece against something more valuable.',
            estimatedMinutes: 7,
            steps: [
              {
                kind: 'text',
                title: 'Do not move',
                text:
                  'A pinned piece cannot move without exposing something more valuable behind it. ' +
                  'Pins work best on a king or a queen.'
              },
              {
                kind: 'position',
                title: 'Line up bishop and king',
                text: 'The bishop on f1 can use the b5-e8 diagonal to pin the c6 knight to the king.',
                fen: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1',
                arrows: [{ from: 'f1', to: 'b5', tone: 'success' }],
                highlights: ['c6', 'e8']
              },
              {
                kind: 'task',
                title: 'Play the pin',
                text: 'White to move. Pin the knight.',
                fen: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1',
                solution: ['Bb5'],
                hint: 'The diagonal from f1 runs through c4 to b5.',
                success: 'Bb5 pins the knight to the king.'
              },
              {
                kind: 'text',
                title: 'Pile up on it',
                text: 'A pin is not a win by itself. Bring another piece to attack the pinned piece.'
              }
            ]
          },
          {
            id: 'the-skewer',
            title: 'The skewer',
            summary: 'The pin in reverse.',
            estimatedMinutes: 6,
            steps: [
              {
                kind: 'text',
                title: 'The valuable piece moves first',
                text:
                  'In a skewer the valuable piece is in front. You check it, it steps aside, and you take what was behind it.'
              },
              {
                kind: 'position',
                title: 'King in front, queen behind',
                text: 'The black king shields the queen on a8. A check on the a-file will win the queen.',
                fen: 'q7/8/8/k7/8/8/8/R5K1 w - - 0 1',
                arrows: [{ from: 'a1', to: 'a3', tone: 'success' }],
                highlights: ['a8', 'a5']
              },
              {
                kind: 'task',
                title: 'Start the skewer',
                text: 'White to move. Check the king so the queen is exposed.',
                fen: 'q7/8/8/k7/8/8/8/R5K1 w - - 0 1',
                solution: ['Ra3+'],
                hint: 'Stay on the a-file, but keep your distance from the king.',
                success: 'Ra3+ and the queen on a8 falls next.'
              },
              {
                kind: 'text',
                title: 'Look along lines',
                text: 'Skewers and pins both live on ranks, files and diagonals. Scan the lines of the long-range pieces.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'endgame-essentials',
    title: 'Endgame Essentials',
    summary: 'Turn a small advantage into a win: pawns, rooks, and avoiding stalemate.',
    level: 'advanced',
    tier: 'premium',
    icon: 'emoji_events',
    accent: 'green',
    modules: [
      {
        id: 'convert',
        title: 'Convert your advantage',
        summary: 'The endings that decide close games.',
        lessons: [
          {
            id: 'king-and-pawn',
            title: 'King and pawn',
            summary: 'Promote the pawn and use your king.',
            estimatedMinutes: 8,
            steps: [
              {
                kind: 'text',
                title: 'A pawn wants to promote',
                text:
                  'Reaching the eighth rank turns a pawn into a queen. In king and pawn endings, ' +
                  'the king must escort the pawn.'
              },
              {
                kind: 'position',
                title: 'One step away',
                text: 'The pawn on a7 is one move from promotion. The black king is too far away to stop it.',
                fen: '8/P7/8/8/8/k7/8/7K w - - 0 1',
                arrows: [{ from: 'a7', to: 'a8', tone: 'success' }],
                highlights: ['a8']
              },
              {
                kind: 'task',
                title: 'Promote',
                text: 'White to move. Make a queen.',
                fen: '8/P7/8/8/8/k7/8/7K w - - 0 1',
                solution: ['a8=Q'],
                hint: 'Push the pawn to the last rank.',
                success: 'A new queen — and it already gives check.'
              },
              {
                kind: 'text',
                title: 'The king matters',
                text: 'In the endgame the king is a fighting piece. Activate it before you push pawns.'
              }
            ]
          },
          {
            id: 'rook-cut-off',
            title: 'Rook cut-off',
            summary: 'Use the rook to trap the king.',
            estimatedMinutes: 9,
            steps: [
              {
                kind: 'text',
                title: 'Build a wall',
                text:
                  'A rook can cut the board in half. Keep the enemy king on one side and march your own king forward.'
              },
              {
                kind: 'position',
                title: 'Check from the side',
                text: 'The rook checks along the fifth rank and pushes the black king back.',
                fen: '8/8/8/7k/8/8/8/R3K3 w - - 0 1',
                arrows: [{ from: 'a1', to: 'a5', tone: 'success' }],
                highlights: ['a5', 'h5']
              },
              {
                kind: 'task',
                title: 'Cut the king off',
                text: 'White to move. Give check and take the fifth rank.',
                fen: '8/8/8/7k/8/8/8/R3K3 w - - 0 1',
                solution: ['Ra5+'],
                hint: 'Slide the rook up the a-file.',
                success: 'Ra5+ cuts the king off along the fifth rank.'
              },
              {
                kind: 'text',
                title: 'Then walk in',
                text: 'With the king cut off, bring your own king closer. The rook does the fencing; the king does the work.'
              }
            ]
          },
          {
            id: 'avoid-stalemate',
            title: 'Avoid stalemate',
            summary: 'Do not turn a win into a draw.',
            estimatedMinutes: 6,
            steps: [
              {
                kind: 'text',
                title: 'The draw you did not see',
                text:
                  'Stalemate is when the side to move has no legal move and is not in check. ' +
                  'The game is drawn, even with a queen on the board.'
              },
              {
                kind: 'position',
                title: 'A stalemate trap',
                text: 'Black to move. The king has no legal move and is not in check — this is stalemate.',
                fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
                highlights: ['h8', 'g8', 'h7', 'g7']
              },
              {
                kind: 'text',
                title: 'Give the king a square',
                text:
                  'When you are winning, always check whether the opponent has a legal move. ' +
                  'Leave one escape square until you are ready to mate.'
              },
              {
                kind: 'task',
                title: 'Mate, not stalemate',
                text: 'White to move. Finish the game.',
                fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
                solution: ['Qg7#'],
                hint: 'The queen can mate next to the king because your king defends it.',
                success: 'Qg7# — mate, not stalemate.'
              }
            ]
          }
        ]
      }
    ]
  }
];
