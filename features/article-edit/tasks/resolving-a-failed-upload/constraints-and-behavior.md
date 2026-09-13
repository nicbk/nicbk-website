# Constraints and Behavior: Resolving a Failed Upload

The closing half of [the feature's criteria](../../constraints-and-behavior.md) —
the part that makes the other two reachable from where the problem is reported.

## Satisfied here

- **A failed row opens the edit modal** for its own article, from the popup the
  warning icon already opens.
- **The modal opens on the missing fields**, so the reason the row was flagged is
  what the reader sees first.
- **A successful edit clears the warning**: the `upload_jobs` row retires, the
  popup's list loses it, and the header returns to its checkmark when nothing
  else needs attention.
- **A delete clears it too**, through the cascade task 2 relies on — the same
  outcome by the other route, with no second mechanism.
- **The header's state follows the list**, since `uploadStatusState` already
  derives it: a failure outranks work in progress, and no failures plus no work
  is the non-clickable checkmark.

## Must not regress

- The popup's decided lifecycle: only jobs still needing attention, never a
  history of resolved ones.
- In-progress rows and their progress indication, which this does not touch.
- `uploadStatusState`'s precedence rule and its existing tests.
- The extraction pipeline's own writes to `upload_jobs` — this removes a row
  because a human resolved it, and changes nothing about how one is created or
  failed.

## Constraints particular to this task

- **Retiring the row is part of the edit, not a second round trip.** It belongs
  in the same mutation that saves the metadata, so a reader cannot end up with a
  fixed article and a stale warning because the second call failed.
- **Only a *failed* job retires this way.** An article being edited while its
  extraction is still `processing` must keep its row: the upload has not
  resolved, and the reader editing it early does not make it so.
- **`extraction_status` is not touched**, and the code says why rather than
  leaving the next reader to wonder whether it was forgotten.
- **The entry point is a signpost, not a special case.** A failed article is an
  ordinary row; the same modal, the same mutator, the same validation. What is
  particular is only where the reader came from and what is focused first.
- **Resolution is the reader's**, not a guess. Saving the form is what resolves
  it; nothing infers "this looks fixed now" from the contents of the fields.

## Cross-cutting

- WCAG 2.2 AA: the failed row's control is a real button naming the article it
  opens ("Fix Attention Is All You Need", not a bare icon); focus moves into the
  modal and returns to something that still exists when the row it came from has
  disappeared — the case worth getting right here, since resolving the problem
  removes the thing that was focused.
- The popup and the modal are both overlays: opening the second must not leave
  the first stacked behind it in a way that reads as two live surfaces at once,
  the same judgement `ArticleMenu`'s `modal` prop already records.
- No schema change, no new route, no new mutator — one existing mutation gains a
  side effect that is part of the same fact.
- CI green: Biome, typecheck, unit + integration with ratchet coverage, PR-title
  lint.
