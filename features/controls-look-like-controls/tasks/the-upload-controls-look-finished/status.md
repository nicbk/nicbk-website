# Status: The Upload Controls Look Finished

**State:** **Merged** (2026-09-14), behind green CI and human review. Task 2 of 2.

- Branch: `controls-look-like-controls/the-upload-controls-look-finished`, from
  `main` at `cdcf60b` with task 1 merged.
- Sub-issue: [**#163**](https://github.com/nicbk/nicbk-website/issues/163).
- PR: [**#166**](https://github.com/nicbk/nicbk-website/pull/166). Merged as
  `1319f0a`; branch deleted.
- **This completed #18.** The parent issue
  [#161](https://github.com/nicbk/nicbk-website/issues/161) was checked, had not
  closed itself, and was closed by hand — the fifth in a row.

## Why this task exists

Three controls in the upload cluster worked and looked unfinished: a "+" measured
at 28.4 × 39.5px, a file input with no border, background, padding or radius, and
a spinner whose box was 18.4px — fractional, putting its rotation centre off the
pixel grid.

## What shipped

### The "+" is square, and the row still decides its size

`aspect-ratio: 1` on `.trigger`, with `.controls { align-items: stretch }` left
exactly as it was. That stretch is a fix in its own right — three controls each
sized to their own contents looked ragged in a row — so squaring the button by
opting out of it would have traded one defect for the older one. This way the row
still sets the height and the button is square at whatever height that is.

**Measured: 39.5 × 39.5, aspect 1.000**, from 28.4 × 39.5. It grew rather than
shrank, which also makes it a more comfortable target.

### The picker is a field, not a bordered native control

**The first attempt was rejected on review, correctly.** It put a dashed border
around the platform's own control and stopped — which left the stock grey
"Choose Files" button hard against the words "No file chosen", with no spacing
between them, inside a rectangle. That is a boundary drawn to satisfy the
request, not a design, and the user said so.

What it is now: the native input is **clipped behind a `<label>` drawn as the
field** — 127px tall, centred on a file icon, a prompt and a hint. Clicking the
label opens the platform dialog because that is what a label *does*; there is no
click forwarded in JavaScript and no ref.

- **The prompt names the file back**, which was the only useful thing the
  platform summary did: one filename, elided if long, or "3 PDFs selected" once
  there is more than one. A column of paper filenames would push the submit
  button off a small screen.
- **Dashed, not solid** — solid on a box this size reads as a text area,
  somewhere to type rather than to pick from.
- **It still does not say "drop files here"**, because it still does not accept
  drops.
- **Clipped, never `display: none`.** That would take the input out of the tab
  order and out of the accessibility tree. Tab reaches it, the label supplies its
  accessible name, and the focus ring is drawn on the *field* — a ring around one
  clipped pixel would show a keyboard reader nothing.

### The spinner's box is a whole number of pixels

`1.15em` → `1.125rem`. **Measured 18 × 18, pivot at (9, 9)** — was 18.4 × 18.4
with the pivot at 9.2.

`em` could never have fixed this: the toolbar's own font-size is
`clamp(0.75rem, 2.5vw, 1rem)`, so `1.15em` is fractional at essentially every
viewport width rather than at some. The static icons keep `1.15em`, the value
every control in the tracker uses — a glyph rasterized once and never rotated
does not judder, and `1.15em` appears in **eleven** stylesheets here with the
reader deriving `--reader-control-height` from it, so changing it globally is a
different job than this one.

## What the browser measured — 2026-09-13, Chrome, local Compose stack

| Check | Result |
|---|---|
| the "+" | **39.5 × 39.5**, aspect **1.000** |
| the row still lines up | "+" and the status indicator both span 80 → 119.5 |
| `.controls` untouched | still `align-items: stretch` |
| the field | 358.7 × **127.4**, `1px dashed`, radius 4px, cursor pointer |
| the field says | "choose PDFs" / "up to 20 PDFs at once" — no platform button, no "No file chosen" |
| a chosen file | the field names it: `attention-is-all-you-need.pdf`, and submit becomes "upload 1 PDF" |
| **a realistic long filename** | 84 characters: elided, does not overflow the field, modal stays on screen |
| the input is still native | `type="file"`, `multiple: true`, 1×1 clipped, `display: block`, focusable |
| keyboard | Tab reaches the input; the ring draws on the **field** at `rgb(138,180,248) solid 2px` |
| the spinner's box | **18 × 18**, pivot (9, 9), integral |
| dark theme | field text `rgb(236,236,236)` on `rgb(38,38,38)`, sitting a shade lighter than the card's `rgb(31,31,31)` so it reads as an inset well; icon and hint muted |

No upload was performed, so **no test data was created and none needed deleting**.

## What is not verified, and why

- **The spinner actually spinning.** It only renders while a job is in flight,
  and exercising it means uploading a real PDF. Its box was measured by applying
  the rule's own class to a probe element rather than by watching one turn, so
  what is confirmed is the geometry, not the motion.
- ~~**Whether the wobble is gone.**~~ **Answered: the user confirms it is**
  (2026-09-14). The fractional box was the cause, and holding back the
  composited-layer fallback is what made a single change answer the question.
  The stylesheet now records it as a known hazard rather than a hypothesis:
  anything that *rotates* needs a whole-pixel box, and `1.15em` cannot give one
  on a surface whose font-size is clamped.
- **Phone width.** Chrome's minimum window width stops the resize at ~500px, and
  the checks above were taken at 1440. `aspect-ratio` and a dashed border do not
  depend on width, and the row's behaviour below the breakpoint is #8's and
  unchanged.

## An observation, not fixed here

The status indicator beside the "+" now measures **28.4 × 39.5** — the shape the
"+" just left. It has no border or background, so nothing about it looks
stretched, which is why this task leaves it alone. Worth knowing it is there if
that indicator ever gains a box.

## Log

- 2026-09-14 — **Merged** (#166), completing #18. **The user confirms the spinner
  wobble is gone** — the one change whose effect could not be measured from this
  side turned out to be the one that settled a cause.
- 2026-09-14 — **Picker redesigned after review.** The first version satisfied
  the written requirement — "a dotted boundary" — and failed the actual one. The
  user's words: *don't just throw up a dotted line boundary to satisfy the
  request.* They were right, and the lesson generalises past this control:
  **a requirement phrased as a visual property can be met without designing
  anything.** "Dotted outline" was the *description* of a fix somebody had
  already pictured; the fix was a field you press, and a border around the
  platform's own two-part control is not that. The task's own spec said "make it
  read as a target" and was still satisfiable by a rectangle — worth remembering
  next time an acceptance criterion names a property rather than an outcome.
  1627 unit tests pass (1622 + 5).
- 2026-09-13 — Implemented. 1622 unit tests pass (1618 + 4). All three new tests
  were checked by reproducing their bug — removing `aspect-ratio`, restoring
  `border: none`, and putting `1.15em` back — and confirming each fails.
- 2026-09-13 — Spec'd.
