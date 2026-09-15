import type {
  LayoutReadyEvent,
  PageVisibilityMetrics,
  ScrollEvent,
} from '@embedpdf/plugin-scroll'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadingPosition } from './reading-position'
import type { ReadingPositionScroll } from './use-reading-position'
import {
  READING_POSITION_SAVE_MS,
  useReadingPosition,
} from './use-reading-position'

/**
 * Restoring and saving, driven by hand: the scroller's two events are fired
 * directly, so what is asserted is the order of things — no write before the
 * restore, one restore, and when a write goes out.
 */

const DOC = 'article-1'
const GAP = 10
const SCALE = 2

function fakeScroll() {
  const layout = new Set<(event: LayoutReadyEvent) => void>()
  const scrolls = new Set<(event: ScrollEvent) => void>()
  const scrollToPage = vi.fn()
  const scroll: ReadingPositionScroll = {
    onLayoutReady: (listener) => {
      layout.add(listener)
      return () => layout.delete(listener)
    },
    onScroll: (listener) => {
      scrolls.add(listener)
      return () => scrolls.delete(listener)
    },
    forDocument: () => ({ scrollToPage }),
  }
  return {
    scroll,
    scrollToPage,
    layoutReady(isInitial = true, totalPages = 15, documentId = DOC) {
      for (const listener of layout) {
        listener({ documentId, isInitial, totalPages, pageNumber: 1 })
      }
    },
    /** The reader's top at `offset` real points down `page`. */
    scrollTo(page: number, offset: number, documentId = DOC) {
      const metrics = {
        pageNumber: page,
        viewportY: 0,
        original: { pageY: offset + GAP / SCALE },
        scaled: { scale: SCALE },
      } as PageVisibilityMetrics
      for (const listener of scrolls) {
        listener({
          documentId,
          metrics: { pageVisibilityMetrics: [metrics] },
        } as ScrollEvent)
      }
    },
  }
}

function mount(saved: ReadingPosition | null = null) {
  const fake = fakeScroll()
  const save = vi.fn()
  const hook = renderHook(
    ({
      saved: current,
      paused,
    }: {
      saved: ReadingPosition | null
      paused?: boolean
    }) =>
      useReadingPosition({
        documentId: DOC,
        scroll: fake.scroll,
        viewportGap: GAP,
        saved: current,
        save,
        paused,
      }),
    {
      initialProps: { saved } as {
        saved: ReadingPosition | null
        paused?: boolean
      },
    },
  )
  return { ...fake, save, hook }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('restoring', () => {
  it('opens at the saved position, instantly, on the first layout', () => {
    const { layoutReady, scrollToPage } = mount({ page: 9, offset: 400 })

    layoutReady()

    expect(scrollToPage).toHaveBeenCalledExactlyOnceWith({
      pageNumber: 9,
      pageCoordinates: { x: 0, y: 400 },
      behavior: 'instant',
    })
  })

  it('restores only on the initial layout, and only once', () => {
    const { layoutReady, scrollToPage } = mount({ page: 9, offset: 400 })

    layoutReady(false)
    expect(scrollToPage).not.toHaveBeenCalled()

    layoutReady()
    layoutReady()
    expect(scrollToPage).toHaveBeenCalledOnce()
  })

  it('ignores another document’s layout', () => {
    const { layoutReady, scrollToPage } = mount({ page: 9, offset: 400 })

    layoutReady(true, 15, 'another')

    expect(scrollToPage).not.toHaveBeenCalled()
  })

  it('opens at the top when the saved page is past the end of the paper', () => {
    const { layoutReady, scrollToPage } = mount({ page: 40, offset: 0 })

    layoutReady(true, 15)

    expect(scrollToPage).not.toHaveBeenCalled()
  })

  it('is not moved by a position synced in while open', () => {
    const { layoutReady, scrollToPage, hook } = mount(null)

    hook.rerender({ saved: { page: 12, offset: 50 } })
    layoutReady()

    expect(scrollToPage).not.toHaveBeenCalled()
  })
})

describe('saving', () => {
  it('writes nothing before the restore', () => {
    // Laying out scrolls to the top of page 1 and says so. Saved, it would
    // overwrite the position about to be restored.
    const { scrollTo, save } = mount({ page: 9, offset: 400 })

    scrollTo(1, 0)
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS * 2))

    expect(save).not.toHaveBeenCalled()
  })

  it('saves where the reader is, a second after moving', () => {
    const { layoutReady, scrollTo, save } = mount(null)
    layoutReady()

    scrollTo(3, 120)
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS - 1))
    expect(save).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(save).toHaveBeenCalledExactlyOnceWith({ page: 3, offset: 120 })
  })

  it('saves at most once a second while scrolling, the latest position', () => {
    const { layoutReady, scrollTo, save } = mount(null)
    layoutReady()

    for (let step = 1; step <= 10; step += 1) {
      scrollTo(2, step * 20)
      act(() => vi.advanceTimersByTime(200))
    }

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith({ page: 2, offset: 200 })
  })

  it('does not save the restore itself, or less than a line from it', () => {
    const { layoutReady, scrollTo, save } = mount({ page: 9, offset: 400 })
    layoutReady()

    scrollTo(9, 400)
    scrollTo(9, 405)
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS * 2))

    expect(save).not.toHaveBeenCalled()
  })

  it('saves at once when the page is hidden', () => {
    const { layoutReady, scrollTo, save } = mount(null)
    layoutReady()
    scrollTo(6, 300)

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(save).toHaveBeenCalledExactlyOnceWith({ page: 6, offset: 300 })
    vi.restoreAllMocks()
  })

  it('saves at once on pagehide', () => {
    const { layoutReady, scrollTo, save } = mount(null)
    layoutReady()
    scrollTo(6, 300)

    window.dispatchEvent(new Event('pagehide'))

    expect(save).toHaveBeenCalledExactlyOnceWith({ page: 6, offset: 300 })
  })

  it('saves at once when the reader closes, and not again after', () => {
    const { layoutReady, scrollTo, save, hook } = mount(null)
    layoutReady()
    scrollTo(6, 300)

    hook.unmount()
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS * 2))

    expect(save).toHaveBeenCalledExactlyOnceWith({ page: 6, offset: 300 })
  })

  it('ignores another document’s scrolling', () => {
    const { layoutReady, scrollTo, save } = mount(null)
    layoutReady()

    scrollTo(6, 300, 'another')
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS * 2))

    expect(save).not.toHaveBeenCalled()
  })
})

describe('while hidden behind the citations view', () => {
  it('ignores scrolling reported while hidden', () => {
    // A hidden panel has no layout, so whatever it reports is not where the
    // paper was left — and must not overwrite where it was.
    const { layoutReady, scrollTo, save, hook } = mount({
      page: 7,
      offset: 400,
    })
    layoutReady()

    hook.rerender({ saved: { page: 7, offset: 400 }, paused: true })
    scrollTo(1, 0)
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS * 2))

    expect(save).not.toHaveBeenCalled()
  })

  it('still writes a position that was waiting when the reader was hidden', () => {
    const { layoutReady, scrollTo, save, hook } = mount(null)
    layoutReady()
    scrollTo(4, 200)

    hook.rerender({ saved: null, paused: true })
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS))

    expect(save).toHaveBeenCalledExactlyOnceWith({ page: 4, offset: 200 })
  })

  it('saves again once shown, without restoring a second time', () => {
    const { layoutReady, scrollTo, save, scrollToPage, hook } = mount({
      page: 7,
      offset: 400,
    })
    layoutReady()
    hook.rerender({ saved: { page: 7, offset: 400 }, paused: true })
    hook.rerender({ saved: { page: 7, offset: 400 }, paused: false })

    // Back at the same place: nothing to write.
    scrollTo(7, 400)
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS))
    expect(save).not.toHaveBeenCalled()

    scrollTo(8, 50)
    act(() => vi.advanceTimersByTime(READING_POSITION_SAVE_MS))
    expect(save).toHaveBeenCalledExactlyOnceWith({ page: 8, offset: 50 })
    expect(scrollToPage).toHaveBeenCalledTimes(1)
  })
})
