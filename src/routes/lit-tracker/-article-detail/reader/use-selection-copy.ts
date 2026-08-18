import type { SelectionCapability } from '@embedpdf/plugin-selection'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copying the selected passage: the request, the clipboard write, and what the
 * reader is told about how it went.
 *
 * **The plugin's `copyToClipboard` does not copy.** It checks the document's
 * permission, reads the selected text and then *emits an event* — the thing that
 * actually reaches the clipboard is a `CopyToClipboard` utility that ships in
 * the package's `/react` entry and is auto-mounted only by the plugin package
 * exported from there. This reader registers the bare package
 * (`reader-plugins.ts`), so nothing was listening; calling it would have been a
 * silent no-op. Listening here rather than switching the registration is the
 * better trade anyway: the library's own utility calls
 * `navigator.clipboard.writeText` with no `catch`, and a refused clipboard —
 * which is ordinary, being permission-gated in every browser — would have become
 * an unhandled rejection and a button that appeared to work.
 *
 * So the flow is: the control asks the plugin, the plugin decides whether the
 * document allows it and resolves the text, and this writes it and reports.
 */

/**
 * What to say about the last attempt. `idle` is also what a *new* selection
 * returns to — a "copied" from the previous passage would be a claim about text
 * the reader is no longer looking at.
 */
export type CopyState = 'idle' | 'copied' | 'failed'

/** How long "copied" stays on screen before the control goes quiet again. */
const CONFIRMATION_MS = 1600

interface SelectionCopy {
  /** Copies the current selection, if there is one and the PDF allows it. */
  copy: () => void
  state: CopyState
  /**
   * Whether a passage is selected right now.
   *
   * Reported from here rather than by a second subscription elsewhere, because
   * this hook is already listening for the change that decides it — and because
   * the one caller that needs it needs it for the same reason this exists: the
   * ⌘C handler must only take the key when there is something to copy.
   */
  hasSelection: boolean
}

export function useSelectionCopy(
  articleId: string,
  selection: SelectionCapability | null,
): SelectionCopy {
  const [state, setState] = useState<CopyState>('idle')
  const [hasSelection, setHasSelection] = useState(false)

  /*
   * The timer is a ref rather than state because nothing renders from it, and
   * clearing the previous one on every outcome is what keeps a second copy from
   * being un-confirmed by the first one's expiry.
   */
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const report = useCallback((next: CopyState) => {
    setState(next)
    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current)
    }
    resetTimer.current = setTimeout(() => setState('idle'), CONFIRMATION_MS)
  }, [])

  useEffect(
    () => () => {
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current)
      }
    },
    [],
  )

  // The other half of `copy()`: the plugin resolved the text, so write it.
  useEffect(() => {
    if (!selection) {
      return
    }
    return selection.onCopyToClipboard((event) => {
      if (event.documentId !== articleId) {
        return
      }
      navigator.clipboard.writeText(event.text).then(
        () => report('copied'),
        // A clipboard write can be refused — by permission policy, by a
        // document that is not focused, or by a browser that has no clipboard
        // API at all over plain HTTP. The reader is told; the alternative is a
        // control that looks like it worked.
        () => report('failed'),
      )
    })
  }, [selection, articleId, report])

  /*
   * A new selection is a new question, so the last answer goes away at once
   * rather than waiting out its timer. Without this, selecting a second passage
   * within the confirmation window shows "copied" for text that has not been.
   */
  useEffect(() => {
    if (!selection) {
      return
    }
    return selection.onSelectionChange((event) => {
      if (event.documentId !== articleId) {
        return
      }
      setHasSelection(event.selection !== null)
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current)
        resetTimer.current = null
      }
      setState('idle')
    })
  }, [selection, articleId])

  const copy = useCallback(() => {
    selection?.copyToClipboard(articleId)
  }, [selection, articleId])

  return { copy, state, hasSelection }
}
