# Research: A Popup Keeps Its Clicks

## Decided documents this builds on

- [collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
  — the card is a click target in its own right, with the title link inside it as
  the keyboard route to the same place.
- [article-edit.md](../../research/ui-ux/pages/lit-tracker/components/article-edit.md)
  — the card menu as the entry point for editing and deleting, which is why both
  dialogs are mounted from inside the card.
- `AGENTS.md` — *intercepting a dependency's input makes you its bookkeeper*, and
  *an order you did not choose is not an order you can rely on*. This is their
  sibling: **a tree you did not choose is not the tree events travel.**

## The reproduction (2026-09-14, Safari, `nicbk.com`)

Production rather than a local build, because the item was reported from real
use and the defect predates every change made this session.

```
1. open the first card's "…" menu
2. measure the popup            → 256 × 413 at (257, 192), padding-top 12px
3. probe (385, 198)             → elementFromPoint = DIV._popup_
                                  inside the popup: true
                                  is a control:     false
4. click there
5. location  /lit-tracker  →  /lit-tracker/01a092c2-4e2e-7c57-8831-ee610c2ca39a
```

Step 3 is the part that makes this evidence rather than an anecdote: the click
landed on the popup's own surface, and on nothing that the card's guard would
have skipped anyway.

## Why the DOM rules it out, and what that leaves

Measured on the same open menu:

```
popup DOM ancestry:  DIV._popup_ → DIV._positioner_ → DIV → (body)
inside an <article>: false
```

Native bubbling therefore **cannot** carry that click to the card's handler. The
click navigated anyway. The only remaining path is React's synthetic event
system, which bubbles along the **React** tree — and `ArticleMenu` is a React
child of the `<article>` carrying `onClick`.

This is well-documented React behaviour rather than a surprise, and it is exactly
the kind of thing that is invisible when reasoning from the rendered DOM.

## Why earlier attempts failed to see it

`openUnlessControl` skips `a, button, input, textarea, select, [role="button"]`,
which is every actionable item in the popup. Earlier passes clicked menu items —
the obvious thing to click — and each behaved correctly. The defect needs a click
on inert surface, of which the popup has two kinds: a 12px `padding-top` and the
`.details` block.

**The lesson is about where to probe**: the guard's own exception list is a map
of where a bug like this *cannot* show, so the places to test are its complement.

## The blast radius

Everything inside the `<article>` in the React tree — read from
`article-card.tsx`, not inferred:

| Surface | Component | Portal |
|---|---|---|
| menu popup | `ArticleMenu` | `Popover.Portal` |
| edit dialog | `ArticleEditDialog` | `Dialog.Portal` |
| delete confirmation | `ArticleDeleteDialog` | `Dialog.Portal` |
| title / author / meta tooltips | `ElidedText` | `Tooltip.Portal` |
| status / tag tooltips | `CardFooter` | `Tooltip.Portal` |

**Correction, found during implementation: not the only handler.** The paragraph
first written here said every other `onClick` in `src/` sits on a real control,
so the card was the only site. That search was sound as far as it went, and it
could not go far enough: **TanStack's `<Link>` navigates from a click handler of
its own, inside the library**, and the title, author and venue tooltips are its
React children. With the card's guard in place, clicking the venue tooltip on the
running page still navigated — every probe assertion holding: inside the tooltip,
not a control, outside the card and outside the link in the DOM.

The reader's tool and zoom menus and the rail's delete-tag dialog were
re-checked with that in mind — none sits inside a link or a clickable ancestor.

## The remedy, and why not the obvious one

**Not `stopPropagation` on each popup.** Five call sites today, and one missed
call site per component added later; the defect returns by omission, silently,
in the surface least likely to be re-tested.

**The guard asks the wrong question.** It asks *what was clicked*; it should also
ask *was it inside me*. One condition —
`event.currentTarget.contains(event.target)` — puts the DOM's answer back in
charge of an event React routed by its own tree, covers all five surfaces at
once, and covers the sixth nobody has written yet.
