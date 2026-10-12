import type { PdfDocumentObject, PdfEngine } from '@embedpdf/models'
import { uuidV4 } from '@embedpdf/models'
import type {
  AnnotationCapability,
  AnnotationScope,
} from '@embedpdf/plugin-annotation'
import type { SelectionCapability } from '@embedpdf/plugin-selection'
import { useCallback, useEffect, useRef, useState } from 'react'
import { markSelection } from '../selection-finish/mark-selection'
import { CONFIRMATION_MS } from '../use-selection-copy'
import { createMarginNote } from './create-margin-note'
import { textBlockOf } from './margin'
import { marginNoteFrom } from './margin-note'
import { movePatches, pageContents } from './page-contents'
import type { Refusal } from './placement'
import { placeMarginNote } from './placement'

/**
 * *margin note* on a selected passage: highlight it, and open a text box beside it in
 * the margin (features/a-passage-gets-a-margin-note).
 *
 * **Decide first, then make.** The margin is measured and every annotation on
 * the page consulted — margin notes as things that may move, everything else as
 * things that may not — before anything is created, so a refusal leaves the paper
 * as it was — never a highlight whose note could not be placed. Only then is the
 * passage highlighted, through the same path the menu's highlight button takes
 * (`selection-finish/mark-selection.ts`), and only once the highlight exists is
 * the note made to answer it.
 *
 * **One passage, one note.** A selection that runs onto a second page is
 * highlighted on both, as any highlight is; the note answers the first, which is
 * where the passage begins.
 */

/** What *margin note* last reported: nothing, or why it could not write. */
export type NoteState = 'idle' | Refusal

/** The text tool whose mark a margin note answers. */
const HIGHLIGHT_TOOL_ID = 'highlight'
/** The text box tool, already sized for a margin by #24. */
const TEXT_BOX_TOOL_ID = 'freeText'

interface UseMarginNote {
  documentId: string
  engine: PdfEngine | null
  document: PdfDocumentObject | null
  selection: SelectionCapability | null
  /** For the tools' resolved defaults. */
  annotations: AnnotationCapability | null
  /** Where the marks go, for this document. */
  scope: AnnotationScope | null
  /** The plugin itself, for creating a note open for typing. */
  plugin: unknown
}

export function useMarginNote({
  documentId,
  engine,
  document,
  selection,
  annotations,
  scope,
  plugin,
}: UseMarginNote): { state: NoteState; writeNote: () => void } {
  const [state, setState] = useState<NoteState>('idle')

  // The refusal stays on the button as long as *copied* stays on *copy*, and
  // for the same reason: long enough to read, short enough not to linger.
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const report = useCallback((reason: Refusal) => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current)
    }
    setState(reason)
    resetTimer.current = setTimeout(() => setState('idle'), CONFIRMATION_MS)
  }, [])
  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current)
      }
    },
    [],
  )

  const writeNote = useCallback(() => {
    const highlight = annotations?.getTool(HIGHLIGHT_TOOL_ID)
    const textBox = annotations?.getTool(TEXT_BOX_TOOL_ID)
    if (
      !engine ||
      !document ||
      !selection ||
      !scope ||
      !highlight ||
      !textBox
    ) {
      return
    }
    const passage = selection.getFormattedSelection(documentId)[0]
    const page = passage ? document.pages[passage.pageIndex] : undefined
    if (!passage || !page) {
      return
    }

    engine.getPageTextRuns(document, page).wait(
      ({ runs }) => {
        const block = textBlockOf(runs)
        if (!block) {
          // A page with no text to measure has no margin to find. The passage
          // was selected, so this should not happen; if it does, the honest
          // answer is that there is nowhere to put the note.
          report('no-room')
          return
        }

        const { obstacles, notes } = pageContents(
          scope.getState(),
          passage.pageIndex,
        )
        const placement = placeMarginNote({
          page: page.size,
          block,
          passage: passage.rect,
          obstacles,
          notes,
        })
        if (!placement.placed) {
          report(placement.reason)
          return
        }

        markSelection({
          selection,
          tools: scope,
          tool: highlight,
          documentId,
          onMarked: (marks) => {
            const answered = marks.find(
              (mark) => mark.pageIndex === passage.pageIndex,
            )
            if (!answered) {
              return
            }
            const note = marginNoteFrom({
              defaults: textBox.defaults as Parameters<
                typeof marginNoteFrom
              >[0]['defaults'],
              id: uuidV4(),
              pageIndex: passage.pageIndex,
              rect: placement.rect,
              highlightId: answered.annotation.id,
              created: new Date(),
            })
            // Neighbours first, so the note never lands on one still in its way.
            const patches = movePatches(
              passage.pageIndex,
              notes,
              placement.moves,
            )
            if (patches.length > 0) {
              scope.updateAnnotations(patches)
            }
            createMarginNote({ plugin, scope, documentId, note })
            // Selected, as a text box placed by a click is: its menu is how it
            // is deleted, and it is the mark the reader is now working on.
            scope.selectAnnotation(note.pageIndex, note.id)
          },
        })
      },
      () => report('no-room'),
    )
  }, [
    annotations,
    engine,
    document,
    selection,
    scope,
    plugin,
    documentId,
    report,
  ])

  return { state, writeNote }
}
