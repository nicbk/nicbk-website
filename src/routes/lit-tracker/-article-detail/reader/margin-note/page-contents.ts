import type { Rect } from '@embedpdf/models'
import type { AnnotationDocumentState } from '@embedpdf/plugin-annotation'
import { isMarginNote } from './margin-note'
import type { Moves, PlacedNote } from './placement'

/**
 * What is on a page, as margin-note placement sees it: margin notes, which may
 * move, and everything else, which may not (features/a-passage-gets-a-margin-note).
 *
 * Read from the engine's own state, in one place, so the two callers that pack a
 * margin — making a note, and a note growing to fit its text — agree about what
 * counts as an obstacle.
 */
export interface PageContents {
  /** Every annotation that is not a margin note: marks, text boxes, links. */
  obstacles: Rect[]
  /** The margin notes, each with the top of the passage it answers. */
  notes: PlacedNote[]
}

export function pageContents(
  state: Pick<AnnotationDocumentState, 'pages' | 'byUid'>,
  pageIndex: number,
): PageContents {
  const live = (state.pages[pageIndex] ?? []).flatMap((uid) => {
    const tracked = state.byUid[uid]
    return tracked && tracked.commitState !== 'deleted' ? [tracked.object] : []
  })

  const obstacles: Rect[] = []
  const notes: PlacedNote[] = []
  for (const annotation of live) {
    if (!isMarginNote(annotation)) {
      obstacles.push(annotation.rect)
      continue
    }
    // Anchored to its highlight's top. A note whose highlight is not on this
    // page (or not loaded) is anchored where it stands, so it can still make
    // room without wandering.
    const highlight = annotation.inReplyToId
      ? state.byUid[annotation.inReplyToId]?.object
      : undefined
    notes.push({
      id: annotation.id,
      rect: annotation.rect,
      anchor:
        highlight && highlight.pageIndex === pageIndex
          ? highlight.rect.origin.y
          : annotation.rect.origin.y,
    })
  }
  return { obstacles, notes }
}

/**
 * The moves as one batch of rectangle patches — one write, so the sync stores
 * them together and a reload never shows a margin half rearranged.
 */
export function movePatches(
  pageIndex: number,
  notes: readonly PlacedNote[],
  moves: Moves,
  resized?: { id: string; height: number },
): { pageIndex: number; id: string; patch: { rect: Rect } }[] {
  const patches: { pageIndex: number; id: string; patch: { rect: Rect } }[] = []
  for (const note of notes) {
    const top = moves.get(note.id)
    const height = note.id === resized?.id ? resized.height : undefined
    if (top === undefined && height === undefined) {
      continue
    }
    patches.push({
      pageIndex,
      id: note.id,
      patch: {
        rect: {
          origin: { x: note.rect.origin.x, y: top ?? note.rect.origin.y },
          size: {
            width: note.rect.size.width,
            height: height ?? note.rect.size.height,
          },
        },
      },
    })
  }
  return patches
}
