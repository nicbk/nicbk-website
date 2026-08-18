import { useEffect } from 'react'

/**
 * ⌘C / Ctrl+C over the paper.
 *
 * **The shortcut does nothing without this, and that is not obvious from
 * looking at the page.** A reader drags across a paragraph and sees text
 * highlighted in blue, so they press the key every other application has taught
 * them — and nothing happens. The highlight is EmbedPDF's own: rectangles drawn
 * over a canvas at the glyph positions the engine reports. The browser has no
 * text selected, so the platform's copy has nothing to copy.
 *
 * On the window rather than the viewport, for the reason the reader's Escape
 * handler gives: the viewport is not focusable, so a listener there would fire
 * only when something inside it happened to hold focus, which is exactly when
 * this is least needed.
 */

interface CopyShortcutOptions {
  /** Whether there is a passage selected. No selection, no interception. */
  hasSelection: boolean
  copy: () => void
}

export function useReaderCopyShortcut({
  hasSelection,
  copy,
}: CopyShortcutOptions): void {
  useEffect(() => {
    if (!hasSelection) {
      return
    }

    function intercept(event: KeyboardEvent) {
      if (event.key !== 'c' || !(event.metaKey || event.ctrlKey)) {
        return
      }
      /*
       * Never taken from a field the reader is typing in.
       *
       * The reader has real text inputs on the same page — the page-number
       * field, the note editor on a mark, the sidebar's notes tab — and a
       * selection on the paper can easily outlive the moment focus moves into
       * one of them. Copying the paper's words while the cursor sits in a
       * textarea would be indistinguishable from the clipboard being broken.
       */
      if (isTextEntry(event.target)) {
        return
      }
      /*
       * And never taken from a browser selection the reader actually made. Text
       * outside the canvas — the sidebar's rows, the article title — selects
       * normally, and that selection is the browser's to copy.
       */
      if (hasDocumentSelection()) {
        return
      }

      // Only now is the default copy certain to be a copy of nothing.
      event.preventDefault()
      copy()
    }

    window.addEventListener('keydown', intercept)
    return () => window.removeEventListener('keydown', intercept)
  }, [hasSelection, copy])
}

/** Whether the event landed somewhere the reader could be typing. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

/** Whether the browser itself holds a non-empty selection. */
function hasDocumentSelection(): boolean {
  const selection = window.getSelection()
  return selection !== null && !selection.isCollapsed
}
