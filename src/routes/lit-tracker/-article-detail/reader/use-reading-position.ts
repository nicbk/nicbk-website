import type {
  LayoutReadyEvent,
  ScrollEvent,
  ScrollToPageOptions,
} from '@embedpdf/plugin-scroll'
import { useEffect, useRef } from 'react'
import type { ReadingPosition } from './reading-position'
import {
  hasMoved,
  positionFromMetrics,
  restorablePosition,
} from './reading-position'

/**
 * The most often a reading position is written while the reader scrolls.
 *
 * The notes field's second, for the notes field's reason
 * (`use-synced-text.ts`): short enough that leaving straight after scrolling
 * still saves — and leaving flushes anyway — and long enough that reading a
 * paper is a write a second rather than one per frame.
 */
export const READING_POSITION_SAVE_MS = 1000

type Unsubscribe = () => void

/**
 * The part of EmbedPDF's scroll capability this needs — named narrowly so the
 * hook can be driven by hand in a test, without an engine.
 */
export interface ReadingPositionScroll {
  onLayoutReady: (listener: (event: LayoutReadyEvent) => void) => Unsubscribe
  onScroll: (listener: (event: ScrollEvent) => void) => Unsubscribe
  forDocument: (documentId: string) => {
    scrollToPage: (options: ScrollToPageOptions) => void
  }
}

interface UseReadingPositionOptions {
  documentId: string
  scroll: ReadingPositionScroll | null
  /** EmbedPDF's viewport padding, in pixels. See `positionFromMetrics`. */
  viewportGap: number
  /** Where this paper was left, as stored when the reader opened. */
  saved: ReadingPosition | null
  save: (position: ReadingPosition) => void
}

/**
 * Opens the paper where it was left, and remembers where it is left now
 * (features/a-paper-opens-where-you-left-it).
 *
 * **Restored once, on the first layout.** EmbedPDF's `onLayoutReady` with
 * `isInitial` is the moment the pages are laid out at their FitWidth zoom and
 * nothing will move them again; a scroll there holds. It is instant, so the
 * paper opens at the place rather than travelling to it.
 *
 * **Nothing is saved before that.** Laying out scrolls the reader to the top of
 * page 1 and reports it, before layout-ready — saved, it would overwrite the
 * position about to be restored on every open.
 *
 * **`saved` is read once.** A reader is never moved by a position arriving
 * from another window mid-sentence (decided with the user); the value it
 * opened with is the only one it looks at. Its own writes come back through
 * sync too, and are ignored for the same reason.
 *
 * **Saved at most once a second while scrolling, and on the way out**:
 * `pagehide` and a hidden tab — the last events a phone reliably gives when a
 * reader switches apps — and unmount, for leaving within the app. Movement of
 * less than a line is not saved.
 */
export function useReadingPosition({
  documentId,
  scroll,
  viewportGap,
  saved,
  save,
}: UseReadingPositionOptions): void {
  const initial = useRef(saved)
  const saveRef = useRef(save)
  saveRef.current = save
  const gap = useRef(viewportGap)
  gap.current = viewportGap
  /**
   * Whether the restore has happened, and the position last written or
   * restored — what movement is measured from. Refs, not effect locals: the
   * initial layout-ready fires once per document, so an effect that re-ran (a
   * new capability, React's development double-run) must not forget it.
   */
  const restored = useRef(false)
  const written = useRef<ReadingPosition | null>(null)

  useEffect(() => {
    if (!scroll) {
      return
    }

    let pending: ReadingPosition | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    function flush() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      if (pending !== null) {
        written.current = pending
        saveRef.current(pending)
        pending = null
      }
    }

    const stopLayout = scroll.onLayoutReady((event) => {
      if (
        event.documentId !== documentId ||
        !event.isInitial ||
        restored.current
      ) {
        return
      }
      restored.current = true
      const target = restorablePosition(initial.current, event.totalPages)
      if (target === null) {
        written.current = { page: 1, offset: 0 }
        return
      }
      written.current = target
      scroll.forDocument(documentId).scrollToPage({
        pageNumber: target.page,
        pageCoordinates: { x: 0, y: target.offset },
        behavior: 'instant',
      })
    })

    const stopScroll = scroll.onScroll((event) => {
      if (event.documentId !== documentId || !restored.current) {
        return
      }
      const position = positionFromMetrics(
        event.metrics.pageVisibilityMetrics,
        gap.current,
      )
      if (position === null) {
        return
      }
      pending = hasMoved(position, written.current) ? position : null
      if (pending !== null && timer === null) {
        timer = setTimeout(flush, READING_POSITION_SAVE_MS)
      }
    })

    function flushWhenHidden() {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flushWhenHidden)

    return () => {
      stopLayout()
      stopScroll()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flushWhenHidden)
      flush()
    }
  }, [scroll, documentId])
}
