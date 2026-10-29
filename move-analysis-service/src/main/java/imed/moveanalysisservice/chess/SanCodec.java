package imed.moveanalysisservice.chess;

import java.util.ArrayList;
import java.util.List;

/** Converts between SAN strings and board moves, in both directions. */
public final class SanCodec {

    private static final String PIECE_LETTERS = "NBRQK";

    private SanCodec() {
    }

    public static String toSan(ChessBoard board, ChessBoard.Move move) {
        if (move.kind() == ChessBoard.MoveKind.CASTLE_KING) {
            return withSuffix(board, move, "O-O");
        }
        if (move.kind() == ChessBoard.MoveKind.CASTLE_QUEEN) {
            return withSuffix(board, move, "O-O-O");
        }
        char piece = Character.toUpperCase(move.piece());
        boolean pawn = piece == 'P';
        boolean capture = move.captured() != 0 || move.kind() == ChessBoard.MoveKind.EN_PASSANT;
        StringBuilder san = new StringBuilder(8);
        if (pawn) {
            if (capture) {
                san.append((char) ('a' + move.from() % 8)).append('x');
            }
        } else {
            san.append(piece).append(disambiguation(board, move));
            if (capture) {
                san.append('x');
            }
        }
        san.append(ChessBoard.squareName(move.to()));
        if (move.promotion() != 0) {
            san.append('=').append(move.promotion());
        }
        return withSuffix(board, move, san.toString());
    }

    public static ChessBoard.Move fromSan(ChessBoard board, String notation) {
        String san = notation.trim()
                .replaceAll("[!?]+$", "")
                .replace("0-0-0", "O-O-O")
                .replace("0-0", "O-O")
                .replace("e.p.", "")
                .replace("+", "")
                .replace("#", "")
                .replaceAll("\\s+", "");
        if (san.isBlank()) {
            throw new IllegalArgumentException("Empty SAN move");
        }
        List<ChessBoard.Move> candidates = board.legalMoves();
        if (san.startsWith("O-O")) {
            ChessBoard.MoveKind kind = san.length() > 3 ? ChessBoard.MoveKind.CASTLE_QUEEN
                    : ChessBoard.MoveKind.CASTLE_KING;
            return candidates.stream()
                    .filter(move -> move.kind() == kind)
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Illegal castling move: " + notation));
        }
        char piece = 'P';
        String rest = san;
        if (!san.isEmpty() && PIECE_LETTERS.indexOf(san.charAt(0)) >= 0) {
            piece = san.charAt(0);
            rest = san.substring(1);
        }
        char promotion = 0;
        int equals = rest.indexOf('=');
        if (equals >= 0) {
            promotion = Character.toUpperCase(rest.charAt(equals + 1));
            rest = rest.substring(0, equals) + rest.substring(equals + 2);
        }
        if (rest.length() < 2) {
            throw new IllegalArgumentException("Malformed SAN move: " + notation);
        }
        int target = ChessBoard.squareIndex(rest.substring(rest.length() - 2));
        if (target < 0) {
            throw new IllegalArgumentException("Malformed SAN destination: " + notation);
        }
        String prefix = rest.substring(0, rest.length() - 2).replace("x", "");
        int fileFilter = prefix.matches(".*[a-h].*") ? prefix.replaceAll("[^a-h]", "").charAt(0) - 'a' : -1;
        int rankFilter = prefix.matches(".*[1-8].*") ? prefix.replaceAll("[^1-8]", "").charAt(0) - '1' : -1;

        List<ChessBoard.Move> matches = new ArrayList<>(4);
        for (ChessBoard.Move move : candidates) {
            if (Character.toUpperCase(move.piece()) != piece || move.to() != target) {
                continue;
            }
            if (Character.toUpperCase(move.promotion()) != promotion) {
                continue;
            }
            if (fileFilter >= 0 && move.from() % 8 != fileFilter) {
                continue;
            }
            if (rankFilter >= 0 && move.from() / 8 != rankFilter) {
                continue;
            }
            matches.add(move);
        }
        if (matches.size() != 1) {
            throw new IllegalArgumentException(matches.isEmpty()
                    ? "Illegal move: " + notation
                    : "Ambiguous SAN move: " + notation);
        }
        return matches.get(0);
    }

    public static ChessBoard.Move fromUci(ChessBoard board, String uci) {
        if (uci == null || uci.isBlank()) {
            return null;
        }
        String wanted = uci.trim().toLowerCase().replace("=", "");
        for (ChessBoard.Move move : board.legalMoves()) {
            if (move.uci().equals(wanted)) {
                return move;
            }
        }
        return null;
    }

    private static String disambiguation(ChessBoard board, ChessBoard.Move move) {
        List<ChessBoard.Move> rivals = new ArrayList<>();
        for (ChessBoard.Move other : board.legalMoves()) {
            if (other.piece() == move.piece() && other.to() == move.to() && other.from() != move.from()) {
                rivals.add(other);
            }
        }
        if (rivals.isEmpty()) {
            return "";
        }
        int file = move.from() % 8;
        int rank = move.from() / 8;
        boolean sharesFile = rivals.stream().anyMatch(rival -> rival.from() % 8 == file);
        boolean sharesRank = rivals.stream().anyMatch(rival -> rival.from() / 8 == rank);
        if (!sharesFile) {
            return String.valueOf((char) ('a' + file));
        }
        if (!sharesRank) {
            return String.valueOf(rank + 1);
        }
        return ChessBoard.squareName(move.from());
    }

    private static String withSuffix(ChessBoard board, ChessBoard.Move move, String san) {
        ChessBoard next = board.copy();
        next.apply(move);
        if (!next.inCheck()) {
            return san;
        }
        return san + (next.hasLegalMoves() ? "+" : "#");
    }
}
