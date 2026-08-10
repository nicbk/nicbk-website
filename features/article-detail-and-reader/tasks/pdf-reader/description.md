# Task: PDF Reader

**Third of five.** The paper on the screen.

This task mounts EmbedPDF's headless build in the detail page's main content
area, loading from task 2's route, and gives it the decided persistent toolbar:
page navigation, a page indicator, and zoom. It is **view-only** — no annotation
tools, no `annotations` table, nothing that writes.

This is the feature's one genuine unknown, and the task is scoped so that it is
the *only* unknown in it. The bytes are already proven correct by task 2; the
page around the reader is already built by task 1. What is left is the question
nobody has answered yet: **how does a WebAssembly PDF engine mount inside a
server-rendered TanStack Start app?**

## What it does

- **Verifies the mounting approach before building on it.** PDFium is
  WebAssembly and every other page on this site renders on the server.
  EmbedPDF's documentation says nothing about SSR either way. The task's first
  move is to establish, against the running app, that the reader mounts
  client-only without breaking the server render of the page around it — and the
  `ClientOnly` + `React.lazy` pattern the Zero provider already uses is the
  fallback, not the assumption.
- **Composes this project's own UI**, per the technology decision. The headless
  path was chosen specifically because the drop-in styled component felt janky;
  adopting it here would discard the reason the library was picked.
- **Registers the plugins the viewer needs** — document manager, viewport,
  scroll, render, zoom — and no more. Thumbnails, search, rotation, printing,
  and spreads are all available and all unasked-for.
- **Loads the document from task 2's route** as a same-origin URL, which is the
  shape EmbedPDF's document manager takes.
- **Builds the persistent toolbar** the decided spec calls for — not floating,
  not contextual — with the page and zoom controls in it and **space reserved
  for the annotation tools task 4 adds**, so task 4 fills a toolbar rather than
  rearranging one.
- **Fits the shell's panel model**: the document scrolls inside its own bounded
  panel and the page itself never grows a scrollbar, and the per-container
  `overscroll-behavior` rule the site now follows applies to whatever scroll
  region the reader creates.
- **Says what it is doing.** A megabyte download and a WebAssembly cold start
  are both visible waits; the reader reports loading, and reports a document
  that cannot be fetched **distinctly** from one that is still arriving.

## What it does not do

- **No annotations of any kind** — no tools, no table, no persistence. Task 4.
- **No annotations list.** Task 5.
- **No undo/redo**, and no history plugin. Out of scope by decision.
- **No text search, thumbnails, printing, rotation, or page spreads.**
- **No changes to task 2's route** unless the reader demonstrably needs
  something it does not provide — in which case that is a finding to bring back
  deliberately, with the reason recorded.

## Exit state

A user opens a paper and reads it: pages render, scroll, and turn; zoom works;
the document sits inside the app shell at every width and in both themes, and
the toolbar above it has a visible, deliberate gap where the annotation tools
are about to go.
