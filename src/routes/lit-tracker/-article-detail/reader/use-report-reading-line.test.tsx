import type { ScrollMetrics } from '@embedpdf/plugin-scroll'
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReadingLine } from '../reader-jump'
import { ReaderJumpProvider, useReadingLine } from '../reader-jump'
import { useReportReadingLine } from './use-report-reading-line'

/**
 * The reader's report of where it is, through the real channel to a list
 * reading it. The geometry is `reading-line.test.ts`'s; here, when the line is
 * reported and when it is withdrawn.
 */

function metrics(pageY: number): ScrollMetrics {
  return {
    pageVisibilityMetrics: [
      {
        pageNumber: 2,
        viewportX: 0,
        viewportY: 0,
        visiblePercentage: 100,
        original: {
          pageX: 0,
          pageY,
          visibleWidth: 612,
          visibleHeight: 400,
          scale: 1,
        },
        scaled: {
          pageX: 0,
          pageY,
          visibleWidth: 612,
          visibleHeight: 400,
          scale: 1,
        },
      },
    ],
  } as unknown as ScrollMetrics
}

function setup(paused = false) {
  let listener: ((m: ScrollMetrics) => void) | null = null
  const stop = vi.fn()
  const scroll = {
    getMetrics: vi.fn(() => metrics(100)),
    onScroll: vi.fn((fn: (m: ScrollMetrics) => void) => {
      listener = fn
      return stop
    }),
  }
  const viewport = {
    getMetrics: () => ({ clientHeight: 800 }),
  }
  const seen: (ReadingLine | null)[] = []

  function Reader({ paused }: { paused: boolean }) {
    useReportReadingLine({
      scroll,
      viewport,
      viewportGap: 0,
      lastPage: { pageNumber: 30, height: 792 },
      paused,
    })
    return null
  }
  function List() {
    seen.push(useReadingLine((line) => line))
    return null
  }
  const view = render(
    <ReaderJumpProvider>
      <Reader paused={paused} />
      <List />
    </ReaderJumpProvider>,
  )
  const rerender = (next: boolean) =>
    view.rerender(
      <ReaderJumpProvider>
        <Reader paused={next} />
        <List />
      </ReaderJumpProvider>,
    )
  return {
    view,
    rerender,
    scroll: (pageY: number) => act(() => listener?.(metrics(pageY))),
    last: () => seen.at(-1),
    stop,
  }
}

describe('useReportReadingLine', () => {
  // A list opened on a reader nobody has scrolled yet still has a section to
  // mark. jsdom lays out no toolbar, so the line is 8px down: 8pt at scale 1.
  it('reports where the reader is as soon as it is showing', () => {
    const { last } = setup()
    expect(last()).toEqual({ pageIndex: 1, top: 108 })
  })

  it('reports again as the reader scrolls', () => {
    const { scroll, last } = setup()
    scroll(300)
    expect(last()).toEqual({ pageIndex: 1, top: 308 })
  })

  it('withdraws the line while the reader is hidden, and restores it after', () => {
    const { scroll, rerender, last } = setup()
    rerender(true)
    expect(last()).toBeNull()
    // A hidden reader's scrolls describe nothing.
    scroll(300)
    expect(last()).toBeNull()
    rerender(false)
    expect(last()).toEqual({ pageIndex: 1, top: 108 })
  })

  it('withdraws the line and stops listening when the reader goes', () => {
    const { view, stop } = setup()
    view.unmount()
    expect(stop).toHaveBeenCalled()
  })
})
