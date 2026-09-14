# Plan: A Popup Keeps Its Clicks

One task, and a small one — the diff is a condition, a comment, and a test. The
work that mattered is already done: the cause is measured, and the alternatives
are ruled out in [research.md](./research.md).

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`clicks-stay-inside-the-popup`](./tasks/clicks-stay-inside-the-popup/description.md) | [#174](https://github.com/nicbk/nicbk-website/issues/174) | The card answers only clicks physically inside it, plus the test and the guideline |

## Shape of the work

**One condition** in `openUnlessControl`, alongside the three exceptions already
there, with a comment that explains the React-portal subtlety — because the line
reads as a tautology to anyone who has not met this behaviour, and a tautology is
the first thing a later cleanup deletes.

**One test** that renders a card with a portalled element inside it and asserts a
click there does not navigate. Phrased against the *behaviour* — a click from a
portal — rather than against `contains`, so it still means something if the
implementation changes.

**One guideline** in `AGENTS.md`, per the standing rule about fixing mistakes at
the level of the principle. The specific fact — React portals bubble through the
React tree — is the least of it; the general one is that handing rendering to a
library means its event graph, not the DOM, is what carries your handlers.

## Risks, and what makes each survivable

- **The test can pass without testing anything.** A React portal in jsdom is easy
  to render in a way that is a DOM descendant too, which would make the
  assertion pass for the wrong reason. The test must assert the portalled node is
  *not* inside the card in the DOM, or it proves nothing.
- **Over-reach.** The temptation is to also add `stopPropagation` to the popups
  "for safety". That reintroduces the maintenance burden the fix exists to avoid
  and makes the real mechanism harder to see later.
- **The browser check needs the right spot.** Clicking a menu *item* passes
  before and after, because the guard already skips controls. The check must use
  the hit-tested inert surface, exactly as the reproduction did.

## Dependencies

Depends on **#8 `collection-view`** for the card and its handler, and on **#11
`article-edit`** for the two dialogs mounted inside it. Nothing depends on it.
