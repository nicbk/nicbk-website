/**
 * The text box the reader is typing into, if there is one, and the page it is
 * on.
 *
 * **Read from what the engine drew, because the engine keeps it to itself.**
 * Whether a text box is being edited is private React state inside EmbedPDF's
 * annotation layer — one `editingId` per page — with no capability method to
 * read it or end it (checked against 2.15.0, 2.15.1 and 3.0.0-next.14). What it
 * does do is draw the box it is editing as `contenteditable="true"`, and nothing
 * else on a page is, so the attribute is the one faithful outward sign of that
 * state.
 *
 * Scoped to the reader's own pages through {@link READER_PAGE_ATTRIBUTE}, so a
 * rich-text field anywhere else on the site can never be mistaken for a note.
 */

/** Marks one page of the paper, with its 0-based index. Set in `pdf-reader.tsx`. */
export const READER_PAGE_ATTRIBUTE = 'data-reader-page'

export interface NoteBeingEdited {
  /** The engine's editor: the text box, while it takes typing. */
  editor: HTMLElement
  /** The 0-based page it is on — which annotation layer is holding it. */
  pageIndex: number
}

/** The note being written somewhere under `root`, or null when there is none. */
export function noteBeingEdited(root: ParentNode): NoteBeingEdited | null {
  const editor = root.querySelector<HTMLElement>(
    `[${READER_PAGE_ATTRIBUTE}] [contenteditable="true"]`,
  )
  if (!editor) {
    return null
  }
  const page = editor.closest(`[${READER_PAGE_ATTRIBUTE}]`)
  const pageIndex = Number(page?.getAttribute(READER_PAGE_ATTRIBUTE))
  if (!Number.isInteger(pageIndex)) {
    return null
  }
  return { editor, pageIndex }
}

/** The note being written on one particular page, if it still is. */
export function noteBeingEditedOn(
  root: ParentNode,
  pageIndex: number,
): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[${READER_PAGE_ATTRIBUTE}="${pageIndex}"] [contenteditable="true"]`,
  )
}
