# Status: PDF Reader

**State:** Implemented. Third of five, and the feature's one genuine unknown —
which is now answered.

- Branch: `article-detail-and-reader/pdf-reader`, from `main` after task 2
  merged (`166d743`).
- Sub-issue: **#98**, self-assigned before work began.
- PR: opened once CI is green.

## The open items, settled

**The gate came first, as the task required.** Nothing was built on the mounting
approach until it was demonstrated against the running app.

- **How the engine mounts — answered, and the fallback was the answer.**
  `ClientOnly` + `React.lazy`, exactly the pattern the Zero provider already
  uses. The reader mounts client-only and the page around it — metadata, sidebar,
  shell — still server-renders. The unit tier asserts the *negative* half
  (`article-reader.test.tsx`): the module holding the engine is not so much as
  imported during a server render, so a refactor that quietly makes it
  SSR-eligible fails there rather than in production.
- **Where the wasm comes from — self-hosted, and this was not optional.**
  `usePdfiumEngine`'s default is
  `https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@2.15.0/dist/pdfium.wasm`. The
  decided CSP is `default-src 'self'` and the site already self-hosts its fonts
  to avoid exactly this. Imported through Vite (`?url`) rather than copied into
  `public/`, so the 4.6 MB binary can never drift from the installed package. Its
  optional **font fallback is disabled explicitly** for the same reason — left
  on, a PDF with a missing font makes a reading tool tell jsdelivr which papers
  are being read.
- **Which version — 2.15.0, still current.** Re-checked at task start: 2.15.0
  remains `latest`, with `3.0.0-next.3` on `next`. Pinned **exactly**, not with a
  caret, because EmbedPDF's own inter-package dependencies are exact pins — a
  caret range lets npm build a mixed-version tree. `@rocicorp/zero` is pinned the
  same way and for a similar reason.
- **Range requests — not needed, and not available.** Read out of the installed
  source rather than assumed: `PdfEngine.openDocumentUrl` does one `fetch()` then
  `.arrayBuffer()`. The `mode: 'auto' | 'range-request' | 'full-fetch'` option is
  declared in `@embedpdf/models`' types and **ignored by the 2.15.0 engine** — the
  type surface advertises a capability the implementation does not have. So task
  2's route needs no change, and its `cache-control: private, no-store` stands.
  The consequence worth stating: the whole paper downloads at once, which is why
  the loading state is load-bearing rather than decorative.

## Findings

**Three things this task turned up that the spec could not have predicted.**

- **A root-relative URL cannot be resolved inside a `blob:` worker.** EmbedPDF
  builds its worker with `URL.createObjectURL`, so the worker's base URL is
  `blob:http://origin/<uuid>` — and `blob:` is not a special scheme, so
  `new URL('/assets/pdfium.wasm', blobUrl)` does not merely produce the wrong URL,
  it **throws**. Vite's `?url` import produces exactly that shape. The symptom was
  a reader stuck on "loading the paper…" forever, with a successful PDF request in
  the network log and no error anywhere, because the failure happened inside the
  worker. Fixed by making the URL absolute (`reader/wasm-url.ts`), which is
  tested against the platform behaviour itself so the workaround can be removed if
  browsers ever change.
- **`useScroll`'s page total is 0 until the first page change.** The hook seeds
  `totalPages` from `getTotalPages()` in an effect that runs when the plugin
  registers — before the document is laid out — and revises it only on an
  `onPageChange` event. A paper opened and not yet scrolled therefore reported
  **"1 / 0"**. The count is taken from `documentState.document.pageCount` instead,
  which is right the moment the document loads.
- **The decided CSP would block this reader three ways.** Recorded as an
  amendment to
  [app-security-headers.md](../../../../research/security-privacy/app-security-headers.md)
  rather than left here, because the person who implements that middleware is the
  one who needs it: `script-src` needs `'wasm-unsafe-eval'`, `worker-src` needs
  `blob:`, and `img-src` needs `blob:` (rendered pages are object URLs on an
  `<img>`). Nothing is broken today — no middleware sets those headers yet.

## What was built

- **`reader/`** — the reader, split so the parts a test can hold are outside the
  component: `article-reader.tsx` (the client-only boundary), `pdf-reader.tsx`
  (the EmbedPDF composition), `reader-plugins.ts` (which five plugins, and the
  document URL), `reader-state.ts` (the four states), `use-page-field.ts`,
  `zoom-presets.ts`, `wasm-url.ts`, plus the toolbar and its two control groups.
- **The toolbar** — page navigation with a **typeable** page field, a page
  indicator, and zoom as −/+ around a menu carrying fit-width, fit-page and fixed
  levels. Space is reserved for task 4's annotation tools.
- **The page around it changed shape** (user-decided during implementation; see
  the three research revisions of 2026-08-13). The metadata header is gone: the
  title is in the tracker header beside the app name, the authors and venue are
  in the three-dot menu, and that menu and the sidebar trigger moved into the
  reader's toolbar — which now overlays the document as floating groups rather
  than sitting above it as a solid row. The net effect is that the page *is* the
  reader.

## Verification

**Unit:** 979 passing. Coverage **91.97%**, above main's 91.84% baseline — the
task the feature predicted would trip the ratchet did not, because the logic was
extracted rather than the gate lowered, exactly as
[testing.md](./testing.md) required.

**Browser** (primary evidence for this task, per its testing doc):

- A real 15-page paper from the collection renders, scrolls first page to last,
  and the page indicator tracks **scrolling** rather than only clicks.
- Typing a page number jumps to it; previous/next work and disable at the ends.
- Zoom works through both the steppers and the preset menu; fit-page shows a
  whole page, fit-width fills the panel.
- The document scrolls **inside its panel** and passes under the floating
  toolbar; the page itself never scrolls.
- **Both themes**, and narrow / mid / wide widths.
- **A horizontal-overflow bug was found this way and fixed.** At 420px the whole
  shell — header, rail and document — scrolled sideways past the viewport. The
  cause was not the reader: `lit-tracker-shell` capped its grid *rows* with
  `minmax(0, 1fr)` but left its implicit *column* `auto`, so a PDF page laid out
  at a fixed pixel width sized the column. Fixed on the shell, with `min-width: 0`
  down the reader's own flex chain.
- Opening the article menu now dims and disables the toolbar behind it. Getting
  there surfaced a paint-order trap: the toolbar had to sit above the document,
  but claiming a `z-index` puts it above every portalled popup — the mistake
  `collection-toolbar.module.css` already documents. It renders **last in the
  DOM** instead and needs no `z-index`; the viewport is `tabindex="-1"` with no
  focusable content, so tab order is unaffected.

**All three run modes**, as the constraints require:

- `docker compose up` (the dev stack, which runs Vite) — the primary surface
  above.
- **The production Nitro build** — `npm run build` emits the binary as
  `/assets/pdfium-<hash>.wasm` (4,633,788 bytes, `application/wasm`), the client
  chunk references that hashed path, and the reader renders identically against
  the built server. This was the specific risk the task named, and the network
  log confirms what the CSP amendment claims: the PDF comes from this app's own
  route, the page images are `blob:` URLs, and **no CDN is contacted**.
- `npm run dev` — the same Vite dev server the Compose stack runs, verified
  through it (the host-run variant cannot reach the containerized database; see
  the project note on browser-verifying through Compose).

## Log

- **2026-08-13** — Task started; #98 self-assigned. EmbedPDF re-verified at
  2.15.0 and pinned exactly. Mounting gate cleared against the running app before
  anything was built on it. Reader, toolbar and states implemented. Three
  findings recorded above, one of them amending a decided research doc. The
  page's layout was reworked with the user mid-task — metadata header removed,
  toolbar made an overlay — and recorded as revisions to `header.md`,
  `article-detail.md` and `reader-annotation.md`. Unit tier green at 979 with
  coverage above baseline; browser pass complete in both themes at three widths
  and in all three run modes.
