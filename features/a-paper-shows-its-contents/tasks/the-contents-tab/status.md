# Status: The Contents Tab

**State:** Implemented, awaiting review ([#247](https://github.com/nicbk/nicbk-website/issues/247)).

## What shipped

- **`queries.articleContents.forArticle`**: the row by sync, scoped by owner as
  well as by article, with a unit test and a cross-user isolation test.
- **`-article-detail/contents/`**:
  - `contents-view.ts`: the six states (loading, error, reading, none, failed,
    entries). A paper whose extraction failed says *couldn't read*, not
    *reading…*, because nothing will ever read it;
  - `section-in-view.ts`: the last entry whose start has reached the line;
  - `contents-panel.tsx`: the list, indented by depth, the marked entry
    (`aria-current="location"`) kept in view;
  - `keep-in-view.ts`: scrolls the list only, never the sheet or page;
  - `use-article-contents.ts`.
- **The reader bridge (`reader-jump.tsx`)** carries a point as well as a page,
  and carries the reader's **reading line** back as a store. A list selects
  from it (`useReadingLine`), so the list re-renders when the section changes,
  not on every scroll frame.
- **The reader** jumps to a point just below its toolbar, using
  `reader/go-to.ts`, which was moved out of the citation preview so both jumps
  stop in the same place. It reports its reading line
  (`use-report-reading-line.ts`, `reading-line.ts`) and withdraws it while
  hidden.
- **The strip**: a fifth tab (`ListTree`), equal glyph tabs, and a glyph
  threshold of 25rem.
- **`research/ui-ux/pages/lit-tracker/pages/article-detail.md`**: a revision
  recording the fifth tab.

## Decided at implementation (2026-10-12)

- **The section in view is measured at the jump's landing line, not the
  panel's top third.** With the top third, choosing an entry often marked the
  next one: a subsection starting within a third of a screen of its section
  was past the line as soon as the jump landed. At the landing line, every
  entry chosen in the browser was the entry marked. Once the end of the paper
  is on screen the line drops to the panel's bottom, so the last sections,
  which can never reach the top, are still marked when chosen.
- **The end is read from the scroller's metrics** (the last page's bottom in
  view), not the scroll container's `scrollHeight`. The viewport plugin records
  that only on resize; measured, it still read the empty container's 796px
  with 120 pages laid out.
- **No page numbers in the rail.** On a 120-page textbook, three-digit page
  numbers left "Subsection" breaking as "Subsectio / n" on every row. The sheet
  keeps them.
- **The list does not follow the mark while the pointer is on it.** A jump
  passes through every section on its way, and the list chased each one, so
  the row under the pointer changed after the click.
- **Hyphenation** (`hyphens: auto`) for titles wider than the rail. It works
  in Safari, Firefox and Chrome on macOS. The sandbox's Linux Chromium has no
  hyphenation dictionary, so it breaks a long word without a hyphen there.

## Verification (Chromium, 2026-10-12)

The page was seeded with a generated 120-page textbook: a 252-entry,
three-level outline, each heading printed where its entry points, and one
title of 80 characters.

- **The strip** is one row at 1400px, 1024px and 375px, in light and dark.
  The rail has five 28.6px tabs. The 375px sheet has five 65.4px glyph tabs;
  before the threshold change it wrapped *annotations* onto a second row.
- **Jumps** to five entries (a chapter, sections, subsections) put the heading
  7.5–8.4px below the toolbar's bottom. That matches the 8px breathing room
  `go-to.ts` leaves. The entry marked afterwards was the entry chosen each
  time, including the last section and a jump made after leaving the citation
  graph.
- **Reading on** by wheel moved the mark 1.1.1 → 1.1.2 → 1.1.3.
- **The whole list** was scrolled end to end in the rail and the sheet.
  Empty states were checked: *no outline or numbered sections* on TraceMonkey
  with no headings, and *couldn't read* on a file the engine cannot open.
- **Not yet checked**: Safari on an iPhone (the user's check).

## Log

- 2026-10-12: implemented and verified in Chromium.
- 2026-10-12: spec'd.
