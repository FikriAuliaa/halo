# Seed Data Reconciliation Report (B006)

Independent, reproducible verification of the source number dataset in `KONTEKS PROYEK KARTU HALO DAN PAKET.md` §11. This report does not correct, pad, reorder, or drop any value — it only counts and classifies.

## Parsing rule (v1, primary)

Region isolated between the `§11` and `§12` headings. Every markdown bold token matching `\*\*(\d{8,15})\*\*` inside that region is a candidate. Order of extraction is document order (left column top-to-bottom, then right column, per row, matching the table's own numbering).

## Parsing rule (v2, independent cross-check)

Same region, unrelated method: every standalone digit run of length 10–13 starting with `08` (regex `(?<!\d)(08\d{8,11})(?!\d)`), ignoring all markdown markup entirely — this also picks up the two phone numbers named in the "⚠ Duplicate entries detected and removed" warning sentence, which v1's bold-token rule does not (that sentence is plain text, not bold).

## Results

| Metric                                  | v1 (bold-token) | v2 (digit-run, markup-agnostic) |
| --------------------------------------- | --------------- | ------------------------------- |
| Raw extracted                           | 96              | 100                             |
| Distinct                                | 96              | 96                              |
| Duplicate occurrences                   | 0               | 4                               |
| Invalid (fails `08` + 10–13 digit rule) | 0               | 0                               |
| **Accepted set**                        | **96**          | **96 — identical set to v1**    |

v2's four "duplicate occurrences" are fully explained and benign: the four numbers named in the warning sentence (`081125174670`, `081125177001`, `081125177002`, `081125177362`) are counted once from the warning text itself and once from their single appearance in the table — v2's markup-agnostic method sees both mentions; v1's bold-only method only sees the table mention, since the warning sentence is plain prose. Both methods converge on the same 96-item accepted set (`v1 == v2` verified programmatically).

## Length distribution

All 96 accepted numbers are exactly 12 digits. No entry outside this length.

## Named "removed duplicates" — status

| Number       | Occurrences in the 96-item table |
| ------------ | -------------------------------- |
| 081125174670 | 1                                |
| 081125177001 | 1                                |
| 081125177002 | 1                                |
| 081125177362 | 1                                |

Each appears exactly once — the expected result of deduplication (100 raw → 4 duplicate pairs collapsed → 96 distinct, one surviving copy of each formerly-duplicated value), not evidence that the visible list still contains contamination.

## Conclusion

**Extracted 96 / Distinct 96 / Duplicate 0 / Invalid 0 / Accepted 96.** The dataset is clean. This confirms, independently and reproducibly (two unrelated parsing rules, identical output), the verification already performed during planning. The stated concern that "the visible source list appears to still contain entries identified elsewhere as duplicates" does not hold up against the primary source — the four named numbers are correctly present exactly once, which is what a clean post-deduplication list looks like.

## Standing rule for future re-runs (feeds ADR-008 / the B053 importer)

Any future run of this reconciliation against a source list that does **not** report `96 / 96 / 0 / 0 / 96` has detected a real deviation from the specification and must fail loudly rather than silently accept a different count. The importer in B053 implements this as a hard assertion, not a warning.

## Verbatim source list

Written unmodified, one number per line, in document order, to `data/seed/numbers.source.txt` (96 lines, verified via `wc -l`). This file is the byte-for-byte input to the seed importer (B053) and is never hand-edited.
