# Status: The Text Box Fits a Margin

**State:** Complete ([#217](https://github.com/nicbk/nicbk-website/issues/217);
merged in [#218](https://github.com/nicbk/nicbk-website/pull/218)).

## What shipped

- **`margin-text-box.ts`**: the decision — 8pt text, a 72 × 40pt click box —
  with the measurements beside the values, and a clone of the engine's resolved
  `freeText` that changes those and nothing else.
- **`use-margin-text-box.ts`**: the lifecycle half, mirroring
  `use-highlight-box-tool.ts`. Idempotent through the sizes rather than the id,
  because the id is the engine's own and always present: replacing a tool the
  reader is holding would take it out of their hand mid-mark.

## Decided at implementation (2026-09-16)

- **Cloned, not declared.** The spec first said to pass a static override in the
  plugin's `tools` array. Reading the plugin showed that would replace the whole
  `defaults` object rather than add a size to it — dropping the red, the font,
  the prompt and the subtype. The clone changes two numbers and inherits the
  rest, which is also what `highlight-box-tool.ts` does and why.
- **A height, which the spec had not asked for.** The editor draws the text in a
  span of the annotation's own height with `overflow: hidden`, and the plugin's
  free-text transform handles only move, resize and rotate — so the box does not
  grow with what is typed, and anything past it is invisible until it is
  resized. The engine's 20pt held 1.2 lines of its 14pt text. 40pt holds four
  lines of 8pt (4 × 8 × 1.18 = 37.8), and a margin has the vertical room.

## Verified

- **Unit.** The two numbers; that the clone keeps the colour, the prompt, the
  subtype, the id, the name and the interaction; that click creation and its
  default content survive; the idempotency guard, including a half-applied tool.
  Mutation checks: dropping a field from the cloned defaults, and leaving the
  size at 14, each fail a test.
- **Chrome, local, measured in page points rather than eyeballed:**
  - *RoBERTa* (A4, 72pt margin, 9.8pt body): the box came out **72.0 × 40.0pt at
    exactly 8.00pt**, flush against the text block's left edge at 72pt, and held
    "check this claim against Devlin et al 2019" over three lines with a fourth
    to spare — about eighteen characters to a line, as the research predicted.
  - **After a reload**: still 72 × 40pt at 8pt, still `#E44234`, text intact.
  - *Attention* (US Letter, 108pt margin): the same 72 × 40pt box at 8pt, right
    edge at 72.6pt — **35pt of margin left over**.
- **Safari, 375px:** the note sits in the margin without touching the text
  block. With the whole page fit to a phone it draws at 4.5 CSS pixels — the
  paper's own body text is 5.5 there, so it is small in the way the page is
  small, not disproportionate.

Both test notes were deleted afterwards, through the annotation's own delete
control; a reload confirms the papers are as they were.

## Log

- 2026-09-16 — Spec'd.
- 2026-09-16 — Implemented, and verified against both margin widths.
- 2026-09-16 — #218 merged.
