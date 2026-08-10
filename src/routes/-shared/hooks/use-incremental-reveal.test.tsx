import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIncrementalReveal } from './use-incremental-reveal'

/**
 * The shared reveal hook, which both the blog list and the Lit Tracker's
 * collection page page with.
 *
 * Driven through a component rather than `renderHook`, because the thing under
 * test is a ref attached to real markup: the observer is only created if the
 * sentinel is in the DOM by the time effects run, which is what rendering it
 * conditionally — the way both consumers do — actually guarantees.
 *
 * jsdom has no `IntersectionObserver`, which is not an obstacle but the first
 * thing worth asserting: the hook must degrade to "show the first batch" rather
 * than throw, because that is also what happens during server rendering. A fake
 * one is installed for the tests that need to drive a reveal.
 */

/** Every observer built during a test, with the callback each was given. */
interface FakeObserver {
  callback: IntersectionObserverCallback
  disconnected: boolean
}

function installFakeObserver(): FakeObserver[] {
  const built: FakeObserver[] = []

  class Fake {
    disconnected = false

    constructor(public callback: IntersectionObserverCallback) {
      built.push(this as unknown as FakeObserver)
    }

    observe() {}

    disconnect() {
      this.disconnected = true
    }
  }

  vi.stubGlobal('IntersectionObserver', Fake)
  return built
}

/** Fires the most recently created observer, as a scroll into view would. */
function scrollSentinelIntoView(observers: FakeObserver[]) {
  const observer = observers[observers.length - 1]
  if (observer === undefined) {
    throw new Error('no observer was created')
  }
  act(() => {
    observer.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
}

const STEP = 10
const SENTINEL = 'sentinel'

/** A list of `total` numbered rows, revealed the way both real consumers do. */
function RevealedList({ total }: { total: number }) {
  const { visibleCount, sentinelRef } = useIncrementalReveal(total, STEP)
  const rows = Array.from({ length: total }, (_, index) => index)

  return (
    <>
      <ul>
        {rows.slice(0, visibleCount).map((row) => (
          <li key={row}>row {row}</li>
        ))}
      </ul>
      {visibleCount < total ? (
        <div ref={sentinelRef} data-testid={SENTINEL} />
      ) : null}
    </>
  )
}

/** How many rows are on screen. */
function visibleRows() {
  return screen.getAllByRole('listitem').length
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useIncrementalReveal', () => {
  it('shows the whole list when it fits in one batch, with no sentinel', () => {
    render(<RevealedList total={3} />)

    expect(visibleRows()).toBe(3)
    expect(screen.queryByTestId(SENTINEL)).toBeNull()
  })

  it('shows the first batch, and no more, without an IntersectionObserver', () => {
    // jsdom has none, and neither does the server renderer. The list is correct
    // without the reveal; the reveal is the enhancement on top of it.
    render(<RevealedList total={30} />)

    expect(visibleRows()).toBe(STEP)
  })

  it('reveals another batch each time the sentinel intersects', () => {
    const observers = installFakeObserver()
    render(<RevealedList total={25} />)

    expect(visibleRows()).toBe(10)
    scrollSentinelIntoView(observers)
    expect(visibleRows()).toBe(20)
    scrollSentinelIntoView(observers)
    // Clamped to what exists rather than overshooting to 30.
    expect(visibleRows()).toBe(25)
  })

  it('drops the sentinel once everything is shown, and stops observing', () => {
    const observers = installFakeObserver()
    render(<RevealedList total={12} />)

    scrollSentinelIntoView(observers)

    expect(visibleRows()).toBe(12)
    expect(screen.queryByTestId(SENTINEL)).toBeNull()
    expect(observers[observers.length - 1]?.disconnected).toBe(true)
  })

  it('never reveals past the end of a list that shrank', () => {
    const { rerender } = render(<RevealedList total={30} />)

    rerender(<RevealedList total={4} />)
    expect(visibleRows()).toBe(4)
  })

  it('goes back to a full batch when the list grows again', () => {
    /*
     * The case that made this hook count batches rather than items, found while
     * wiring it to a filtered collection: a page opened with a filter matching
     * one article and then cleared. Holding an absolute count, the hook would
     * have captured "show 1" at mount and left the reader looking at a single
     * card with the rest behind a sentinel — a list that had silently stopped
     * being a list.
     */
    const { rerender } = render(<RevealedList total={1} />)
    expect(visibleRows()).toBe(1)

    rerender(<RevealedList total={30} />)
    expect(visibleRows()).toBe(STEP)
  })

  it('keeps what the reader already revealed when the list narrows and widens', () => {
    // Scroll depth is theirs, not the filter's: someone a batch down who
    // searches and then clears should be back where they were, not at the top.
    const observers = installFakeObserver()
    const { rerender } = render(<RevealedList total={30} />)

    scrollSentinelIntoView(observers)
    expect(visibleRows()).toBe(20)

    rerender(<RevealedList total={3} />)
    expect(visibleRows()).toBe(3)

    rerender(<RevealedList total={30} />)
    expect(visibleRows()).toBe(20)
  })
})
