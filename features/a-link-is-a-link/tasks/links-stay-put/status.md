# Status: Links Stay Put

**State:** **Implemented**, in review. Task 1 of 3.

- Branch: `a-link-is-a-link/links-stay-put`, from `main` at `70b9b04` with the
  feature spec merged.
- Sub-issue: [**#186**](https://github.com/nicbk/nicbk-website/issues/186).

## What shipped

- **`link-annotations.ts`** — the link tool gets a category of its own
  (`link`), and the lock names only that. `linkClickAction` decides a click:
  URL → copy; `mailto:` → the address alone; a destination → `internal` (inert
  until task 3); anything else → nothing.
- **`reader-plugins.ts`** — the override, the lock, and `autoOpenLinks: false`,
  which stops the library's own navigation handler `window.open`ing a URL.
- **`link-target.tsx`** — the reader's `link` renderer, passed to every
  `AnnotationLayer` as `annotationRenderers`, which replaces the built-in by id.
  Passed as the layer's prop rather than registered through the renderer
  context: same replacement rule, and assertable in the reader's test.
- **`use-confirmation-toast.ts`** — the site's first success toast. The error's
  red edge is now scoped to `data-type="error"`; the toaster's comment and
  `research/ui-ux/design-system.md` record the exception: *a success with nothing
  to see*.

## Browser verification — Chrome, local stack, *Attention Is All You Need*

Reloaded before checking. Every click hit-tested first.

| Check | Result |
|---|---|
| the built-in editable link rects | **0** in the DOM; 9 reader link targets in view |
| click `[13]` | no selection, no handles, no menu, no scroll |
| click the tensor2tensor URL | clipboard write `https://github.com/tensorflow/tensor2tensor`; **"link copied"** toast, grey edge, `data-type="confirmation"` |
| drag starting on plain text, across `[13]` and `[7]` | selects; selection menu offered |
| highlight that selection | mark created (0 → 1), text includes `[13]` |
| select the mark on plain text | its menu: **write a note**, **delete annotation** |
| click `[13]` inside the mark | the link wins — the mark is not selected (data for task 3) |
| delete the check's mark | 1 → 0; it was the only mark on the paper |

### Found in the browser: the link could not be clicked

The first pass rendered every target at the right size and a hit-test at its
centre reached the **page image** beneath. EmbedPDF's annotation wrappers set
`pointer-events: none`, which **inherits**; the built-in locked link sets `auto`
back inline. `.target` now does the same, with a stylesheet test that fails
without it — jsdom has no computed inheritance, so no unit test could have
caught it.

### Found in the browser, accepted: a drag cannot start on a link

A text selection whose press lands on a citation's box selects nothing. The
annotation layer is wrapped in `data-no-interaction`, and the interaction
manager ignores every pointer event that starts inside it — for **every**
annotation, not only links; on `main` the same press selected the link instead.
Starting a character earlier, or dragging across a citation, works.

**Raised with the user, who chose to accept it for now** (2026-09-14) over making
links pure geometry with a page-level click hit-test. Revisit if it bites.

## Verification

- Unit: 1700 pass (1676 + 24). Typecheck clean; Biome clean at warning level.
- Mutations, each caught: the link tool keeping the markup categories with the
  lock on `markup` (the "leaves every mark unlocked" test); the renderers not
  passed to the layer (the reader test); `pointer-events: auto` removed (the
  stylesheet test).

## Not verified

- **Safari.** No session on `localhost:3000`; checked on `nicbk.com` after deploy.
- **A `mailto:` link in the browser.** Unit-tested; the local paper has none.

## Log

- 2026-09-14 — Implemented and verified in Chrome. One defect found and fixed
  (inherited `pointer-events`); one limitation found and accepted with the user.
- 2026-09-14 — Spec'd.
