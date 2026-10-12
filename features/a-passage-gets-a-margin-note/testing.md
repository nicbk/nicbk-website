# Testing: A Passage Gets a Margin Note

## Unit

- **Placement** (pure):
  - nearer-margin choice for passages either side of the block's centre;
  - width capping (72pt) and insets;
  - the 36pt narrow-margin refusal;
  - a free spot;
  - a spot overlapped by each kind of annotation;
  - a passage near the page's foot, where the note would cross the page edge.
- **Packing** (task 2, pure):
  - the minimum-movement arrangement for two and three notes;
  - order is preserved;
  - the 48pt reach is never exceeded;
  - an infeasible case returns a refusal and no moves;
  - fixed annotations are never moved.
- **Margin geometry from text runs:**
  - block edges from runs;
  - runs of one or two characters (page numbers, footnote marks) do not
    stretch the block.
- **The action:**
  - the highlight is made before its reply;
  - the reply carries `inReplyToId` and `locked`;
  - a refusal creates nothing and reports its reason.
- **Round trip:** a margin note's row keeps `inReplyToId` and `flags` through
  `toRow` and `toAnnotation`.

## Browser

Against the signed-in stack with real papers (an ACM two-column paper,
54/56pt margins; a single-column paper, 108/99pt):

| Check | Engine |
|---|---|
| *margin note* on each column of a two-column paper | Chromium |
| refusal next to an existing mark, and the menu's words | Chromium |
| drag and resize do nothing; double-click edits | Chromium |
| delete the highlight → both gone, also after a reload | Chromium |
| (task 2) stacking two notes, refusing the third | Chromium |
| (task 2) growth to five lines pushes the next note down | Chromium |
| the action from a touch selection, at a phone width | Chromium, touch emulation |
| the same on an iPhone | Safari (user check) |

Geometry is asserted, not read off screenshots. Every claim of "beside",
"level with" or "not overlapping" is checked from rectangles in page points.
