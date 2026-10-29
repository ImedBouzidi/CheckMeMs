package imed.moveanalysisservice.chess;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Replays a PGN move list into one record per ply, with the FEN before and after every move. */
public final class PgnReplay {

    public record Ply(int ply, int moveNumber, String color, String san, String uci,
                      String fenBefore, String fenAfter) {
    }

    private static final Pattern TAG_PAIR = Pattern.compile("(?m)^\\s*\\[[^\\]]*]\\s*$");
    private static final Pattern BRACE_COMMENT = Pattern.compile("\\{[^}]*}");
    private static final Pattern LINE_COMMENT = Pattern.compile("(?m);[^\\n]*");
    private static final Pattern NAG = Pattern.compile("\\$\\d+");
    private static final Pattern INNERMOST_VARIATION = Pattern.compile("\\([^()]*\\)");
    private static final Pattern MOVE_NUMBER = Pattern.compile("\\d+\\.{1,3}");
    private static final Pattern FEN_TAG = Pattern.compile("\\[\\s*FEN\\s+\"([^\"]+)\"");

    private static final List<String> RESULTS = List.of("1-0", "0-1", "1/2-1/2", "*");

    private PgnReplay() {
    }

    public static List<Ply> replay(String pgn) {
        ChessBoard board = ChessBoard.fromFen(startFen(pgn));
        List<Ply> plies = new ArrayList<>();
        int ply = 0;
        for (String notation : sanMoves(pgn)) {
            ply++;
            String fenBefore = board.toFen();
            int moveNumber = board.fullmoveNumber();
            boolean white = board.whiteToMove();
            ChessBoard.Move move = SanCodec.fromSan(board, notation);
            String san = SanCodec.toSan(board, move);
            board.apply(move);
            plies.add(new Ply(ply, moveNumber, white ? "white" : "black", san, move.uci(),
                    fenBefore, board.toFen()));
        }
        return plies;
    }

    public static String startFen(String pgn) {
        Matcher matcher = FEN_TAG.matcher(pgn);
        if (matcher.find()) {
            String fen = matcher.group(1).trim();
            if (!fen.isEmpty()) {
                return fen;
            }
        }
        return ChessBoard.START_FEN;
    }

    public static List<String> sanMoves(String pgn) {
        String body = TAG_PAIR.matcher(pgn).replaceAll(" ");
        body = LINE_COMMENT.matcher(body).replaceAll(" ");
        body = BRACE_COMMENT.matcher(body).replaceAll(" ");
        body = NAG.matcher(body).replaceAll(" ");
        String previous;
        do {
            previous = body;
            body = INNERMOST_VARIATION.matcher(body).replaceAll(" ");
        } while (body.length() != previous.length());
        body = MOVE_NUMBER.matcher(body).replaceAll(" ");

        List<String> moves = new ArrayList<>();
        for (String token : body.split("\\s+")) {
            String candidate = token.trim();
            if (candidate.isEmpty() || RESULTS.contains(candidate) || candidate.startsWith("[")) {
                continue;
            }
            moves.add(candidate);
        }
        return moves;
    }
}
