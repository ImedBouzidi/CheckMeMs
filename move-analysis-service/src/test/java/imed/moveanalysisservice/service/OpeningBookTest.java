package imed.moveanalysisservice.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import imed.moveanalysisservice.model.MoveAnalysis;
import imed.moveanalysisservice.model.MoveClassification;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Exercised against the real Lichess ECO dataset, so the facts here are actual theory:
 * 1. e4 e5 2. Qh5 really is the Wayward Queen Attack (C20), not a blunder line.
 */
class OpeningBookTest {

    private final OpeningBook book = new OpeningBook(new ObjectMapper());

    @Test
    void recognisesAStoredMainline() {
        assertThat(book.isBook(List.of("e4", "e5", "Nf3", "Nc6", "Bb5"), 4)).isTrue();
        // every prefix of a mainline is itself theory, not just the end of the line
        assertThat(book.isBook(List.of("e4", "e5", "Nf3", "Nc6"), 3)).isTrue();
        assertThat(book.isBook(List.of("d4", "d5", "c4"), 2)).isTrue();
        // the deepest ECO lines run far beyond the first few moves
        assertThat(book.isBook(
                List.of("e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"), 9))
                .isTrue();
    }

    @Test
    void leavesTheBookAtTheFirstOffTheoryMove() {
        assertThat(book.isBook(List.of("e4", "e5", "Nf3", "Nc6", "Qb5"), 4)).isFalse();
        // the Wayward Queen is theory, but ...Qh5 against 1...d5 is not
        assertThat(book.isBook(List.of("e4", "d5", "Qh5"), 2)).isFalse();
        assertThat(book.isBook(List.of("e4", "Qh5"), 1)).isFalse();
    }

    @Test
    void matchingIgnoresCheckMarksAndDigitCastling() {
        // the book contains Ruy Lopez with checks stripped, so Bb5+ and Bb5 match alike
        assertThat(OpeningBook.canonical("Bb5+")).isEqualTo(OpeningBook.canonical("Bb5"));
        assertThat(OpeningBook.canonical("0-0")).isEqualTo("O-O");
        assertThat(OpeningBook.canonical("0-0-0")).isEqualTo("O-O-O");
        assertThat(OpeningBook.canonical("Qxe5+")).isEqualTo("QXE5");
    }

    @Test
    void marksTheoryRowsButKeepsGradedMistakesHonest() {
        MoveAnalysis bookMove = row(1, "e4", MoveClassification.GOOD);
        MoveAnalysis gradedMove = row(2, "e5", MoveClassification.BLUNDER);
        MoveAnalysis waywardQueen = row(3, "Qh5", MoveClassification.GOOD);
        MoveAnalysis forcedMove = row(4, "d5", MoveClassification.FORCED);

        book.apply(List.of(bookMove, gradedMove, waywardQueen, forcedMove));

        assertThat(bookMove.getClassification()).isEqualTo(MoveClassification.BOOK);
        // 1...e5 is named theory, but a line that greets the played blunder as "book" would hide
        // its cost from the player
        assertThat(gradedMove.getClassification()).isEqualTo(MoveClassification.BLUNDER);
        // ...Qh5 still walks the Wayward Queen Attack mainline
        assertThat(waywardQueen.getClassification()).isEqualTo(MoveClassification.BOOK);
        assertThat(forcedMove.getClassification()).isEqualTo(MoveClassification.FORCED);
    }

    @Test
    void stopsShortOfTheFirstOffBookMove() {
        MoveAnalysis first = row(1, "e4", MoveClassification.GOOD);
        MoveAnalysis second = row(2, "Qh5", MoveClassification.GOOD);
        MoveAnalysis third = row(3, "e5", MoveClassification.GOOD);

        book.apply(List.of(first, second, third));

        assertThat(first.getClassification()).isEqualTo(MoveClassification.BOOK);
        assertThat(second.getClassification()).isEqualTo(MoveClassification.GOOD);
        // a book continuation after a deviation is not theory: the position never matched
        assertThat(third.getClassification()).isEqualTo(MoveClassification.GOOD);
    }

    @Test
    void namesThePlayedOpening() {
        assertThat(book.nameOf(List.of("e4", "e5", "Nf3", "Nc6", "Bb5")))
                .contains(new OpeningBook.Named("C60", "Ruy Lopez"));
        assertThat(book.nameOf(List.of("e4", "e5", "Qh5")))
                .contains(new OpeningBook.Named("C20", "King's Pawn Game: Wayward Queen Attack"));
        assertThat(book.nameOf(List.of("e4", "e5")))
                .contains(new OpeningBook.Named("C20", "King's Pawn Game"));
    }

    @Test
    void keepsTheDeepestNamedLineWhenPlayingOn() {
        // 7...Qg5 is off theory, so the identity falls back to the last named prefix (Morphy 6...a6)
        assertThat(book.nameOf(List.of("e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Qg5")))
                .contains(new OpeningBook.Named("C70", "Ruy Lopez: Morphy Defense"));
    }

    @Test
    void resolvesThroughUnnamedPrefixesAfterADeviation() {
        // 4...Bb4 (the Boden line) is unnamed, so the identity is the 3-ply King's Knight Opening
        assertThat(book.nameOf(List.of("e4", "e5", "Nf3", "Nc6", "Bb4")))
                .contains(new OpeningBook.Named("C44", "King's Knight Opening: Normal Variation"));
        // 1. f3 2...e5 3.Qh5 leaves the unnamed 2-ply prefix, so the identity falls back to 1. f3
        assertThat(book.nameOf(List.of("f3", "e5", "Qh5")))
                .contains(new OpeningBook.Named("A00", "Barnes Opening"));
    }

    @Test
    void namesNothingWhenTheLineIsBlank() {
        assertThat(book.nameOf(List.of(""))).isEmpty();
        assertThat(book.nameOf(List.of())).isEmpty();
    }

    private static MoveAnalysis row(int ply, String san, MoveClassification classification) {
        MoveAnalysis row = new MoveAnalysis();
        row.setPly(ply);
        row.setSan(san);
        row.setClassification(classification);
        return row;
    }
}
