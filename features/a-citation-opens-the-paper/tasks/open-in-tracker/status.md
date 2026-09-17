# Status: Open in Tracker

**State:** **Complete** ([#223](https://github.com/nicbk/nicbk-website/issues/223),
PR [#227](https://github.com/nicbk/nicbk-website/pull/227), merged 2026-09-17).

## What shipped

- ***→ open in tracker*** in the preview, under the crop, when the reference it
  is showing is a paper in the collection. A real anchor to that paper's reader,
  openable in a new tab like the citations view's rows, carrying the hop through
  `~/lit-tracker/citation-path` and dropping `view`.
- **Absent, not disabled** when the region matched no entry, when the matched
  reference is not in the collection, or when the link was never a reference.
- The preview is otherwise exactly what #22 shipped: *go to p. N* keeps its
  place and its behaviour.

## Where the action sits, and why

Its **own row under the crop** (user-decided 2026-09-16, against measurements
taken in Chrome). The crop is drawn at the reading zoom, so the header is as
wide as the reference's column:

| | header | `p. 11` | `go to p. 11` | `open in tracker` | fits? |
|---|---|---|---|---|---|
| BERT at 197% | 450px | 42 | 92 | 126 | yes, 292 of 450 |
| the same reference at 100% | 229px | 42 | 92 | 126 | **no** — 292 needed |

A row of its own is the same place at every zoom, and reads in the order a
reader does: the reference, then the way into it. The popup's width is its
content's, so a crop narrower than the action widens the popup rather than
spilling.

## Verified

- **Unit**: the action's href and the search it carries (`view` dropped, `via`
  grown by the paper being left, the collection's filters untouched); the
  preview closing when it is followed; nothing rendered for an unmatched region
  and nothing for a reference with no article.
- **Mutation checks**: rendering the action for an edge with no article fails
  two rows; dropping `via` fails the row that exists for it.
- **Chrome, local**, on BERT:
  - *Vaswani et al. (2017)* → the action, and pressing it opened **Attention Is
    All You Need** on its reader with the header reading
    `BERT: Pre-trai… ›cites Attention Is All You Need` and `?via=[BERT]`.
  - *(Peters et al., 2018a)* → the preview, **no action**: ELMo is cited but not
    in the collection.
  - *Figure 1* → the preview of the figure, **no action**.
- **Not re-checked here**: that a revisit cuts the path back. It is `nextVia`,
  unit-tested and browser-verified in #10 task 5, and the local collection holds
  no citation that closes a loop — BERT's only in-collection reference is
  *Attention*, which cites nothing that cites it.

## Log

- 2026-09-16 — Spec'd.
- 2026-09-16 — Implemented, with the header's capacity measured before the
  placement was chosen.
- 2026-09-17 — Merged in #227.
