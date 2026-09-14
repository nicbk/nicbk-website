# Status: Clicks Stay Inside the Popup

**State:** First fix **merged** (#176); the second — found in the browser after
that merge — is in a follow-up PR. Task 1 of 1, and **not complete until the
follow-up lands**: until then the tooltip route is still live on `main`.

- Branch: `a-popup-keeps-its-clicks/clicks-stay-inside-the-popup`, from `main` at
  `1c16f45` with the feature spec merged.
- Sub-issue: [**#174**](https://github.com/nicbk/nicbk-website/issues/174).
- PR: [**#176**](https://github.com/nicbk/nicbk-website/pull/176) — the card's
  guard, merged as `c1b1fe3`. The Link guard follows in its own PR, because #176
  was merged before the browser pass that found the second handler.
- **On merge this completes #20** — check the parent issue
  [#173](https://github.com/nicbk/nicbk-website/issues/173) and close it by hand.

## Why this task exists

Clicking an open menu's own padding opened the card behind it. Reproduced on
`nicbk.com`: `/lit-tracker` → `/lit-tracker/01a092c2-…` from a click hit-tested
to the popup and confirmed not to be a control.

## What shipped

**One condition** in `openUnlessControl`, as a fourth exception beside the three
already documented — and, after the browser pass below, **the same condition on
the title `<Link>`**:

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

## What the browser found after the fix shipped — a second handler

The user reconnected Chrome, and every surface named in the spec was clicked on
the local stack running this branch, with the same probe discipline as the
reproduction: hit-test first, assert the point is inside the surface, is not a
control, and that the surface is outside the card in the DOM.

| Surface | With the card guard only |
|---|---|
| menu popup padding | route unchanged ✓ |
| edit dialog, the "title" label | route unchanged, form still open ✓ |
| delete confirmation, its explanatory paragraph | route unchanged; dismissed via **cancel**, article intact ✓ |
| **the venue line's tooltip** | **navigated to the article** ✗ |

**The spec's audit was wrong.** It concluded the card was the only container-level
click handler, because a search for `onClick=` found no other. But the title,
author and venue tooltips are React children of the title's `<Link>`, and
TanStack's `<Link>` navigates from a click handler **inside the library**, which
no search of this repository can see. The tooltip's click bubbled through the
React tree into that handler, and the card's guard never got a say.

That is the exact lesson this task wrote into `AGENTS.md` an hour earlier, arriving
again at the audit's expense — which is why it was clicked rather than inferred.

### The second fix

The same question, asked of the second handler. The router's Link runs a caller's
`onClick` **first** and skips its own navigation when the event is already
prevented — `composeHandlers([onClick, handleClick])` in `link.js`, and
`handleClick` checks `!e.defaultPrevented` again, both read in the library source
rather than assumed. So the link gets an `onClick` that prevents the default when
the click arrived through a portal, and a click that really lands on the link is
untouched.

The principle now lives once, in `arrivedThroughAPortal`, which both handlers call
and which carries the full explanation.

### After the second fix

| Check | Result |
|---|---|
| venue tooltip clicked | **route unchanged** — same assertions as the failing run, opposite result |
| card body clicked | still opens the article |
| **title clicked with the real pointer** | still follows the link, via TanStack's own handler |
| back once from there | lands on `/lit-tracker` — one history entry, not two |

### Tests for the second site

The router mock in the test file is a plain `<a>` that never navigates, so a
"did not navigate" assertion would pass with or without the fix. The test asserts
the contract the real library keys on instead: **the click reaching the anchor is
prevented.** It hovers the title, waits for a tooltip match *outside* the link —
`findAllByText` alone resolves instantly, because the trigger carries the same
text — asserts the tooltip is outside the link in the DOM, then dispatches a click
and checks `defaultPrevented`. A companion test confirms a real click on the
title is **not** prevented.

Checked by removing **only** the Link guard, leaving the card's in place: the
tooltip test fails. So it depends on the second fix, not the first.

1646 unit tests pass. Typecheck and Biome clean.

## Still not verified

- **The status and tag tooltips in the card footer.** They sit inside the card but
  outside the link, so the card's guard covers them by structure — but no footer
  item was elided on the local data, so none rendered a tooltip to click.
- **Safari.** The mechanism is React's event system, identical across engines, and
  the reproduction was in Safari; the after-check was Chrome only.

## Log

- 2026-09-14 — **Second handler found and fixed.** With Chrome reconnected, every
  named surface was clicked: menu, edit dialog and delete confirmation held, and
  the venue tooltip still navigated — through the title's `<Link>`, whose handler
  lives in the router library. Fixed by asking that handler the same question;
  the principle moved into one helper both call. 1646 unit tests pass.
- 2026-09-14 — Implemented. 1644 unit tests pass. The new test was checked by
  removing the condition and confirming it fails.
- 2026-09-14 — Spec'd.
