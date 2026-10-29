package imed.moveanalysisservice.chess;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Standard chess board: FEN input/output, legal move generation and move application. Small enough
 * to stay dependency free; enough to replay a full game and translate engine moves back to SAN.
 */
public final class ChessBoard {

    public static final String START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    private static final char EMPTY = '.';
    private static final int WHITE_KING_SIDE = 1;
    private static final int WHITE_QUEEN_SIDE = 2;
    private static final int BLACK_KING_SIDE = 4;
    private static final int BLACK_QUEEN_SIDE = 8;

    /** {rank delta, file delta} pairs. */
    private static final int[][] KNIGHT_STEPS = {
            {2, 1}, {2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2}, {-2, 1}, {-2, -1}};
    private static final int[][] KING_STEPS = {
            {0, 1}, {0, -1}, {1, 0}, {-1, 0}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
    private static final int[][] ROOK_STEPS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    private static final int[][] BISHOP_STEPS = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};

    public enum MoveKind {
        NORMAL,
        DOUBLE_PAWN,
        EN_PASSANT,
        CASTLE_KING,
        CASTLE_QUEEN
    }

    public record Move(int from, int to, char piece, char captured, char promotion, MoveKind kind) {

        public String uci() {
            return ChessBoard.squareName(from) + ChessBoard.squareName(to)
                    + (promotion == 0 ? "" : String.valueOf(promotion).toLowerCase());
        }
    }

    private final char[] squares = new char[64];
    private boolean whiteToMove = true;
    private int castlingRights;
    private int enPassantTarget = -1;
    private int halfmoveClock;
    private int fullmoveNumber = 1;

    ChessBoard() {
        Arrays.fill(squares, EMPTY);
    }

    public static ChessBoard fromFen(String fen) {
        String[] fields = fen.trim().split("\\s+");
        if (fields.length < 1 || fields[0].isBlank()) {
            throw new IllegalArgumentException("Blank FEN");
        }
        ChessBoard board = new ChessBoard();
        String[] rows = fields[0].split("/");
        if (rows.length != 8) {
            throw new IllegalArgumentException("Malformed FEN placement: " + fen);
        }
        for (int row = 0; row < 8; row++) {
            int rank = 7 - row;
            int file = 0;
            for (char token : rows[row].toCharArray()) {
                if (Character.isDigit(token)) {
                    file += token - '0';
                } else if (file < 8) {
                    board.squares[rank * 8 + file++] = token;
                } else {
                    throw new IllegalArgumentException("Malformed FEN placement: " + fen);
                }
            }
            if (file != 8) {
                throw new IllegalArgumentException("Malformed FEN rank: " + fen);
            }
        }
        if (fields.length > 1) {
            board.whiteToMove = !"b".equalsIgnoreCase(fields[1]);
        }
        if (fields.length > 2) {
            for (char right : fields[2].toCharArray()) {
                switch (right) {
                    case 'K' -> board.castlingRights |= WHITE_KING_SIDE;
                    case 'Q' -> board.castlingRights |= WHITE_QUEEN_SIDE;
                    case 'k' -> board.castlingRights |= BLACK_KING_SIDE;
                    case 'q' -> board.castlingRights |= BLACK_QUEEN_SIDE;
                    default -> {
                    }
                }
            }
        }
        if (fields.length > 3 && fields[3].length() >= 2 && !"-".equals(fields[3])) {
            board.enPassantTarget = squareIndex(fields[3].substring(0, 2));
        }
        if (fields.length > 4) {
            board.halfmoveClock = parseInt(fields[4], 0);
        }
        if (fields.length > 5) {
            board.fullmoveNumber = Math.max(1, parseInt(fields[5], 1));
        }
        return board;
    }

    public ChessBoard copy() {
        ChessBoard clone = new ChessBoard();
        System.arraycopy(squares, 0, clone.squares, 0, 64);
        clone.whiteToMove = whiteToMove;
        clone.castlingRights = castlingRights;
        clone.enPassantTarget = enPassantTarget;
        clone.halfmoveClock = halfmoveClock;
        clone.fullmoveNumber = fullmoveNumber;
        return clone;
    }

    public String toFen() {
        StringBuilder placement = new StringBuilder(80);
        for (int rank = 7; rank >= 0; rank--) {
            int gaps = 0;
            for (int file = 0; file < 8; file++) {
                char piece = squares[rank * 8 + file];
                if (piece == EMPTY) {
                    gaps++;
                } else {
                    if (gaps > 0) {
                        placement.append(gaps);
                        gaps = 0;
                    }
                    placement.append(piece);
                }
            }
            if (gaps > 0) {
                placement.append(gaps);
            }
            if (rank > 0) {
                placement.append('/');
            }
        }
        return placement
                + (whiteToMove ? " w " : " b ")
                + castlingField()
                + " " + enPassantField()
                + " " + halfmoveClock
                + " " + fullmoveNumber;
    }

    public boolean whiteToMove() {
        return whiteToMove;
    }

    public int fullmoveNumber() {
        return fullmoveNumber;
    }

    public List<Move> legalMoves() {
        List<Move> legal = new ArrayList<>(48);
        for (Move candidate : pseudoLegalMoves()) {
            boolean moverIsWhite = isWhitePiece(candidate.piece());
            ChessBoard next = copy();
            next.apply(candidate);
            int king = next.kingSquare(moverIsWhite);
            if (king < 0 || !next.isAttacked(king, !moverIsWhite)) {
                legal.add(candidate);
            }
        }
        return legal;
    }

    public boolean inCheck() {
        int king = kingSquare(whiteToMove);
        return king >= 0 && isAttacked(king, !whiteToMove);
    }

    public boolean hasLegalMoves() {
        return !legalMoves().isEmpty();
    }

    int kingSquare(boolean white) {
        char king = white ? 'K' : 'k';
        for (int index = 0; index < 64; index++) {
            if (squares[index] == king) {
                return index;
            }
        }
        return -1;
    }

    /** True when {@code square} is attacked by any piece of the given colour. */
    public boolean isAttacked(int square, boolean byWhite) {
        int rank = square / 8;
        int file = square % 8;
        char pawn = byWhite ? 'P' : 'p';
        int pawnRank = byWhite ? rank - 1 : rank + 1;
        if (pawnRank >= 0 && pawnRank <= 7) {
            if (file >= 1 && squares[pawnRank * 8 + file - 1] == pawn) {
                return true;
            }
            if (file <= 6 && squares[pawnRank * 8 + file + 1] == pawn) {
                return true;
            }
        }
        if (stepMatches(square, KNIGHT_STEPS, byWhite ? 'N' : 'n')) {
            return true;
        }
        if (stepMatches(square, KING_STEPS, byWhite ? 'K' : 'k')) {
            return true;
        }
        char rook = byWhite ? 'R' : 'r';
        char bishop = byWhite ? 'B' : 'b';
        char queen = byWhite ? 'Q' : 'q';
        for (int[] step : ROOK_STEPS) {
            char first = firstAlong(square, step);
            if (first == rook || first == queen) {
                return true;
            }
        }
        for (int[] step : BISHOP_STEPS) {
            char first = firstAlong(square, step);
            if (first == bishop || first == queen) {
                return true;
            }
        }
        return false;
    }

    public void apply(Move move) {
        char piece = squares[move.from()];
        boolean white = Character.isUpperCase(piece);
        boolean pawn = Character.toUpperCase(piece) == 'P';
        squares[move.from()] = EMPTY;
        switch (move.kind()) {
            case EN_PASSANT -> {
                squares[move.to()] = piece;
                squares[move.to() + (white ? -8 : 8)] = EMPTY;
            }
            case CASTLE_KING -> {
                squares[move.to()] = piece;
                squares[move.to() - 1] = white ? 'R' : 'r';
                squares[move.to() + 1] = EMPTY;
            }
            case CASTLE_QUEEN -> {
                squares[move.to()] = piece;
                squares[move.to() + 1] = white ? 'R' : 'r';
                squares[move.to() - 2] = EMPTY;
            }
            default -> squares[move.to()] = move.promotion() == 0
                    ? piece
                    : (white ? move.promotion() : Character.toLowerCase(move.promotion()));
        }
        updateCastlingRights(move, piece);
        enPassantTarget = move.kind() == MoveKind.DOUBLE_PAWN ? (move.from() + move.to()) / 2 : -1;
        halfmoveClock = pawn || move.captured() != 0 ? 0 : halfmoveClock + 1;
        if (!white) {
            fullmoveNumber++;
        }
        whiteToMove = !whiteToMove;
    }

    private void updateCastlingRights(Move move, char piece) {
        if (piece == 'K') {
            castlingRights &= ~(WHITE_KING_SIDE | WHITE_QUEEN_SIDE);
        } else if (piece == 'k') {
            castlingRights &= ~(BLACK_KING_SIDE | BLACK_QUEEN_SIDE);
        }
        switch (move.from()) {
            case 0 -> castlingRights &= ~WHITE_QUEEN_SIDE;
            case 7 -> castlingRights &= ~WHITE_KING_SIDE;
            case 56 -> castlingRights &= ~BLACK_QUEEN_SIDE;
            case 63 -> castlingRights &= ~BLACK_KING_SIDE;
            default -> {
            }
        }
        switch (move.to()) {
            case 0 -> castlingRights &= ~WHITE_QUEEN_SIDE;
            case 7 -> castlingRights &= ~WHITE_KING_SIDE;
            case 56 -> castlingRights &= ~BLACK_QUEEN_SIDE;
            case 63 -> castlingRights &= ~BLACK_KING_SIDE;
            default -> {
            }
        }
    }

    private List<Move> pseudoLegalMoves() {
        List<Move> moves = new ArrayList<>(64);
        for (int from = 0; from < 64; from++) {
            char piece = squares[from];
            if (piece == EMPTY || isWhitePiece(piece) != whiteToMove) {
                continue;
            }
            switch (Character.toUpperCase(piece)) {
                case 'P' -> pawnMoves(from, piece, moves);
                case 'N' -> stepMoves(from, piece, KNIGHT_STEPS, moves);
                case 'K' -> {
                    stepMoves(from, piece, KING_STEPS, moves);
                    castleMoves(from, piece, moves);
                }
                case 'B' -> slideMoves(from, piece, BISHOP_STEPS, moves);
                case 'R' -> slideMoves(from, piece, ROOK_STEPS, moves);
                case 'Q' -> {
                    slideMoves(from, piece, BISHOP_STEPS, moves);
                    slideMoves(from, piece, ROOK_STEPS, moves);
                }
                default -> {
                }
            }
        }
        return moves;
    }

    private void pawnMoves(int from, char piece, List<Move> moves) {
        boolean white = isWhitePiece(piece);
        int rank = from / 8;
        int file = from % 8;
        int forward = white ? 1 : -1;
        int targetRank = rank + forward;
        int promotionRank = white ? 7 : 0;
        int startRank = white ? 1 : 6;
        if (targetRank >= 0 && targetRank <= 7) {
            int one = targetRank * 8 + file;
            if (squares[one] == EMPTY) {
                if (targetRank == promotionRank) {
                    addPromotions(from, one, piece, (char) 0, MoveKind.NORMAL, moves);
                } else {
                    moves.add(new Move(from, one, piece, (char) 0, (char) 0, MoveKind.NORMAL));
                    int twoRank = rank + 2 * forward;
                    int two = twoRank * 8 + file;
                    if (rank == startRank && squares[two] == EMPTY) {
                        moves.add(new Move(from, two, piece, (char) 0, (char) 0, MoveKind.DOUBLE_PAWN));
                    }
                }
            }
            for (int deltaFile : new int[]{-1, 1}) {
                int targetFile = file + deltaFile;
                if (targetFile < 0 || targetFile > 7) {
                    continue;
                }
                int capture = targetRank * 8 + targetFile;
                if (capture == enPassantTarget && enPassantVictimOnSquare(capture, white)) {
                    moves.add(new Move(from, capture, piece, white ? 'p' : 'P', (char) 0, MoveKind.EN_PASSANT));
                } else if (squares[capture] != EMPTY && isWhitePiece(squares[capture]) != white) {
                    if (targetRank == promotionRank) {
                        addPromotions(from, capture, piece, squares[capture], MoveKind.NORMAL, moves);
                    } else {
                        moves.add(new Move(from, capture, piece, squares[capture], (char) 0, MoveKind.NORMAL));
                    }
                }
            }
        }
    }

    private void addPromotions(int from, int to, char piece, char captured, MoveKind kind, List<Move> moves) {
        for (char promotion : new char[]{'Q', 'R', 'B', 'N'}) {
            moves.add(new Move(from, to, piece, captured, promotion, kind));
        }
    }

    private void stepMoves(int from, char piece, int[][] steps, List<Move> moves) {
        boolean white = isWhitePiece(piece);
        int rank = from / 8;
        int file = from % 8;
        for (int[] step : steps) {
            int target = targetSquare(rank + step[0], file + step[1]);
            if (target < 0) {
                continue;
            }
            if (squares[target] == EMPTY || isWhitePiece(squares[target]) != white) {
                moves.add(new Move(from, target, piece,
                        squares[target] == EMPTY ? (char) 0 : squares[target], (char) 0, MoveKind.NORMAL));
            }
        }
    }

    private void slideMoves(int from, char piece, int[][] steps, List<Move> moves) {
        boolean white = isWhitePiece(piece);
        int rank = from / 8;
        int file = from % 8;
        for (int[] step : steps) {
            for (int current = rank + step[0], delta = file + step[1];
                 targetSquare(current, delta) >= 0;
                 current += step[0], delta += step[1]) {
                int to = targetSquare(current, delta);
                if (squares[to] == EMPTY) {
                    moves.add(new Move(from, to, piece, (char) 0, (char) 0, MoveKind.NORMAL));
                    continue;
                }
                if (isWhitePiece(squares[to]) != white) {
                    moves.add(new Move(from, to, piece, squares[to], (char) 0, MoveKind.NORMAL));
                }
                break;
            }
        }
    }

    private void castleMoves(int from, char piece, List<Move> moves) {
        if (from != (whiteToMove ? 4 : 60)) {
            return;
        }
        if (whiteToMove) {
            if ((castlingRights & WHITE_KING_SIDE) != 0 && squares[7] == 'R'
                    && squares[5] == EMPTY && squares[6] == EMPTY
                    && !isAttacked(4, false) && !isAttacked(5, false) && !isAttacked(6, false)) {
                moves.add(new Move(4, 6, piece, (char) 0, (char) 0, MoveKind.CASTLE_KING));
            }
            if ((castlingRights & WHITE_QUEEN_SIDE) != 0 && squares[0] == 'R'
                    && squares[1] == EMPTY && squares[2] == EMPTY && squares[3] == EMPTY
                    && !isAttacked(4, false) && !isAttacked(3, false) && !isAttacked(2, false)) {
                moves.add(new Move(4, 2, piece, (char) 0, (char) 0, MoveKind.CASTLE_QUEEN));
            }
        } else {
            if ((castlingRights & BLACK_KING_SIDE) != 0 && squares[63] == 'r'
                    && squares[61] == EMPTY && squares[62] == EMPTY
                    && !isAttacked(60, true) && !isAttacked(61, true) && !isAttacked(62, true)) {
                moves.add(new Move(60, 62, piece, (char) 0, (char) 0, MoveKind.CASTLE_KING));
            }
            if ((castlingRights & BLACK_QUEEN_SIDE) != 0 && squares[56] == 'r'
                    && squares[57] == EMPTY && squares[58] == EMPTY && squares[59] == EMPTY
                    && !isAttacked(60, true) && !isAttacked(59, true) && !isAttacked(58, true)) {
                moves.add(new Move(60, 58, piece, (char) 0, (char) 0, MoveKind.CASTLE_QUEEN));
            }
        }
    }

    private boolean stepMatches(int square, int[][] steps, char expected) {
        int rank = square / 8;
        int file = square % 8;
        for (int[] step : steps) {
            int target = targetSquare(rank + step[0], file + step[1]);
            if (target >= 0 && squares[target] == expected) {
                return true;
            }
        }
        return false;
    }

    private char firstAlong(int square, int[] step) {
        int rank = square / 8 + step[0];
        int file = square % 8 + step[1];
        while (true) {
            int target = targetSquare(rank, file);
            if (target < 0) {
                return EMPTY;
            }
            if (squares[target] != EMPTY) {
                return squares[target];
            }
            rank += step[0];
            file += step[1];
        }
    }

    /**
     * The pawn that just double-pushed sits on the same file, directly behind the ep target; it is
     * the only piece an en passant capture may remove.
     */
    private boolean enPassantVictimOnSquare(int target, boolean byWhite) {
        int victimRank = byWhite ? target / 8 - 1 : target / 8 + 1;
        if (victimRank < 0 || victimRank > 7) {
            return false;
        }
        return squares[victimRank * 8 + target % 8] == (byWhite ? 'p' : 'P');
    }

    /**
     * The FEN ep field is written only when a capture is actually available, which is what
     * chess.com and lichess exports do, so replayed FENs stay byte-identical to the source game.
     */
    private boolean enPassantCaptureAvailable(int target, boolean byWhite) {
        int capturerRank = byWhite ? target / 8 - 1 : target / 8 + 1;
        if (capturerRank < 0 || capturerRank > 7) {
            return false;
        }
        char capturer = byWhite ? 'P' : 'p';
        int file = target % 8;
        return (file >= 1 && squares[capturerRank * 8 + file - 1] == capturer)
                || (file <= 6 && squares[capturerRank * 8 + file + 1] == capturer);
    }

    private String enPassantField() {
        if (enPassantTarget < 0 || !enPassantCaptureAvailable(enPassantTarget, whiteToMove)) {
            return "-";
        }
        return squareName(enPassantTarget);
    }

    private String castlingField() {
        StringBuilder field = new StringBuilder(4);
        if ((castlingRights & WHITE_KING_SIDE) != 0) {
            field.append('K');
        }
        if ((castlingRights & WHITE_QUEEN_SIDE) != 0) {
            field.append('Q');
        }
        if ((castlingRights & BLACK_KING_SIDE) != 0) {
            field.append('k');
        }
        if ((castlingRights & BLACK_QUEEN_SIDE) != 0) {
            field.append('q');
        }
        return field.isEmpty() ? "-" : field.toString();
    }

    private static int targetSquare(int rank, int file) {
        return rank < 0 || rank > 7 || file < 0 || file > 7 ? -1 : rank * 8 + file;
    }

    private static boolean isWhitePiece(char piece) {
        return Character.isUpperCase(piece);
    }

    public static String squareName(int index) {
        return "" + (char) ('a' + index % 8) + (index / 8 + 1);
    }

    public static int squareIndex(String name) {
        if (name.length() < 2) {
            return -1;
        }
        return targetSquare(name.charAt(1) - '1', name.charAt(0) - 'a');
    }

    private static int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }
}
