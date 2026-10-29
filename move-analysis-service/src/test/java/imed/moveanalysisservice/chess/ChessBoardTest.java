package imed.moveanalysisservice.chess;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Move generation is checked with perft, which counts every legal continuation from a position. */
class ChessBoardTest {

    private static final String KIWPETE = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";

    @Test
    void readsAndWritesTheStartingFenUnchanged() {
        assertThat(ChessBoard.fromFen(ChessBoard.START_FEN).toFen()).isEqualTo(ChessBoard.START_FEN);
    }

    @Test
    void countsLegalRepliesFromTheStartPosition() {
        assertThat(ChessBoard.fromFen(ChessBoard.START_FEN).legalMoves()).hasSize(20);
    }

    @Test
    void matchesPerftFromTheStartPosition() {
        ChessBoard start = ChessBoard.fromFen(ChessBoard.START_FEN);
        assertThat(perft(start, 1)).isEqualTo(20);
        assertThat(perft(start, 2)).isEqualTo(400);
        assertThat(perft(start, 3)).isEqualTo(8902);
        assertThat(perft(start, 4)).isEqualTo(197281);
    }

    @Test
    void matchesPerftFromKiwpete() {
        ChessBoard kiwpete = ChessBoard.fromFen(KIWPETE);
        assertThat(perft(kiwpete, 1)).isEqualTo(48);
        assertThat(perft(kiwpete, 2)).isEqualTo(2039);
        assertThat(perft(kiwpete, 3)).isEqualTo(97862);
    }

    @Test
    void findsCheckmateSuffixes() {
        ChessBoard board = ChessBoard.fromFen("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");
        ChessBoard.Move mate = SanCodec.fromSan(board, "Ra8#");
        assertThat(SanCodec.toSan(board, mate)).isEqualTo("Ra8#");
        assertThat(SanCodec.toSan(board, mate)).doesNotContain("+");
    }

    @Test
    void keepsAPinnedPawnStill() {
        ChessBoard board = ChessBoard.fromFen("rnbqkbnr/1ppppppp/8/p6Q/8/4P3/PPPP1PPP/RNB1KBNR b KQkq - 1 2");
        assertThat(board.legalMoves())
                .extracting(move -> ChessBoard.squareName(move.from()))
                .doesNotContain("f7");
    }

    @Test
    void capturesEnPassantAndRemovesTheVictim() {
        ChessBoard board = ChessBoard.fromFen("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
        assertThat(board.toFen()).endsWith(" w - d6 0 1");
        ChessBoard.Move capture = board.legalMoves().stream()
                .filter(move -> move.kind() == ChessBoard.MoveKind.EN_PASSANT)
                .findFirst()
                .orElseThrow();
        assertThat(capture.uci()).isEqualTo("e5d6");
        ChessBoard after = board.copy();
        after.apply(capture);
        assertThat(after.toFen()).startsWith("4k3/8/3P4/8/8/8/8/4K3");
    }

    private static long perft(ChessBoard board, int depth) {
        if (depth == 0) {
            return 1;
        }
        long nodes = 0;
        for (ChessBoard.Move move : board.legalMoves()) {
            ChessBoard next = board.copy();
            next.apply(move);
            nodes += perft(next, depth - 1);
        }
        return nodes;
    }
}
