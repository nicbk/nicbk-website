import type { PdfLinkTarget } from '@embedpdf/models'
import { PdfActionType } from '@embedpdf/models'
import type { LockMode } from '@embedpdf/plugin-annotation'
import { LockModeType } from '@embedpdf/plugin-annotation'

/**
 * A paper's own links: fixed in place, and what clicking one does.
 *
 * Every PDF arrives carrying link annotations — citations, URLs, "Table 1" — and
 * EmbedPDF loads them into the same store as a reader's marks. Its built-in link
 * renderer declares them draggable and resizable and selects one on
 * pointer-down, so until #22 clicking the citation `[13]` selected it and offered
 * **write a note** and **delete annotation**. None of it was ever saved — the
 * annotation sync ignores the file's own annotations — so every such edit
 * reverted on reload: the reader offered changes it then silently discarded.
 *
 * Links are **locked** instead. A locked annotation is never selected, dragged,
 * resized or given a menu, and its renderer's locked form draws in its place —
 * which is where `link-target.tsx` decides what a click does.
 */

/**
 * The category the lock names, carried by the link tool and nothing else.
 *
 * **A category of its own is the whole trick.** EmbedPDF's default link tool is
 * categorised `['annotation', 'markup']` — exactly what the highlighter,
 * underline and the other markup tools carry — and the lock matches an
 * annotation by its tool's categories. Locking `markup` would lock every mark a
 * reader has made along with the links.
 */
export const LINK_CATEGORY = 'link'

/**
 * Replaces the default link tool's categories with `LINK_CATEGORY` alone.
 *
 * EmbedPDF merges a tool override over the default of the same id, with the
 * override's top-level fields winning — so `categories` is replaced, not
 * appended to, and the link tool leaves `markup` behind.
 */
export const LINK_TOOL_OVERRIDE = {
  id: 'link',
  categories: [LINK_CATEGORY],
}

/** Locks every annotation matched to a tool in `LINK_CATEGORY`: links, only. */
export const LINK_LOCK: LockMode = {
  type: LockModeType.Include,
  categories: [LINK_CATEGORY],
}

/** What a click on a link should do. */
export type LinkClickAction =
  /** Put this text on the clipboard. */
  | { kind: 'copy'; text: string }
  /**
   * A place in this document. Inert for now; previewing it in place is task 3
   * of #22 (`a-citation-previews-in-place`).
   */
  | { kind: 'internal' }
  /** Nothing this reader follows: no target, another file, a script. */
  | { kind: 'none' }

const MAILTO = /^mailto:/i

/**
 * What a click on a link with this target does.
 *
 * - **A URL is copied**, not opened — decided with the user, 2026-09-14. A
 *   misclick that leaves the reader mid-paper costs more than a paste.
 * - **A `mailto:` link copies the address alone**, because the address is what
 *   anyone pasting it wants; `mailto:` in a To field is a typo to delete.
 * - **A destination in this document** is `internal`.
 * - **Everything else is `none`**: a missing target, a link into another file
 *   (`RemoteGoto`), a launch action or anything unsupported. Following a link
 *   out of the paper into something that is not a web address is not a thing
 *   this reader does.
 */
export function linkClickAction(
  target: PdfLinkTarget | undefined,
): LinkClickAction {
  if (!target) {
    return { kind: 'none' }
  }
  if (target.type === 'destination') {
    return { kind: 'internal' }
  }

  const { action } = target
  if (action.type === PdfActionType.Goto) {
    return { kind: 'internal' }
  }
  if (action.type === PdfActionType.URI) {
    const uri = action.uri.trim()
    if (uri === '') {
      return { kind: 'none' }
    }
    if (MAILTO.test(uri)) {
      // Only the address: any `?subject=…` is dropped along with the scheme.
      const address = decodeOrKeep(uri.replace(MAILTO, '').split('?')[0] ?? '')
      return address === '' ? { kind: 'none' } : { kind: 'copy', text: address }
    }
    return { kind: 'copy', text: uri }
  }
  return { kind: 'none' }
}

/**
 * Percent-decodes an address, or leaves it as written if it is not validly
 * encoded — a paper's link is whatever its author typed, and a malformed `%`
 * must not turn a click into an exception.
 */
function decodeOrKeep(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}
