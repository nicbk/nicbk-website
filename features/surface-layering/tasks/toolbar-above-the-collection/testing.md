# Testing: Toolbar Above the Collection

Feature-wide tiers are in [../../testing.md](../../testing.md).

## Unit (Vitest, jsdom)

jsdom does not paint, so it cannot answer "what is on top". What it holds is the
**declaration and its inseparability**:

- The collection page's stylesheet declares `isolation: isolate`.
- The toolbar's stylesheet declares a `z-index`.
- **Both, in one assertion**, with a message naming what each is for — so
  deleting either as redundant fails here rather than in a user's browser.

Asserted against the compiled CSS module, not a rendered tree: the fact under
test is a stylesheet fact, and a jsdom tree would report the same thing whether
the fix worked or not.

## Integration

Not applicable — no database, queue, or storage.

## Browser verification (record in status.md — primary evidence)

**Chrome and Safari, both.** A pass in one is not evidence about the other.

Seed enough articles that the collection actually scrolls at the width being
tested; one screenful proves nothing here.

For each claim: get both rectangles, **assert they overlap**, then
`elementFromPoint` at the centre of the overlap and report which element
received it by identity.

- **Toolbar above the cards** — scrolled, at a wide and a narrow width, probing
  the centre of the search pill and two other points over the row.
  Expected: the toolbar. In Safari before the fix this returns a card, which is
  the defect and should be recorded as reproduced before it is fixed.
- **Card menu above the toolbar** — open a menu positioned so its popup overlaps
  the row. Expected: the popup.
- **Modal backdrop above the toolbar** — open the upload modal, probe a point
  over the row. Expected: the backdrop.
- **No new overflow** — the row's controls still have focus-ring room; probe
  with a control focused.
- **Finally on `nicbk.com`, in Safari**, at the width the defect was reported
  at.

Record the before and after probe results, not a description of them.

## Coverage

Ratchet applies. The stylesheet assertion is what keeps it honest; there is
almost no new executable code.
