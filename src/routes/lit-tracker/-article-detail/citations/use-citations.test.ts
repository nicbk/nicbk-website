import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The two queries behind the citations view, and when their answer counts as
 * one. `useQuery` is mocked because the real one needs a Zero client.
 */

const useQuery = vi.hoisted(() => vi.fn())
vi.mock('@rocicorp/zero/react', () => ({ useQuery }))

const { useCitations } = await import('./use-citations')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

function answer(
  rows: { references?: unknown[]; citedBy?: unknown[] },
  types: { references?: string; citedBy?: string } = {},
) {
  useQuery.mockImplementation((request: { query?: { queryName?: string } }) => {
    const name = request?.query?.queryName
    if (name === 'citationEdges.references') {
      return [rows.references ?? [], { type: types.references ?? 'complete' }]
    }
    return [rows.citedBy ?? [], { type: types.citedBy ?? 'complete' }]
  })
}

beforeEach(() => {
  useQuery.mockReset()
})

describe('useCitations', () => {
  it('asks both named queries for this article', () => {
    answer({})
    renderHook(() => useCitations(ARTICLE_ID))

    const requests = useQuery.mock.calls.map(([request]) => ({
      name: request.query.queryName,
      args: request.args,
    }))
    expect(requests).toEqual(
      expect.arrayContaining([
        { name: 'citationEdges.references', args: ARTICLE_ID },
        { name: 'citationEdges.citedBy', args: ARTICLE_ID },
      ]),
    )
  })

  it('is syncing until both have answered', () => {
    answer({}, { citedBy: 'unknown' })
    const { result } = renderHook(() => useCitations(ARTICLE_ID))

    expect(result.current.state).toBe('syncing')
  })

  it('is an error if either failed', () => {
    answer({}, { references: 'error', citedBy: 'unknown' })
    const { result } = renderHook(() => useCitations(ARTICLE_ID))

    expect(result.current.state).toBe('error')
  })

  it('sorts the rows into lists once both are complete', () => {
    answer({
      references: [
        {
          id: 'edge-1',
          title: 'Adam',
          authors: [],
          publicationYear: 2014,
          semanticScholarId: null,
          rawText: null,
        },
      ],
    })
    const { result } = renderHook(() => useCitations(ARTICLE_ID))

    expect(result.current.state).toBe('ready')
    expect(
      result.current.lists.cites.elsewhere.map((row) => row.title),
    ).toEqual(['Adam'])
  })
})
