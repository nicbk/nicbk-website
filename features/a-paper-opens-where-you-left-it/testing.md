# Testing: A Paper Opens Where You Left It

## Unit

- **Mutator** (`mutators.test.ts`): owner set; not-owner refused; anonymous
  refused; invalid page/offset refused; `updated_at` not in the write.
- **Reading the position**: subtracts `viewportGap / scale` from the reported
  offset; clamps at 0; takes the page at the top, not the most visible.
- **Position tracking** (the reader hook): no write before layout-ready; restore
  once on the initial layout-ready only; a saved page past the page count is
  ignored; debounced writes; sub-line movement not written; flush on
  `pagehide`/hidden/unmount; a synced value while open changes nothing.

## Integration

- `mutators.integration.test.ts` against real Postgres: the columns round-trip,
  ownership is enforced, `updated_at` unchanged. The migration applies from the
  committed files.

## Browser

| Check | Where |
|---|---|
| read to mid-page, reload: same spot | Chrome, local |
| reload three times without scrolling: no drift | Chrome, local |
| narrower window: same paragraph at top | Chrome, local |
| second window reads elsewhere; first stays; reopen follows | Chrome, two windows |
| a synced position while open does not move the reader; reopen follows | Chrome |
| leaving within a second still saves | Chrome, local |
| reload lands on the same spot | Safari, `nicbk.com` after deploy |

Use windows the agent created; close them by id.
