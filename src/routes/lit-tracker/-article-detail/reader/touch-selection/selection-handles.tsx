import type { Position } from '@embedpdf/models'
import { useEffect, useRef } from 'react'
import type { SelectionEnd } from './extend-selection'
import type { HandleAnchor, SelectionHandleAnchors } from './handle-anchors'
import styles from './selection-handles.module.css'

/**
 * The two grips that adjust a selection made by touch.
 *
 * **The shape is iOS's, and it was chosen for what it does not cover.** A bar
 * sits *between* two glyphs — a boundary is not a character — and the dot that
 * the thumb aims at hangs outside the line: above it at the start of the
 * selection, below it at the end. Every other arrangement puts something over
 * the first or last word, which is exactly the text the reader is trying to
 * judge.
 *
 * **The dot is small and its target is not.** The graphic is 12px because a
 * larger one would be a blob over the paper; the area that responds to a thumb
 * is 44×44, well past the 24×24 floor WCAG 2.2 AA sets. The two are different
 * things and only one of them is visible.
 *
 * Only for touch. A pointer drags a selection directly and has never needed
 * these, so they are not drawn for one — see `touch-selection.tsx` for how that
 * is decided.
 */

/** Marks a grip, and says which end of the selection it moves. */
export const SELECTION_HANDLE_ATTRIBUTE = 'data-selection-handle'

interface SelectionHandlesProps {
  anchors: SelectionHandleAnchors
  /** The document's zoom: page units to CSS pixels. */
  scale: number
  /**
   * A handle has been taken hold of, at this point in client coordinates.
   *
   * **The only thing a handle reports.** What the finger does afterwards belongs
   * to the document, not to this page — see `drag/use-selection-drag.ts`.
   */
  onGrab: (end: SelectionEnd, finger: Position, pointerId: number) => void
}

export function SelectionHandles({
  anchors,
  scale,
  onGrab,
}: SelectionHandlesProps) {
  return (
    <>
      {anchors.start && (
        <Handle
          end="start"
          anchor={anchors.start}
          scale={scale}
          onGrab={onGrab}
        />
      )}
      {anchors.end && (
        <Handle end="end" anchor={anchors.end} scale={scale} onGrab={onGrab} />
      )}
    </>
  )
}

interface HandleProps extends Omit<SelectionHandlesProps, 'anchors'> {
  end: SelectionEnd
  anchor: HandleAnchor
}

function Handle({ end, anchor, scale, onGrab }: HandleProps) {
  const grip = useRef<HTMLSpanElement>(null)

  /* Rebuilt every render, so the callback below always sees the current
     selection — the listeners themselves are attached once. */
  const latest = useRef({ onGrab })
  latest.current = { onGrab }

  useEffect(() => {
    const element = grip.current
    if (!element) {
      return
    }

    let held = false

    function takeHold(event: PointerEvent): void {
      /*
       * **Native, and stopped right here.** EmbedPDF's text handler clears the
       * selection on every pointer-down it sees, and it listens on an ancestor
       * of this element — so a press that reached it would take away the very
       * selection this handle belongs to, and the handle with it, before the
       * drag had begun. A React `onPointerDown` could not prevent that: React
       * listens at the root, so its handler runs *after* the ancestor's own
       * native listener has already been called.
       */
      event.stopPropagation()
      // Keeps the browser from claiming the gesture as a scroll or a drag of
      // its own. The element also declares `touch-action: none`, which is the
      // half of this that has to be said before the gesture begins.
      event.preventDefault()
      // Optional because it is a browser capability, not a guarantee: a
      // pointer that cannot be captured still drags, it just stops if the
      // finger leaves the element.
      element?.setPointerCapture?.(event.pointerId)
      held = true
      latest.current.onGrab(
        end,
        { x: event.clientX, y: event.clientY },
        event.pointerId,
      )
    }

    /**
     * Keeps the gesture off the page, and reports nothing.
     *
     * The whole drag stays off the page, not just its first event: with pointer
     * capture these moves are routed here, but they still *bubble* from here to
     * the page beneath — where the library's text handler would measure them
     * against whatever anchor it last took and start a drag selection of its
     * own, over the top of the one being adjusted.
     *
     * What the finger is *doing* is heard by `drag/use-selection-drag.ts`, at
     * the window, on the capture phase — which is to say before this, and
     * whether or not this element still exists.
     */
    function shield(event: PointerEvent): void {
      if (!held) {
        return
      }
      event.stopPropagation()
    }

    function letGo(event: PointerEvent): void {
      shield(event)
      held = false
    }

    // Capture routes the rest of the gesture back to this element, so a finger
    // that wanders off the handle — which it does immediately — keeps dragging
    // it rather than dropping it.
    element.addEventListener('pointerdown', takeHold)
    element.addEventListener('pointermove', shield)
    element.addEventListener('pointerup', letGo)
    element.addEventListener('pointercancel', letGo)

    return () => {
      element.removeEventListener('pointerdown', takeHold)
      element.removeEventListener('pointermove', shield)
      element.removeEventListener('pointerup', letGo)
      element.removeEventListener('pointercancel', letGo)
      /*
       * **Unmounting no longer ends the drag, and that is this task's whole
       * point.** A handle is unmounted the instant its boundary moves onto
       * another page, which used to end the very gesture that moved it. The
       * drag belongs to the document now, so a handle disappearing here means
       * only that some other page is drawing it.
       */
    }
  }, [end])

  return (
    <span
      className={`${styles.handle} ${end === 'start' ? styles.start : styles.end}`}
      style={{
        left: anchor.x * scale,
        top: anchor.top * scale,
        height: (anchor.bottom - anchor.top) * scale,
      }}
      // A touch affordance, and not the only way to do anything: a pointer
      // drags a selection directly and the copy control is reachable from the
      // keyboard. There is nothing here for assistive technology to operate.
      aria-hidden="true"
    >
      <span className={styles.bar} />
      {/*
       * The control itself, and the only part of a handle that responds to a
       * press. The attribute names which end it moves — the same approach
       * `blank-paper.ts` takes to the page image: something the DOM can be
       * asked about without knowing a stylesheet's hashed class names.
       */}
      <span
        ref={grip}
        className={styles.grip}
        {...{ [SELECTION_HANDLE_ATTRIBUTE]: end }}
      />
    </span>
  )
}
