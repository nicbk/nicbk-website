# Feature: A Paper Shows Its Contents

**#29** in [../index.md](../index.md). A paper's chapters and sections, listed
beside it, each one a way to the page it starts on.

## What it is

User-requested 2026-10-11:
- *"ability to show a chapter/section outline with ability to navigate to
  different sections"*;
- *"would be nice to have a way to automatically find the chapter/section
  structure. Sometimes articles/textbooks will have the chapter/sections as
  links, and sometimes not."*

The two were combined into one feature on 2026-10-12, with a fifth sidebar tab,
a toolbar button that opens it, and a job that finds the contents of papers
already in the collection.

## What it delivers

- **The contents are found automatically, from the best source a paper has:**
  1. **its own outline**, the bookmarks a PDF carries. LaTeX's `hyperref`
     writes one, and so do most publishers' and books' PDFs. It is exact, and
     each entry names its page and position.
  2. otherwise, **its numbered section headings as GROBID reads them**, with
     where each one is printed. Only the numbered ones are used: GROBID also
     reports figure labels and run-in paragraph heads, and those make a noisy
     list (`research.md` §3).
  3. otherwise, **nothing**, and the tab says so plainly.
- **A *contents* tab in the article sidebar.** It lists the sections, indented
  by level, and marks the one in view. Choosing one scrolls the reader to where
  that section starts.
- **A *contents* button in the reader's toolbar** that opens the tab, so the
  list is one press away while reading, on a phone too.
- **Papers already in the collection gain contents** through a background job.
  This is the same pattern as the reference re-read (#10), and it reads each
  stored PDF once.
- **The sidebar stays one clean row with five tabs.** In the rail, five glyph
  tabs share the width evenly. The words show only where all five fit.

## What it does not do

- **No guessing from fonts.** A paper with no outline and no numbered headings
  gets no contents. Guessing headings from type size and weight was measured to
  be unreliable: one paper reports its body text as 1pt (`research.md` §4). That
  is the next step if real gaps show up in the collection.
- **No editing of the contents.** They are read from the paper. If they are
  wrong, the source is wrong.
- **No contents page parsing.** A book whose printed contents page links to its
  chapters but has no outline is covered by neither source. That is rare in
  practice, because the tools that make such links also make an outline.

## Exit state

Open a paper, press *contents*, choose a section, and the reader is there. A
paper uploaded months ago has its contents too.
