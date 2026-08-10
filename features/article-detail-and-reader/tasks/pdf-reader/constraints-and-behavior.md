# Constraints and Behavior: PDF Reader

The subset of
[the feature's acceptance criteria](../../constraints-and-behavior.md) this task
satisfies.

## The engine and the mount

- Built on **EmbedPDF's headless architecture**, composing this project's own UI
  — the decision in
  [pdf-reader-annotations.md](../../../../research/technologies/pdf-reader-annotations.md),
  made specifically because the prebuilt UI felt janky. The drop-in styled
  component is not used.
- Built on **EmbedPDF 2.15.x stable**. The `3.0.0-next` prerelease is not
  adopted.
- The reader is **client-only**. It must not break the server render of the
  detail page around it: the metadata summary, the sidebar, and the shell all
  still render server-side.
- **The mounting approach is verified against the running app before the task
  builds on it.** This is a constraint on how the task proceeds, not only on its
  output, because the alternative is discovering the answer after the component
  is written.
- The document loads from **task 2's same-origin route**. No presigned URL, no
  direct Garage request from the browser.

## The toolbar

- **Persistent** — a fixed top toolbar, not floating and not contextual, per
  [reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md).
- Holds **page navigation** (previous/next), a **page indicator** showing the
  current page and the total, and **zoom controls**.
- **Reserves the space for task 4's annotation tools** rather than laying out
  for two control groups and being re-laid-out for three.
- Every icon-only control has a **discernible accessible name**, and every
  control is keyboard-operable.

## The document region

- Scrolls **inside its own bounded panel**; the page itself does not gain a
  scrollbar, per the app shell's `100dvh` panel model
  ([header.md](../../../../research/ui-ux/pages/lit-tracker/components/header.md)).
- Any scroll container the reader introduces follows the site's per-container,
  per-axis `overscroll-behavior` rule
  ([design-system.md](../../../../research/ui-ux/design-system.md)) — the
  shorthand on both axes is what broke scrolling site-wide once already.
- The document region is **labelled** to assistive technology rather than left
  as an unnamed canvas. What is **not** claimed is that a canvas-rendered PDF is
  accessible text; it is not, and no part of this task makes it so.
- Page navigation and zoom **agree with the document**: the indicator reflects
  the page actually in view when the user scrolls, not only when they use the
  buttons.

## Loading and failure

- The reader **reports that it is loading** — both the document download and the
  engine's own start-up are visible waits.
- A document that **cannot be fetched** is reported **distinctly** from one that
  is still loading. An article whose PDF is missing must not look like a slow
  connection forever.
- Neither state leaves the page without its metadata, sidebar, or toolbar — the
  rest of the detail page stays usable when the document does not arrive.

## Explicitly not in this task

- **Annotations**: no tools, no table, no persistence, no list.
- **Undo/redo** and the history plugin.
- **Text search, thumbnails, printing, rotation, page spreads.**
- **Range requests or any change to task 2's route**, unless the reader
  demonstrably requires it and the reason is recorded.

## Cross-cutting

- Correct in **both themes** and at **narrow, mid, and wide widths**. A PDF page
  is a fixed aspect ratio inside a flexible panel, which is exactly the kind of
  thing that looks right at one width only.
- Runs identically under `npm run dev`, the production Nitro server, and
  `docker compose up`. **The WebAssembly asset's loading is the specific risk
  here** — a wasm binary that resolves in a dev server and 404s in a built
  bundle is a normal failure mode for this class of library, and all three must
  be checked.
- **Reduced motion** respected by anything that animates.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint. See [testing.md](./testing.md) on the coverage ratchet, which
  this task is the most likely in the feature to trip.
