import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { AnnotationSelectionMenuProps } from '@embedpdf/plugin-annotation/react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnnotationNoteEditor } from './annotation-note-editor'
import styles from './annotation-selection-menu.module.css'

/**
 * What a reader can do to a mark they have selected: write on it, or remove it.
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
 * there is never a question of which mark it would remove, or which one is being
 * written about. EmbedPDF positions this for us and counter-rotates it, which is
 * why the wrapper's props are spread rather than reimplemented.
 *
 * **The note is written here rather than in the sidebar's list** (decided
 * 2026-08-17). The list is where notes are *read*; a second editor over there
 * would be a second no-clobber guard and two ways to reach one outcome.
 *
 * It renders for every annotation on the page, selected or not, so the first
 * thing it does is decline to draw for the ones that are not.
 */

interface AnnotationSelectionMenuControlProps
  extends AnnotationSelectionMenuProps {
  /** Removes the selected mark: from the engine, and by sync from the row. */
  onDelete: (pageIndex: number, annotationId: string) => void
  /**
   * Writes the reader's comment onto the mark. Empty clears it — emptying the
   * field is how a note is removed, there being no separate control for it.
   */
  onSaveNote: (pageIndex: number, annotationId: string, note: string) => void
}

export function AnnotationSelectionMenu({
  selected,
  menuWrapperProps,
  context,
  onDelete,
  onSaveNote,
}: AnnotationSelectionMenuControlProps) {
  /*
   * Before the early return, because hooks must be. It is also why deselecting
   * has to close the editor explicitly: this component stays mounted for every
   * annotation on the page and merely stops drawing, so the state would
   * otherwise be waiting, open, the next time this mark was picked up.
   */
  const [writing, setWriting] = useState(false)
  useEffect(() => {
    if (!selected) {
      setWriting(false)
    }
  }, [selected])

  // `structurallyLocked` covers a PDF's own read-only or hidden annotations.
  // Nothing this reader creates is locked, but a mark the file arrived with can
  // be, and offering to delete what the engine will refuse to touch is a lie.
  if (!selected || context.structurallyLocked) {
    return null
  }

  const annotation = context.annotation.object
  const annotationId = annotation.id

  /*
   * A text box already has an editor, and it is the engine's.
   *
   * Its `contents` *is* what the box says on the page, edited in place by
   * double-clicking it. Offering this menu's note on one would be two editors
   * over a single field — the arrangement declined for the sidebar, and worse
   * here because the two would be inches apart. Every other mark, the sticky
   * note included, has no other way to carry words.
   */
  const canWrite =
    !context.contentLocked && annotation.type !== PdfAnnotationSubtype.FREETEXT

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
        <div className={styles.buttons}>
          {canWrite ? (
            <button
              type="button"
              className={styles.button}
              // Icon-only, so the name is the whole of what a screen reader
              // gets — and it names the state, because the control toggles.
              aria-label={writing ? 'close note' : 'write a note'}
              aria-expanded={writing}
              onClick={() => setWriting((open) => !open)}
            >
              <MessageSquare className={styles.icon} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.button} ${styles.destructive}`}
            // Icon-only, so the name is the whole of what a screen reader gets.
            aria-label="delete annotation"
            onClick={() => onDelete(context.pageIndex, annotationId)}
          >
            <Trash2 className={styles.icon} aria-hidden="true" />
          </button>
        </div>
        {writing ? (
          /*
           * Keyed by the mark, which is what makes "a different mark is a
           * different field" true by construction rather than by a reset the
           * editor would have to remember — and what makes its unmount flush
           * write the previous mark's text to the previous mark.
           */
          <AnnotationNoteEditor
            key={annotationId}
            contents={annotation.contents ?? null}
            onSave={(note) => onSaveNote(context.pageIndex, annotationId, note)}
          />
        ) : null}
      </div>
    </div>
  )
}
