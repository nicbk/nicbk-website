import { useEffect, useState } from 'react'

/**
 * The page number a reader can type into, and the rule about when it stops
 * agreeing with the document.
 *
 * The field has two masters: it reports the page currently in view, which
 * changes continuously as the reader scrolls, and it accepts a page to jump to,
 * which the reader types a digit at a time. Bound naively to the current page,
 * typing "12" into a document showing page 3 would be overwritten back to "3"
 * the instant any scroll happened — and on a trackpad, something is always
 * scrolling.
 *
 * So the same editing-vs-non-editing rule the notes field uses
 * (research/ui-ux/design-system.md, `use-article-notes.ts`) applies here in its
 * simplest form: **while the field has focus it belongs to the reader, and the
 * document's page is adopted only when it does not.**
 */

interface UsePageFieldOptions {
  /** The page in view, 1-based, from the document. */
  currentPage: number
  /** How many pages there are, for clamping. */
  totalPages: number
  /** Called with a valid page when the reader commits one. */
  onCommit: (page: number) => void
}

/**
 * Reads a typed page number, or `null` if it is not one.
 *
 * Out-of-range numbers are clamped rather than rejected: someone who types 900
 * into a 12-page paper means the end of it, and refusing the input entirely
 * would leave them looking at a field that ignored them. Non-numbers are `null`
 * — there is nothing sensible to do with "abc", so the field reverts.
 */
export function parsePageInput(
  value: string,
  totalPages: number,
): number | null {
  const trimmed = value.trim()
  // A digits-only test, because `Number('')` is 0 and `Number('3px')` is NaN
  // but `Number(' 3 ')` is 3 — none of which is a page number the reader typed.
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const page = Number(trimmed)
  if (page < 1) {
    return 1
  }
  return Math.min(page, totalPages)
}

export function usePageField({
  currentPage,
  totalPages,
  onCommit,
}: UsePageFieldOptions) {
  const [draft, setDraft] = useState(String(currentPage))
  const [editing, setEditing] = useState(false)

  // Adopt the document's page whenever the reader is not typing. This is what
  // makes the field track scrolling rather than only clicks.
  useEffect(() => {
    if (!editing) {
      setDraft(String(currentPage))
    }
  }, [currentPage, editing])

  /**
   * Commits what was typed, and hands the field back to the document.
   *
   * An unparseable entry commits nothing and reverts, which happens for free:
   * `editing` goes false, so the effect above restores the real page.
   */
  function commit() {
    const page = parsePageInput(draft, totalPages)
    setEditing(false)
    if (page !== null && page !== currentPage) {
      onCommit(page)
    }
  }

  return {
    /** What the input shows: the reader's text while editing, the page otherwise. */
    value: draft,
    onChange: (next: string) => {
      setEditing(true)
      setDraft(next)
    },
    onFocus: () => setEditing(true),
    onBlur: commit,
    /** Enter commits without waiting for focus to leave. */
    onEnter: commit,
  }
}
