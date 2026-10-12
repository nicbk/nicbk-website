import type { AnnotationScope } from '@embedpdf/plugin-annotation'
import { useEffect } from 'react'
import { isMarginNote } from './margin-note'

/**
 * Removes a margin note that was left empty
 * (features/a-passage-gets-a-margin-note).
 *
 * *margin note* opens a box for typing; a reader who presses it and then thinks better
 * of it should not be left with an empty box in the margin, which is clutter
 * with nothing to say. The highlight it answered stays — it is a highlight in
 * its own right.
 *
 * **Keyed on the engine's own save.** The text box writes what was typed into
 * `contents` when its editor loses focus, and at no other time (#27's research).
 * So an update to a margin note whose new `contents` is blank is precisely "the
 * reader stopped writing and had written nothing". A text box placed by hand is
 * not a margin note, and keeps its behaviour.
 */
export function useEmptyNoteRemoval(scope: AnnotationScope | null): void {
  useEffect(() => {
    if (!scope) {
      return
    }
    return scope.onAnnotationEvent((event) => {
      if (
        event.type !== 'update' ||
        event.committed ||
        !isMarginNote(event.annotation)
      ) {
        return
      }
      const contents = event.patch.contents
      if (typeof contents === 'string' && contents.trim() === '') {
        scope.deleteAnnotation(event.pageIndex, event.annotation.id)
      }
    })
  }, [scope])
}
