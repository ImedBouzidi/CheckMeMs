package imed.moveanalysisservice.chess;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.util.List;
import java.util.regex.Matcher;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * The fixtures are produced by chess.js from real and randomly played games, so every ply carries an
 * independent SAN, UCI and before/after FEN that this replay has to reproduce exactly.
 */
class PgnReplayTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @ParameterizedTest
    @ValueSource(strings = {
            "game-txt",
            "random-ep",
            "random-castleK",
            "random-castleQ",
            "random-promotion",
            "random-disambig",
            "random-mate"})
    void replaysEveryPlyExactly(String fixture) throws Exception {
        JsonNode root = read(fixture);
        List<PgnReplay.Ply> plies = PgnReplay.replay(root.get("pgn").asText());
        JsonNode expected = root.get("plies");

        assertThat(plies).hasSize(expected.size());
        for (int index = 0; index < expected.size(); index++) {
            JsonNode want = expected.get(index);
            PgnReplay.Ply got = plies.get(index);
            String where = fixture + " ply " + want.get("ply").asInt();
            assertThat(got.ply()).as(where + " ply").isEqualTo(want.get("ply").asInt());
            assertThat(got.moveNumber()).as(where + " moveNumber").isEqualTo(want.get("moveNumber").asInt());
            assertThat(got.color()).as(where + " color").isEqualTo(want.get("color").asText());
            assertThat(got.san()).as(where + " san").isEqualTo(want.get("san").asText());
            assertThat(got.uci()).as(where + " uci").isEqualTo(want.get("uci").asText());
            assertThat(got.fenBefore()).as(where + " fenBefore").isEqualTo(want.get("fenBefore").asText());
            assertThat(got.fenAfter()).as(where + " fenAfter").isEqualTo(want.get("fenAfter").asText());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"game-txt", "random-promotion"})
    void ignoresCommentsVariationsAndNags(String fixture) throws Exception {
        String pgn = read(fixture).get("pgn").asText();
        List<PgnReplay.Ply> clean = PgnReplay.replay(pgn);

        String annotated = pgn.replaceFirst("1\\. ",
                Matcher.quoteReplacement("1. {a comment} (1... h6 2. e4) $4 "));

        List<PgnReplay.Ply> replayed = PgnReplay.replay(annotated);
        assertThat(replayed).hasSize(clean.size());
        assertThat(replayed).extracting(PgnReplay.Ply::san)
                .isEqualTo(clean.stream().map(PgnReplay.Ply::san).toList());
    }

    @ParameterizedTest
    @ValueSource(strings = {"game-txt", "random-ep", "random-mate"})
    void lastPositionIsCheckOrGameOverConsistently(String fixture) throws Exception {
        List<PgnReplay.Ply> plies = PgnReplay.replay(read(fixture).get("pgn").asText());
        PgnReplay.Ply last = plies.get(plies.size() - 1);
        ChessBoard finalBoard = ChessBoard.fromFen(last.fenAfter());
        assertThat(finalBoard.kingSquare(true)).isNotEqualTo(-1);
        assertThat(finalBoard.kingSquare(false)).isNotEqualTo(-1);
    }

    @ParameterizedTest
    @ValueSource(strings = {"game-txt", "random-castleQ"})
    void engineUciMovesConvertBackToSan(String fixture) throws Exception {
        List<PgnReplay.Ply> plies = PgnReplay.replay(read(fixture).get("pgn").asText());
        for (PgnReplay.Ply ply : plies) {
            ChessBoard board = ChessBoard.fromFen(ply.fenBefore());
            ChessBoard.Move move = SanCodec.fromUci(board, ply.uci());
            assertThat(move).as("uci " + ply.uci() + " in " + fixture).isNotNull();
            assertThat(SanCodec.toSan(board, move)).isEqualTo(ply.san());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"game-txt", "random-ep", "random-promotion"})
    void rejectsAMoveThatIsNotInTheGame(String fixture) throws Exception {
        String pgn = read(fixture).get("pgn").asText();
        assertThat(PgnReplay.replay(pgn)).isNotEmpty();
        assertThatThrownBy(() -> PgnReplay.replay(pgn.trim() + " Qx9"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static JsonNode read(String fixture) throws Exception {
        String path = "/chess/" + fixture + ".json";
        try (InputStream input = PgnReplayTest.class.getResourceAsStream(path)) {
            assertThat(input).as("missing fixture " + path).isNotNull();
            return MAPPER.readTree(input);
        }
    }
}
