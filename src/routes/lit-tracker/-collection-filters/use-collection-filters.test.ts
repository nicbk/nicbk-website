import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The filter state, as it round-trips through the URL.
 *
 * The router is stubbed rather than mounted: what is under test is the shape of
 * the search object this hook writes — which keys it sets, and which it leaves
 * off entirely — and a real router would answer that question through a URL
 * string, one layer further from the thing that decides it. That the schema
 * parses such a URL back is `search-schema`'s own coverage, and that the two meet
 * in a real browser is the e2e suite's.
 */

const search = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useSearch: () => search.current,
    useNavigate: () => navigate,
  }),
}))

const { useCollectionFilters } = await import('./use-collection-filters')

beforeEach(() => {
  search.current = {}
  navigate.mockClear()
})

/** The search object the last navigation asked for. */
function navigatedSearch() {
  const call = navigate.mock.calls.at(-1)?.[0] as {
    search: (prev: Record<string, unknown>) => unknown
  }
  return call.search(search.current)
}

describe('useCollectionFilters', () => {
  it('reads the selections out of the URL', () => {
    search.current = { tags: ['rlhf'], status: 'reading' }

    const { result } = renderHook(() => useCollectionFilters())

    expect(result.current.tags).toEqual(['rlhf'])
    expect(result.current.status).toBe('reading')
    expect(result.current.active).toBe(true)
  })

  it('reports no filters as inactive, with concrete empties', () => {
    const { result } = renderHook(() => useCollectionFilters())

    expect(result.current.tags).toEqual([])
    expect(result.current.status).toBeUndefined()
    expect(result.current.active).toBe(false)
  })

  it('accumulates tags rather than replacing them', () => {
    search.current = { tags: ['rlhf'] }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.toggleTag('transformers'))

    expect(navigatedSearch()).toEqual({ tags: ['rlhf', 'transformers'] })
  })

  it('removes a tag that is already selected', () => {
    search.current = { tags: ['rlhf', 'transformers'] }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.toggleTag('rlhf'))

    expect(navigatedSearch()).toEqual({ tags: ['transformers'] })
  })

  it('replaces the status rather than accumulating, unlike tags', () => {
    // The single-select half of the unified model: `articles.status` is one
    // column, so choosing a second status is choosing instead, not as well.
    search.current = { status: 'reading' }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.toggleStatus('read'))

    expect(navigatedSearch()).toEqual({ status: 'read' })
  })

  it('clears the status when the selected one is pressed again', () => {
    // "Any status" is a legitimate filter, unlike an article's own status,
    // which always has a value.
    search.current = { status: 'read' }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.toggleStatus('read'))

    expect(navigatedSearch()).toEqual({})
  })

  it('leaves no key behind for an inactive filter', () => {
    // So an unfiltered `/lit-tracker` stays `/lit-tracker` rather than becoming
    // `/lit-tracker?tags=%5B%5D` — which every plain link to the tracker would
    // otherwise carry.
    search.current = { tags: ['rlhf'] }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.toggleTag('rlhf'))

    expect(navigatedSearch()).toEqual({})
  })

  it('keeps the other filter when one of them changes', () => {
    search.current = { tags: ['rlhf'], status: 'reading' }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.toggleTag('transformers'))

    expect(navigatedSearch()).toEqual({
      tags: ['rlhf', 'transformers'],
      status: 'reading',
    })
  })

  it('drops a tag from the selection without toggling it back on', () => {
    // What runs when a tag is *deleted*. A toggle would put a tag that no
    // longer exists back into the URL — the opposite of the intent.
    search.current = { tags: ['rlhf', 'transformers'] }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.dropTag('rlhf'))

    expect(navigatedSearch()).toEqual({ tags: ['transformers'] })
  })

  it('leaves the selection alone when dropping a tag that was not in it', () => {
    search.current = { tags: ['transformers'] }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.dropTag('rlhf'))

    expect(navigatedSearch()).toEqual({ tags: ['transformers'] })
  })

  it('drops everything at once', () => {
    search.current = { tags: ['rlhf'], status: 'read' }
    const { result } = renderHook(() => useCollectionFilters())

    act(() => result.current.clear())

    expect(navigatedSearch()).toEqual({})
  })

  it('returns a stable object while nothing changes', () => {
    // The collection memoizes its filtered rows on this value; a fresh object
    // per render would re-filter the whole collection on every render.
    const { result, rerender } = renderHook(() => useCollectionFilters())
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
