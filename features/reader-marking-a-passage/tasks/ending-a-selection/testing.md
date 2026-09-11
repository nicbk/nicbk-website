# Testing: Ending a Selection

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Whether a selection needs finishing**, as a pure function over what the
  plugin reports: selecting with a range (yes), not selecting (no), a range of
  null (no), and the same range offered twice (once).
- **What the re-apply does**: the range goes back unchanged, and this reader's
  record of *who made the selection* is not disturbed by it — a mouse selection
  must not acquire touch handles, and a touch selection must not lose them.
- **The echo settles.** The change event the re-apply produces does not cause
  another re-apply. Asserted by driving the fake plugin's change subscription
  from `setSelection`, as `touch-selection/drag`'s tests already do.
- **What a markup commit produces**: one annotation per page of a formatted
  selection, each carrying the live tool's own `defaults` and the selected text;
  nothing at all when no tool is live or the tool is not a text tool.
- **The existing reader suite passes unchanged** — 446 tests at the time of
  writing.

## Integration

Nothing new.

## Browser verification (record in status.md — primary evidence)

Against the Compose app, *Attention Is All You Need* at 109% with a page break
on screen, both themes, 500px and wider.

- **A markup tool dragged across a page break marks both pages** — two rows,
  one per page, each covering that page's part of the passage. The measurement
  to beat is today's: zero engine events, zero rows.
- **A cross-page selection offers `copy`**, and copying takes the whole passage
  in reading order.
- **A single-page markup drag is unchanged** — one row, as it is today.
- **A touch selection still behaves as #12 left it**: hold selects, handles
  extend, the magnifier follows, the copy control appears.
- **Nothing is left armed**: after a cross-page drag, ordinary movement over the
  paper starts no selection — the stale-anchor failure #12 produced three times.
- Console clean.
- Every mark made is **deleted by the id recorded when it was made**.

## Coverage

Ratchet applies. The two pure pieces carry it; the wiring is exercised through
the reader's existing component tests.
