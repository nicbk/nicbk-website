# Status: PDF Reader

**State:** Not started. Third of five, and the feature's one genuine unknown.

- Branch: `article-detail-and-reader/pdf-reader`, from `main` after task 2
  merges.
- Sub-issue: filed with the feature's parent issue at spec review.
- PR: opened once the unit tier and the browser pass are both clean.

## Open items to settle before writing

**The first one is a gate, not a preference.**

- **How the engine mounts.** PDFium is WebAssembly; this site server-renders.
  EmbedPDF's docs are silent on SSR. Establish this against the running app
  *first* — the `ClientOnly` + `React.lazy` pattern the Zero provider uses is
  the fallback, and if it does not work the task's approach changes before
  anything is built on it.
- **Where the wasm binary comes from in a production build.** A library that
  resolves its engine in a dev server and 404s from a built bundle is a normal
  failure mode. Whatever the answer is — bundled asset, public file, CDN (which
  the site's header posture would have to permit) — decide it early, because it
  affects the build config rather than a component.
- **Which EmbedPDF version to pin.** 2.15.x stable at spec time. Re-check what
  is current when the task starts and pin deliberately; the library shipped a
  release the day this feature was spec'd.
- **Whether the reader needs range requests** from task 2's route. If it does,
  that is a deliberate change to a merged task, with the reason recorded — not a
  silent amendment.

## Log

- (not started)
