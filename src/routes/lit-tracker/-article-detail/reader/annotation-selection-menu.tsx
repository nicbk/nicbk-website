import type { AnnotationSelectionMenuProps } from '@embedpdf/plugin-annotation/react'
import { Trash2 } from 'lucide-react'
import styles from './annotation-selection-menu.module.css'

/**
 * What a reader can do to a mark they have selected. Today: remove it.
 *
 * **A mark has to be removable, and until this existed none was.** Every other
 * half of deletion was already built — the mutator refuses another account's
 * annotation, the bridge turns the engine's delete into a write, the row
 * cascades with its article — and none of it could be reached, because nothing
 * on screen deleted anything. A stored mark you cannot get rid of is worse than
 * one you cannot make.
 *
 * **Anchored to the mark rather than parked in the toolbar.** The bar at the top
 * is about the document — pages, zoom, which tool is live — and stays identical
 * whatever is selected. A control that acts on *this* mark belongs beside it, so
 * there is never a question of which mark it would remove. EmbedPDF positions
 * this for us and counter-rotates it, which is why the wrapper's props are
 * spread rather than reimplemented.
 *
 * It renders for every annotation on the page, selected or not, so the first
 * thing it does is decline to draw for the ones that are not.
 */

interface AnnotationSelectionMenuControlProps
  extends AnnotationSelectionMenuProps {
  /** Removes the selected mark: from the engine, and by sync from the row. */
  onDelete: (pageIndex: number, annotationId: string) => void
}

export function AnnotationSelectionMenu({
  selected,
  menuWrapperProps,
  context,
  onDelete,
}: AnnotationSelectionMenuControlProps) {
  // `structurallyLocked` covers a PDF's own read-only or hidden annotations.
  // Nothing this reader creates is locked, but a mark the file arrived with can
  // be, and offering to delete what the engine will refuse to touch is a lie.
  if (!selected || context.structurallyLocked) {
    return null
  }

  const annotationId = context.annotation.object.id

  return (
    <div {...menuWrapperProps}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: not an interaction — this stops one, keeping the page from acting on a press meant for the button inside. The button is the control and carries its own semantics. */}
      <div
        className={styles.menu}
        /*
         * The press must not reach the page.
         *
         * This menu floats inside the page's own pointer provider, so without
         * this the `pointerdown` travels on to the document, which deselects the
         * mark — unmounting this menu before the click it started ever lands.
         * The control highlighted under the cursor and did nothing at all;
         * found in the browser, and it would have behaved the same way under a
         * real hand.
         */
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.button}
          // Icon-only, so the name is the whole of what a screen reader gets.
          aria-label="delete annotation"
          onClick={() => onDelete(context.pageIndex, annotationId)}
        >
          <Trash2 className={styles.icon} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
