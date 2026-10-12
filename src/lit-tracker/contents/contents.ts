/**
 * A paper's contents: its sections, each a way to the page it starts on
 * (features/a-paper-shows-its-contents).
 *
 * The shape stored in `article_contents.entries` and read by the sidebar's
 * contents tab. Flat, with a depth, rather than nested: the list is shown flat
 * and indented, the order is the paper's, and a flat array is the shape both
 * sources reduce to without a tree to rebuild.
 */
export interface ContentsEntry {
  /** As printed, numbering included when the paper numbers its sections. */
  title: string
  /** 1 for a chapter or top-level section, 2 for its subsections, and so on. */
  depth: number
  /** 0-based page the section starts on. */
  pageIndex: number
  /**
   * Where on the page it starts, in page points from the top, when the source
   * says. An outline entry that names only a page has none; the reader then
   * goes to the page's top.
   */
  top: number | null
}

/**
 * Where a paper's contents came from — or that there are none, or that reading
 * them failed. Each is a distinct thing to tell the reader.
 *
 * - `outline`: the PDF's own outline (bookmarks).
 * - `headings`: GROBID's numbered section headings, for a PDF without one.
 * - `none`: read, and neither source had anything usable.
 * - `failed`: reading the PDF for its contents went wrong.
 */
export type ContentsSource = 'outline' | 'headings' | 'none' | 'failed'
