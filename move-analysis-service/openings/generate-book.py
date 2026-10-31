#!/usr/bin/env python3
"""Build the service opening-book resource from the vendored Lichess ECO dataset.

Source: lichess-org/chess-openings a.tsv-e.tsv (CC0-1.0), vendored in openings/source/.
Each row is `eco\\tname\\tpgn`; the pgn column becomes a plain SAN move list, which the
service expands into SAN prefixes for "book move" grading and stores eco/name for the UI.

The generated file is committed next to the sources so builds stay offline:
    src/main/resources/opening/opening-book-eco.json

Re-run whenever the vendored TSVs change:
    python3 openings/generate-book.py

Validation: when the optional `chess` library (python-chess) is installed, every row is
replayed to prove the SAN sequence is legal from the start position; malformed rows are
reported and skipped rather than shipped half-checked.
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "source"
TARGET = HERE.parent / "src" / "main" / "resources" / "opening" / "opening-book-eco.json"
VOLUMES = ("a", "b", "c", "d", "e")


def san_moves(pgn: str) -> list[str]:
    """Strip the move numbers (1. / 1...) from a mainline PGN and keep only SAN moves."""
    sans = []
    for token in pgn.split():
        if token[0].isdigit():
            continue  # 1. / 23... style move numbers
        sans.append(token)
    return sans


def main() -> int:
    try:
        import chess

        def replay(pgn: str) -> None:
            board = chess.Board()
            for san in pgn.split():
                board.push_san(san)

        validator = replay
    except ModuleNotFoundError:
        validator = None
        print("python-chess not installed; rows are shipped unvalidated", file=sys.stderr)

    def legal(sans: list[str]) -> bool:
        """python-chess replay when available; otherwise assume the curated dataset is valid."""
        if validator is None:
            return True
        try:
            validator(" ".join(sans))
            return True
        except Exception:
            return False

    rows = []
    skipped = 0
    seen = {}
    for volume in VOLUMES:
        tsv = SOURCE / f"{volume}.tsv"
        with tsv.open(encoding="utf-8") as handle:
            header = next(handle)  # eco<TAB>name<TAB>pgn
            assert header.startswith("eco\t"), f"unexpected header in {tsv}"
            for line in handle:
                fields = line.rstrip("\n").split("\t")
                if len(fields) < 3:
                    skipped += 1
                    continue
                eco, name, pgn = fields[0], fields[1], fields[2]
                sans = san_moves(pgn)
                if not sans or not legal(sans):
                    print(f"skipping {eco} {name}: invalid line", file=sys.stderr)
                    skipped += 1
                    continue
                key = tuple(sans)
                if key in seen:
                    continue  # the dataset repeats lines for transposition coverage
                seen[key] = eco
                rows.append({"eco": eco, "name": name, "san": sans})

    rows.sort(key=lambda row: (row["eco"], row["name"], len(row["san"])))
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with TARGET.open("w", encoding="utf-8") as out:
        json.dump(rows, out, ensure_ascii=False, separators=(",", ":"))
        out.write("\n")

    plies = sum(len(row["san"]) for row in rows)
    deepest = max(rows, key=lambda row: len(row["san"])) if rows else None
    print(f"wrote {len(rows)} openings, {plies} plies, {skipped} skipped -> {TARGET}")
    if deepest:
        print(f"deepest line: {deepest['eco']} {deepest['name']} ({len(deepest['san'])} plies)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
