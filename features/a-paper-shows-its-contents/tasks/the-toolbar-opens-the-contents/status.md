# Status: The Toolbar Opens the Contents

**State:** Implemented, awaiting review ([#248](https://github.com/nicbk/nicbk-website/issues/248)).

## What shipped

- **`contents/contents-button.tsx`**: a floating group of one, with a glyph
  (`ListTree`) and the word *contents*. The word is dropped at 40rem, as the
  *annotate* trigger drops its own.
- **The toolbar's `contents` slot** (`reader-toolbar.tsx`), straight after the
  page group, passed down like `actions`. The reader stays ignorant of the
  sidebar.
- **`sidebar-request.tsx`**: an event channel mounted at the route
  (`route.tsx`). It lets the button ask the rail's sidebar for a tab; the rail
  renders outside the page. It is an event, not state, so a later opening of
  the sidebar by other means is not steered by an old request.
- **The page** (`article-detail-page.tsx`) opens whichever form is showing:
  - on a wide screen it asks the rail;
  - on a narrow one it opens the sheet on *contents* (`initialTab`). The sheet
    mounts only as it opens, too late to hear a request.

  `isNarrowViewport()` is exported beside the drawer's breakpoint, so the two
  cannot disagree.
- **Choosing an entry in the sheet closes it**, through the sidebar's
  `onReaderJump`. The annotations list closes it too, for the same reason: the
  sheet covers the reader the entry was chosen to show. Closing also forgets
  the tab, so the sheet's own trigger opens it on the default tab.
- **A jump to a point may start in the page above** (`go-to.ts`). Found here:
  at 375px the two-row toolbar at 55% zoom is 169pt deep, so a heading 78pt
  down its page was clamped to its page's top and landed 38px behind the
  controls. Unclamped, it lands 7.5px below them. The citation preview's
  **go to** shares the helper and is fixed by the same change.

## Verification (Chromium, 2026-10-12)

- **Toolbar rows, with the button**: one at 1400px and 1024px, two at 375px —
  unchanged — in light and dark, with no group off screen.
- **1400px**: the button selects the rail's *contents* tab and opens no sheet.
- **375px**:
  - the button opens the sheet on *contents*, centred on the marked section;
  - choosing *3.2 Section* closes the sheet, and the heading lands 7.5px below
    the toolbar;
  - the sheet's own trigger then opens it on *tags*.
- **Not yet checked**: Safari on an iPhone (the user's check).

## Log

- 2026-10-12: implemented and verified in Chromium.
- 2026-10-12: spec'd.
