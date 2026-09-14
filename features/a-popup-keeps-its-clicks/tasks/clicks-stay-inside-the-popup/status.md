# Status: Clicks Stay Inside the Popup

**State:** Implemented, awaiting review. Task 1 of 1.

- Branch: `a-popup-keeps-its-clicks/clicks-stay-inside-the-popup`, from `main` at
  `1c16f45` with the feature spec merged.
- Sub-issue: [**#174**](https://github.com/nicbk/nicbk-website/issues/174).
- PR: **TBD**.
- **On merge this completes #20** — check the parent issue
  [#173](https://github.com/nicbk/nicbk-website/issues/173) and close it by hand.

## Why this task exists

Clicking an open menu's own padding opened the card behind it. Reproduced on
`nicbk.com`: `/lit-tracker` → `/lit-tracker/01a092c2-…` from a click hit-tested
to the popup and confirmed not to be a control.

## What shipped

**One condition** in `openUnlessControl`, as a fourth exception beside the three
already documented:

```ts
if (!event.currentTarget.contains(event.target as Node)) {
  return
}
```

**A comment longer than the code**, on purpose. The line reads as a tautology —
the handler is on the card, so how could the click be elsewhere? — and a
tautology is the first thing a later cleanup deletes. It records that React
propagates synthetic events along the React tree, that the popup's DOM ancestry
was measured as `popup → positioner → div → body`, and that the fix lives here
rather than as a `stopPropagation` per popup because five call sites is five
chances to forget the sixth.

**A guideline** in `AGENTS.md` — two, in fact. The rendered tree is not always the
tree events travel; and an exception list is a map of where a bug cannot be.

## How this was verified, and why the unit test is the strong evidence here

**jsdom models React's synthetic event system exactly as a browser does**, so
unlike most of this project's recent visual work, the defect reproduces in a unit
test rather than only on screen.

The test opens a real `ArticleMenu`, clicks the popup's own surface, and asserts
no navigation. Two things make it meaningful:

- It clicks **`edit…`'s parent** — the popup's surface — rather than an item on
  it. Clicking an item passes with or without the fix, because the handler has
  always skipped controls. That is precisely how the defect survived three
  attempts.
- It asserts **`card.contains(surface) === false`** first. Without that, a menu
  rendered inside the card's own subtree would make the handler's `contains`
  true, the click an ordinary one, and the navigation assertion meaningless.

Checked by removing the condition: the test fails, with `navigate` called
**twice**.

Full suite: 1644 pass (1643 + 1). Typecheck clean.

## What is not verified, and why

**The browser "after" check has not run.** The "before" was measured on
`nicbk.com`; the "after" needs either a signed-in local session or a deploy, and
neither is available right now:

- The Chrome extension is disconnected — `tabs_context_mcp` reports the browser
  is not connected, across several attempts.
- Safari has no session on `localhost:3000`; it redirects to `/sign-in`, and
  signing in is not the agent's to do.

So the evidence for this change is the unit test, which for this particular
defect is stronger than usual rather than a substitute. **The browser
reproduction should be re-run on `nicbk.com` after deploy** — the same steps as
[the feature's research](../../research.md), plus the edit dialog, the delete
confirmation and a tooltip, which were identified by reading the tree rather than
by being clicked.

## Log

- 2026-09-14 — Implemented. 1644 unit tests pass. The new test was checked by
  removing the condition and confirming it fails.
- 2026-09-14 — Spec'd.
