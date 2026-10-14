import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  foldsAfter,
  forgetContentsFolds,
  useContentsFolds,
} from './use-contents-folds'

/** A lone root, "A Book", over one chapter with one section. */
const LONE_ROOT = [
  { title: 'A Book', depth: 1, pageIndex: 0, top: null },
  { title: '1 Chapter', depth: 2, pageIndex: 1, top: null },
  { title: '1.1 Section', depth: 3, pageIndex: 1, top: 200 },
]

afterEach(() => {
  forgetContentsFolds()
})

describe('foldsAfter', () => {
  it('opens and closes one entry, sorted and without duplicates', () => {
    expect(foldsAfter([4, 1], 2, true)).toEqual([1, 2, 4])
    expect(foldsAfter([1, 2], 2, true)).toEqual([1, 2])
    expect(foldsAfter([1, 2], 1, false)).toEqual([2])
    expect(foldsAfter([2], 7, false)).toEqual([2])
  })
})

describe('useContentsFolds', () => {
  it('is null — never folded — until the first press', () => {
    const { result } = renderHook(() => useContentsFolds('a', LONE_ROOT))
    expect(result.current.expanded).toBeNull()
  })

  it('starts the first press from the first-visit view', () => {
    const { result } = renderHook(() => useContentsFolds('a', LONE_ROOT))
    // The lone root is open on the first visit; opening the chapter must keep
    // it open rather than closing it by starting from nothing.
    act(() => result.current.fold(1, true))
    expect(result.current.expanded).toEqual([0, 1])
  })

  it('keeps a lone root closed once the reader closes it', () => {
    const { result } = renderHook(() => useContentsFolds('a', LONE_ROOT))
    act(() => result.current.fold(0, false))
    expect(result.current.expanded).toEqual([])
  })

  it('keeps folds for the visit, across mounts, per paper', () => {
    const first = renderHook(() => useContentsFolds('a', LONE_ROOT))
    act(() => first.result.current.fold(1, true))
    first.unmount()

    // The sheet, mounted again after closing.
    const again = renderHook(() => useContentsFolds('a', LONE_ROOT))
    expect(again.result.current.expanded).toEqual([0, 1])

    const other = renderHook(() => useContentsFolds('b', LONE_ROOT))
    expect(other.result.current.expanded).toBeNull()
  })
})
