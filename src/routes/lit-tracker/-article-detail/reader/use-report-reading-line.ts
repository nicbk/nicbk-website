import type { ScrollMetrics } from '@embedpdf/plugin-scroll'
import { useEffect, useRef } from 'react'
import { useReadingLineReporter } from '../reader-jump'
import { jumpLanding } from './go-to'
import type { LastPage } from './reading-line'
import { lineFromMetrics, linePosition } from './reading-line'

type Unsubscribe = () => void

interface UseReportReadingLineOptions {
  /** This document's scroll scope, narrowed to what this reads. */
  scroll: {
    onScroll: (listener: (metrics: ScrollMetrics) => void) => Unsubscribe
    getMetrics: () => ScrollMetrics
  } | null
  /** The viewport's own measurements, read at each scroll for its height. */
  viewport: {
    getMetrics: () => { clientHeight: number }
  } | null
  /** The paper's last page, to know when its end is on screen. */
  lastPage: LastPage | null
  /** EmbedPDF's viewport padding, in pixels. See `lineFromMetrics`. */
  viewportGap: number
  /** True while the reader is hidden behind another view. */
  paused: boolean
}

/**
 * Tells the sidebar where the reader is reading, as it scrolls
 * (`reader-jump.tsx` carries it; `reading-line.ts` says which line counts).
 *
 * **Withdrawn while paused**, and on the way out: a hidden reader's scroll
 * metrics describe nothing (`use-reading-position.ts` measured why), and a list
 * still marking a section of a paper nobody can see would be marking a guess.
 * It reports again as soon as it returns, measured then rather than waiting
 * for the next scroll, so a list opened on a reader nobody has moved yet still
 * marks where it is.
 *
 * The pause is also read from a ref assigned during render, as the reading
 * position reads its own, so a scroll the hiding itself sets off — before the
 * effect below has re-run — is already ignored.
 */
export function useReportReadingLine({
  scroll,
  viewport,
  viewportGap,
  lastPage,
  paused,
}: UseReportReadingLineOptions): void {
  const report = useReadingLineReporter()
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const gap = useRef(viewportGap)
  gap.current = viewportGap
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  const lastPageRef = useRef(lastPage)
  lastPageRef.current = lastPage

  useEffect(() => {
    if (!scroll) {
      return
    }

    function measure(metrics: ScrollMetrics) {
      const measured = viewportRef.current?.getMetrics()
      if (pausedRef.current || !measured) {
        return
      }
      report(
        lineFromMetrics(
          metrics.pageVisibilityMetrics,
          linePosition(
            metrics.pageVisibilityMetrics,
            lastPageRef.current,
            measured.clientHeight,
            jumpLanding(),
          ),
          gap.current,
        ),
      )
    }

    if (paused) {
      report(null)
      return
    }
    measure(scroll.getMetrics())
    const stop = scroll.onScroll(measure)
    return () => {
      stop()
      report(null)
    }
  }, [scroll, paused, report])
}
