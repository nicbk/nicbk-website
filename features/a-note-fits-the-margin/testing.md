# Testing: A Note Fits the Margin

## Unit

- The override is the `freeText` id, carries a complete `defaults` (subtype,
  contents, colour, font family, alignment) and not a partial one, and sets
  `fontSize` to the decided 8.
- Its `clickBehavior` names a 72pt width and keeps click creation enabled.
- The reader's plugin registration passes the override alongside the link one,
  so neither replaces the other.

Mutation checks, each of which must fail a test: dropping the colour from
`defaults`; leaving `fontSize` at 14; passing only the new override, so the link
tool's lock is lost.

## Browser

| Check | Where |
|---|---|
| a click in a 72pt margin (RoBERTa) fits, and the text is smaller than the paper's | Chrome, local |
| the same on a 108pt margin (Attention) | Chrome, local |
| typing, then reload: the note persists at 8pt | Chrome, local |
| a dragged box keeps its rectangle | Chrome, local |
| a note written at 14pt before the change still renders at 14pt | Chrome, local |
| the note reads at a phone's width | Safari, 375px bounds |

Measured, not eyeballed: the box's rectangle in page points against the text
block's left edge, from the same GROBID coordinates the research used.
