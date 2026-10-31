# Opening book pipeline

`src/main/resources/opening/opening-book-eco.json` is generated from the
[Lichess openings dataset](https://github.com/lichess-org/chess-openings)
(a.tsv–e.tsv, ~3,900 curated ECO lines, CC0-1.0), vendored under `source/`.

## Regenerate

```sh
python3 openings/generate-book.py
# optional, validates every row with python-chess if it is available:
python3 -m venv /tmp/chessenv && /tmp/chessenv/bin/pip install python-chess
/tmp/chessenv/bin/python openings/generate-book.py
```

Every row is replayed from the start position when `python-chess` is installed;
malformed rows are reported and skipped. The service consumes the generated file
at startup (`OpeningBook`), expanding each SAN line into a prefix set for
BOOK grading and keeping the full line for ECO identity resolution (`nameOf`).

## Updating the vendored dataset

Copy fresh `a.tsv`–`e.tsv` from the upstream repository into `source/`,
regenerate, and commit both the TSVs and the produced JSON so builds stay
offline and reproducible.
