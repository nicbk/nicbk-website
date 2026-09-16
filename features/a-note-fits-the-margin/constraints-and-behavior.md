# Constraints and Behavior: A Note Fits the Margin

## Behavior

- **A new text box is 8pt**, in the engine's red (`#E44234`), Helvetica, left
  aligned — everything else the tool already defaults to.
- **A click puts down a box 72pt wide**, the narrow margin measured in
  [research.md](./research.md), with a height that suits one line at 8pt rather
  than the 20pt a 14pt line wanted.
- **A drag puts down the box the reader drew**, as now; only the text inside it
  changes size.
- **A note already on a paper is untouched**, at the size it was written.

## Constraints

- **The default is overridden, not re-declared.** `reader-plugins.ts` already
  passes a tool override for `link`; this adds one for `freeText`. The plugin
  merges by id with the override's **top-level fields replacing** the base's, so
  `defaults` and `clickBehavior` are each spelled in full — a partial `defaults`
  would silently drop the colour, the font and the subtype.
- **The numbers live in one module with the reason beside them**, not inline in
  the plugin registration, so the measurement that chose 8pt is readable from
  the value.
- **No schema, no migration, no pipeline work.** The size is a property of each
  annotation the engine writes.
- **The tool list and its labels are unchanged**: this is not a new tool.

## Acceptance criteria

1. Choosing *text box* and clicking in the 72pt margin of an ACL-style paper
   puts down a box that fits inside the margin, and the text typed into it is
   visibly smaller than the paper's body text.
2. The same click on a NeurIPS-style paper (108pt margin) also fits, with room
   to spare.
3. A box created by dragging keeps the dragged rectangle and writes at 8pt.
4. A note written before this change still renders at its own size after a
   reload.
5. The note is still the engine's red, still editable, and still persists across
   a reload.
