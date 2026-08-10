import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './use-debounced-value'

/** The lag is the feature, so every assertion here is about timing. */

const DELAY = 500

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('reports the initial value straight away', () => {
    // Nothing has changed yet, so there is nothing to wait for — a first render
    // that had to wait out the delay would show the wrong thing for half a
    // second on every page load.
    vi.useFakeTimers()
    const { result } = renderHook(() => useDebouncedValue('first', DELAY))

    expect(result.current).toBe('first')
  })

  it('holds the old value until the new one has settled', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY),
      { initialProps: { value: 'first' } },
    )

    rerender({ value: 'second' })
    expect(result.current).toBe('first')

    act(() => {
      vi.advanceTimersByTime(DELAY)
    })
    expect(result.current).toBe('second')
  })

  it('reports only the last of a rapid run of changes', () => {
    /*
     * The whole point, and the reason the Lit Tracker's result count uses this:
     * a `role="status"` region fed the live count announces once per keystroke
     * while the reader is still typing. This turns "9 articles, 4 articles, 2
     * articles" into "2 articles", said once, after they stop.
     */
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY),
      { initialProps: { value: 0 } },
    )

    for (const value of [1, 2, 3]) {
      rerender({ value })
      act(() => {
        vi.advanceTimersByTime(DELAY - 100)
      })
      // Each change restarts the wait, so none of the intermediate values is
      // ever reported.
      expect(result.current).toBe(0)
    }

    act(() => {
      vi.advanceTimersByTime(DELAY)
    })
    expect(result.current).toBe(3)
  })

  it('drops a pending update when the value returns to what was reported', () => {
    // Typing a character and deleting it should not produce an announcement of
    // something that never changed.
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY),
      { initialProps: { value: 'first' } },
    )

    rerender({ value: 'second' })
    rerender({ value: 'first' })
    act(() => {
      vi.advanceTimersByTime(DELAY)
    })

    expect(result.current).toBe('first')
  })
})
