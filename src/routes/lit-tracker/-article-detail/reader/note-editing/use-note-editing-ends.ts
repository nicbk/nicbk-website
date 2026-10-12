import { useCallback, useEffect, useRef, useState } from 'react'
import { noteBeingEdited, noteBeingEditedOn } from './note-being-edited'
import type { PressAway } from './press-ends-the-edit'
import { pressEndsTheEdit } from './press-ends-the-edit'

/**
 * Puts down the text box the reader was typing into, when they press somewhere
 * else (features/a-text-box-lets-go).
 *
 * **The defect.** EmbedPDF ends a text box's editing on one input only: a press
 * whose target *is* the page element. In this reader the paper image sits over
 * that element and answers every press on the page (`blank-paper.ts` depends on
 * it), so the condition is never met — and it is a per-page rule besides, so a
 * press on another page, between pages or on the sidebar could never meet it
 * either. The box stayed editable: a caret in it, typing still going into it,
 * and no way to drag it, because the engine will not move a box it is editing.
 * The only way out was to create a second box and delete it.
 *
 * **Why the page element is not handed back the press.** Letting presses fall
 * through the paper would revive the engine's whole handler, not only its
 * cleanup: it also deselects on a finger's *press*, which is the behaviour this
 * reader overrode so a scroll leaves a mark selected (`click-away.ts`), and it
 * would join the ordering this reader already has to hold against the live tool
 * (`click-away-guard.tsx`). It would still miss every press off the page.
 *
 * **Why a remount.** The editing state is private to the annotation layer, with
 * no method to end it (`note-being-edited.ts`). React's own way to reset a
 * component's private state is a new key, so each page's layer carries a
 * generation number and ending the edit increments it. Everything the layer
 * shows is re-read from the plugin as it mounts — the marks, which one is
 * selected — so the only thing a remount loses is the edit it was meant to end.
 *
 * **Why the text is blurred first.** The engine saves what was typed when the
 * editor loses focus, and at no other time. A mouse press elsewhere has usually
 * moved focus already, but a tap on a surface that cannot take focus need not,
 * and an editor unmounted while focused is never told — so it is blurred here,
 * deliberately, before it goes.
 *
 * **Why it waits for the press to finish.** The press that ends the edit may be
 * on something the same layer draws — the note's own delete control, which a
 * remount would replace before its click arrived. Ending the edit after the
 * click has been dispatched lets that press do what it was for first.
 *
 * This only ever *reads* pointer events, on the window, and never stops one: it
 * withholds nothing from any library, so it takes on no one's bookkeeping.
 */
export function useNoteEditingEnds(): {
  /** The key for page `pageIndex`'s annotation layer. */
  generationOf: (pageIndex: number) => number
  /** Ends the edit on whichever page holds one, now. */
  endNoteEditing: () => void
} {
  const [generations, setGenerations] = useState<Record<number, number>>({})

  const endOn = useCallback((pageIndex: number) => {
    const editor = noteBeingEditedOn(document, pageIndex)
    if (!editor) {
      // Already over — the press deleted the note, or chose another one.
      return
    }
    const focused = document.activeElement
    if (focused instanceof HTMLElement && editor.contains(focused)) {
      focused.blur()
    }
    setGenerations((current) => ({
      ...current,
      [pageIndex]: (current[pageIndex] ?? 0) + 1,
    }))
  }, [])

  const endNoteEditing = useCallback(() => {
    const note = noteBeingEdited(document)
    if (note) {
      endOn(note.pageIndex)
    }
  }, [endOn])

  /** The press in flight that began outside the note, and where it began. */
  const press = useRef<
    | (Pick<PressAway, 'kind' | 'from'> & { id: number; pageIndex: number })
    | null
  >(null)

  useEffect(() => {
    let pendingEnd: ReturnType<typeof setTimeout> | undefined

    function onPointerDown(event: PointerEvent) {
      const note = noteBeingEdited(document)
      if (
        !note ||
        (event.target instanceof Node && note.editor.contains(event.target))
      ) {
        press.current = null
        return
      }
      press.current = {
        id: event.pointerId,
        kind: event.pointerType,
        from: { x: event.clientX, y: event.clientY },
        pageIndex: note.pageIndex,
      }
    }

    function onPointerUp(event: PointerEvent) {
      const started = press.current
      if (!started || started.id !== event.pointerId) {
        return
      }
      press.current = null
      const ended = pressEndsTheEdit({
        kind: started.kind,
        from: started.from,
        to: { x: event.clientX, y: event.clientY },
      })
      if (ended) {
        // After the click this press is about to raise, not before it.
        pendingEnd = setTimeout(() => endOn(started.pageIndex), 0)
      }
    }

    // The browser took the press for a scroll: nothing was clicked.
    function onPointerCancel(event: PointerEvent) {
      if (press.current?.id === event.pointerId) {
        press.current = null
      }
    }

    // Capture, so a handler that stops a press on its way down cannot hide it
    // from this one. Read-only: nothing here calls `stopPropagation`.
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('pointercancel', onPointerCancel, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerCancel, true)
      clearTimeout(pendingEnd)
    }
  }, [endOn])

  const generationOf = useCallback(
    (pageIndex: number) => generations[pageIndex] ?? 0,
    [generations],
  )

  return { generationOf, endNoteEditing }
}
