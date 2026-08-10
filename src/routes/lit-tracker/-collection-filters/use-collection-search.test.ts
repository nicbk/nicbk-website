import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The search text: instant locally, mirrored to the URL on a debounce.
 *
 * The router is stubbed for the same reason `use-collection-filters.test.ts`
 * stubs it — what is under test is the shape of the search object this hook
 * writes and *when* it writes it, and a real router would answer that through a
 * URL string, one layer further from the decision.
 */

const search = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useSearch: () => search.current,
    useNavigate: () => navigate,
  }),
}))

const { useCollectionSearch } = await import('./use-collection-search')

/** The hook's own debounce, which every timing assertion here steps over. */
const MIRROR_DEBOUNCE_MS = 250

beforeEach(() => {
  search.current = {}
  navigate.mockClear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** The search object the last navigation asked for, given the current URL. */
function navigatedSearch() {
  const call = navigate.mock.calls.at(-1)?.[0] as {
    search: (prev: Record<string, unknown>) => unknown
  }
  return call.search(search.current)
}

describe('useCollectionSearch', () => {
  it('reads the query out of the URL', () => {
    search.current = { q: 'attention' }

    const { result } = renderHook(() => useCollectionSearch())

    expect(result.current.query).toBe('attention')
  })

  it('normalizes an absent query to empty text', () => {
    const { result } = renderHook(() => useCollectionSearch())

    expect(result.current.query).toBe('')
  })

  it('updates the query immediately, before any navigation', () => {
    // The reason this hook holds local state at all: the grid filters from this
    // value, and a grid that waited for the router would stutter under the
    // reader's hands.
    const { result } = renderHook(() => useCollectionSearch())

    act(() => {
      result.current.setQuery('att')
    })

    expect(result.current.query).toBe('att')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('mirrors the settled query to the URL, replacing rather than pushing', () => {
    const { result } = renderHook(() => useCollectionSearch())

    act(() => {
      result.current.setQuery('attention')
    })
    act(() => {
      vi.advanceTimersByTime(MIRROR_DEBOUNCE_MS)
    })

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate.mock.calls[0]?.[0]).toMatchObject({ replace: true })
    expect(navigatedSearch()).toEqual({ q: 'attention' })
  })

  it('navigates once for a run of keystrokes, not once per character', () => {
    const { result } = renderHook(() => useCollectionSearch())

    for (const text of ['a', 'at', 'att']) {
      act(() => {
        result.current.setQuery(text)
      })
      act(() => {
        vi.advanceTimersByTime(MIRROR_DEBOUNCE_MS - 50)
      })
    }
    act(() => {
      vi.advanceTimersByTime(MIRROR_DEBOUNCE_MS)
    })

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigatedSearch()).toEqual({ q: 'att' })
  })

  it('leaves no key behind when the query is emptied', () => {
    // A cleared search must leave `/lit-tracker`, not `/lit-tracker?q=`.
    search.current = { q: 'attention' }
    const { result } = renderHook(() => useCollectionSearch())

    act(() => {
      result.current.setQuery('')
    })
    act(() => {
      vi.advanceTimersByTime(MIRROR_DEBOUNCE_MS)
    })

    expect(navigatedSearch()).toEqual({})
  })

  it('writes no key for a query that is only whitespace', () => {
    const { result } = renderHook(() => useCollectionSearch())

    act(() => {
      result.current.setQuery('   ')
    })
    act(() => {
      vi.advanceTimersByTime(MIRROR_DEBOUNCE_MS)
    })

    expect(navigatedSearch()).toEqual({})
  })

  it('carries the rail’s filters through untouched', () => {
    // This hook owns one key of a shared search object. Rebuilding the object
    // from what it knows about would clear the tags the rail had selected — a
    // filter silently dropped by typing.
    search.current = { tags: ['rlhf'], status: 'reading' }
    const { result } = renderHook(() => useCollectionSearch())

    act(() => {
      result.current.setQuery('attention')
    })
    act(() => {
      vi.advanceTimersByTime(MIRROR_DEBOUNCE_MS)
    })

    expect(navigatedSearch()).toEqual({
      q: 'attention',
      tags: ['rlhf'],
      status: 'reading',
    })
  })

  it('adopts a query that arrives from outside — a link, or the back button', () => {
    const { result, rerender } = renderHook(() => useCollectionSearch())

    search.current = { q: 'residual' }
    rerender()

    expect(result.current.query).toBe('residual')
  })

  it('does not navigate back when it adopts an external change', () => {
    // The two effects would otherwise ping-pong: adopt, mirror, adopt, mirror.
    const { rerender } = renderHook(() => useCollectionSearch())

    search.current = { q: 'residual' }
    rerender()
    act(() => {
      vi.advanceTimersByTime(MIRROR_DEBOUNCE_MS)
    })

    expect(navigate).not.toHaveBeenCalled()
  })
})
