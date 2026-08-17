import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The list's read: the right query, the rows passed through untouched, and
 * Zero's three result types as the three states the panel draws.
 */

const useQuery = vi.hoisted(() => vi.fn())
vi.mock('@rocicorp/zero/react', () => ({ useQuery }))

const { useArticleAnnotations } = await import('./use-article-annotations')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

const ROW = {
  id: 'a1',
  type: 'ink',
  pageIndex: 2,
  contents: null,
  payload: {},
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  useQuery.mockReset()
  useQuery.mockReturnValue([[], { type: 'complete' }])
})

describe('useArticleAnnotations', () => {
  it('asks for this article’s annotations', () => {
    renderHook(() => useArticleAnnotations(ARTICLE_ID))

    // The same query the reader's sync bridge holds open — sharing its view is
    // the point, so the name is the contract worth pinning.
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ queryName: 'annotations.forArticle' }),
      }),
    )
  })

  it('passes the rows through in the query’s own order', () => {
    // The query sorts by page then creation time *for this list*; re-sorting
    // here would be a second place for that decision to live.
    useQuery.mockReturnValue([[ROW], { type: 'complete' }])

    const { result } = renderHook(() => useArticleAnnotations(ARTICLE_ID))

    expect(result.current.state).toBe('ready')
    expect(result.current.annotations).toEqual([ROW])
  })

  it('reports syncing until the first round trip completes', () => {
    useQuery.mockReturnValue([[], { type: 'unknown' }])

    const { result } = renderHook(() => useArticleAnnotations(ARTICLE_ID))

    expect(result.current.state).toBe('syncing')
  })

  it('reports an error as an error, not as an empty list', () => {
    useQuery.mockReturnValue([[], { type: 'error' }])

    const { result } = renderHook(() => useArticleAnnotations(ARTICLE_ID))

    expect(result.current.state).toBe('error')
  })
})
