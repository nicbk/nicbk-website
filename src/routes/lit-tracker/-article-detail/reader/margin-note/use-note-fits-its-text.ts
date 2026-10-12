import type { PdfDocumentObject } from '@embedpdf/models'
import type { AnnotationScope } from '@embedpdf/plugin-annotation'
import { useEffect } from 'react'
import { READER_PAGE_ATTRIBUTE } from '../note-editing/note-being-edited'
import { isMarginNote } from './margin-note'
import type { Measured } from './note-height'
import { fittedHeight } from './note-height'
import { movePatches, pageContents } from './page-contents'
import { packColumn } from './placement'

/**
 * Sizes a margin note to its text when editing ends, and lets the margin make
 * room (features/a-passage-gets-a-margin-note, task 2).
 *
 * **Two halves of one moment, in an order the DOM fixes.** The engine saves a
 * note's text from its editor's React `onBlur`; this measures the editor from a
 * `focusout` listener on the window in the *capture* phase. Capture runs before
 * the bubbling phase React listens in — that is the DOM's event model, not the
 * order things mounted — so the measurement is always taken first, and the
 * engine's `update` event that follows, synchronously, inside the same dispatch,
 * is matched to it. The engine's editor carries no id to look it up by
 * afterwards; this is how a measurement of *that* editor reaches *that* note.
 *
 * **Then the margin is packed again** with the note at its new height
 * (`placement.ts`'s `packColumn`), and the note and any neighbours it pushes are
 * written as one batch. If no arrangement fits, the note grows anyway and its
 * neighbours stay put: the reader's words are never hidden, which matters more
 * than a margin that does not overlap (decided at spec time, open to revision).
 */
export function useNoteFitsItsText(
  scope: AnnotationScope | null,
  document: PdfDocumentObject | null,
): void {
  useEffect(() => {
    if (!scope || !document) {
      return
    }

    /** The editor that just lost focus, measured — for this dispatch only. */
    let measured: (Measured & { pageIndex: number }) | null = null

    function onFocusOut(event: FocusEvent) {
      const editor = event.target
      if (!(editor instanceof HTMLElement) || !editor.isContentEditable) {
        return
      }
      const page = editor.closest(`[${READER_PAGE_ATTRIBUTE}]`)
      const pageIndex = Number(page?.getAttribute(READER_PAGE_ATTRIBUTE))
      if (!Number.isInteger(pageIndex)) {
        return
      }
      // The text's own height, not the box's: a range around the contents is
      // laid out at the note's width whether or not the box clips it.
      const range = window.document.createRange()
      range.selectNodeContents(editor)
      measured = {
        pageIndex,
        textHeight: range.getBoundingClientRect().height,
        boxWidth: editor.getBoundingClientRect().width,
      }
      // Good for the save this blur causes, which arrives in this same task,
      // and for nothing after it. A *task*, not a microtask: the browser drains
      // microtasks between one listener and the next, so a microtask would clear
      // this before React's own focusout listener — and the save — ever ran
      // (found in the browser, 2026-10-12).
      setTimeout(() => {
        measured = null
      }, 0)
    }

    const unsubscribe = scope.onAnnotationEvent((event) => {
      if (
        event.type !== 'update' ||
        event.committed ||
        !isMarginNote(event.annotation) ||
        measured === null ||
        measured.pageIndex !== event.pageIndex
      ) {
        return
      }
      const contents = event.patch.contents
      if (typeof contents !== 'string' || contents.trim() === '') {
        // Not a save, or an empty one — which `use-empty-note-removal.ts` takes.
        return
      }

      const note = event.annotation
      const fontSize =
        'fontSize' in note && typeof note.fontSize === 'number'
          ? note.fontSize
          : 8
      const height = fittedHeight(measured, note.rect.size.width, fontSize)
      measured = null
      if (Math.abs(height - note.rect.size.height) < 1) {
        return
      }

      const page = document.pages[event.pageIndex]
      if (!page) {
        return
      }
      const { obstacles, notes } = pageContents(
        scope.getState(),
        event.pageIndex,
      )
      const resized = { id: note.id, height }
      const moves =
        packColumn({
          column: {
            left: note.rect.origin.x,
            right: note.rect.origin.x + note.rect.size.width,
          },
          page: page.size,
          obstacles,
          notes,
          resized,
        }) ?? new Map()

      const patches = movePatches(event.pageIndex, notes, moves, resized)
      // After the engine has finished the save that is still in flight.
      queueMicrotask(() => scope.updateAnnotations(patches))
    })

    window.addEventListener('focusout', onFocusOut, true)
    return () => {
      window.removeEventListener('focusout', onFocusOut, true)
      unsubscribe()
    }
  }, [scope, document])
}
