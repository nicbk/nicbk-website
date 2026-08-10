# Testing: PDF Reader

What this task's tests must cover. The feature-wide tiers, and why the browser
pass is primary evidence here, are in [../../testing.md](../../testing.md).

## What can and cannot be asserted, stated up front

The reader's output is a **WebAssembly-rendered canvas**. jsdom does not render
it, and no unit test can say "the page turned" in any meaningful sense. Pretending
otherwise produces tests that assert a mock was called and imply a document was
drawn.

So the split for this task is deliberate:

- **Unit tests cover everything around the engine** — the states, the toolbar's
  behavior, the plumbing between a control and the call it makes.
- **The browser pass covers the document itself**, and its findings are recorded
  in `status.md` as the evidence they are.
- **The restored e2e suite will owe** the one assertion neither can make today:
  that a real browser renders a real paper. It is on the list in the feature's
  `testing.md`.

## Unit (Vitest + `@testing-library/react`, jsdom)

With the EmbedPDF engine and document load mocked:

- **The three states render distinctly**: loading, loaded, and failed-to-fetch.
  In particular, a failed fetch does **not** render as a perpetual loading state
  — the defect this assertion exists for.
- In every state, the page's **metadata summary, sidebar, and toolbar remain
  rendered**. A document that never arrives must not take the page with it.
- **The toolbar's controls invoke the right calls**: previous/next page, zoom in
  and out, each asserted against the injected scope rather than against a real
  engine.
- **The page indicator reflects the reported current page and total**, including
  the first and last pages, where the previous/next controls' disabled states
  turn over.
- **Every icon-only toolbar control has an accessible name**, and the toolbar is
  keyboard-navigable.
- **The document region carries a label.**
- **The reader is not rendered on the server** — assert whatever the chosen
  client-only mechanism exposes (that the module is not imported during a server
  render, or that the fallback renders in its place), so a later refactor that
  quietly makes the engine SSR-eligible fails here rather than in production.

## Integration

Nothing new. This task adds no table and no server route; task 2's route already
has its integration coverage and this task is that route's first consumer.

## Browser verification (record in status.md — primary evidence for this task)

- A **real multi-page PDF** from the user's own collection renders, scrolled
  **first page to last**.
- **Page navigation** works, and the indicator agrees with the page in view when
  scrolling rather than only when clicking.
- **Zoom** works, and the document stays inside its panel at every zoom level —
  no horizontal page scrollbar, no document escaping the shell.
- **Both themes**, at **narrow, mid, and wide** widths.
- The document scrolls **inside its panel**; the page itself never scrolls.
- Scrolling **over the document, and over the toolbar** both behave — the
  per-container `overscroll-behavior` rule is easy to re-break with a new scroll
  region.
- **All three run modes**: `npm run dev`, the production Nitro server, and
  `docker compose up`. The WebAssembly asset resolving in one and 404ing in
  another is the specific thing being checked.
- An article whose PDF is missing from the bucket shows the failure state, not a
  spinner.

## Coverage

**This is the task most likely to trip the ratchet.** A large client-only
component is hard to cover in jsdom, and the reflex — lowering the gate — is the
wrong move. The right one is extracting the logic out of the component: the page
-indicator arithmetic, the zoom step calculation, the state derivation, the
plumbing between a control and a scope call. Those are all pure and all
coverable. If coverage drops, treat it as evidence that too much is sitting
inside the component.
