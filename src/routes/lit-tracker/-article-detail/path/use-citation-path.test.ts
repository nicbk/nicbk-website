import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PATH_ARTICLES_MAX } from '~/lit-tracker/citation-path'

/**
 * What the way back asks sync for, and what it makes of the answer. `useQuery`
 * is mocked because the real one needs a Zero client; the rules it feeds are
 * `~/lit-tracker/citation-path`'s own coverage.
 */

const useQuery = vi.hoisted(() => vi.fn())
vi.mock('@rocicorp/zero/react', () => ({ useQuery }))

const { useCitationPath } = await import('./use-citation-path')

const A = '018f5b6c-0000-7000-8000-00000000000a'
const B = '018f5b6c-0000-7000-8000-00000000000b'
const C = '018f5b6c-0000-7000-8000-00000000000c'

function answer(rows: unknown[]) {
  useQuery.mockReturnValue([rows, { type: 'complete' }])
}

function paper(id: string, title: string, cites: string[] = []) {
  return {
    id,
    title,
    references: cites.map((citedArticleId) => ({ citedArticleId })),
  }
}

beforeEach(() => {
  useQuery.mockReset()
})

describe('useCitationPath', () => {
  it('asks one query for the whole path, open paper included', () => {
    answer([])
    renderHook(() => useCitationPath(C, [A, B]))

    expect(useQuery).toHaveBeenCalledTimes(1)
    const [request] = useQuery.mock.calls[0] ?? []
    expect(request.query.queryName).toBe('articles.onPath')
    expect(request.args).toEqual([A, B, C])
  })

  it('walks the ids before asking, so a loop cannot widen the query', () => {
    answer([])
    // A → B → A: the return to A is the whole path, so B is not asked for.
    renderHook(() => useCitationPath(A, [A, B]))

    expect(useQuery.mock.calls[0]?.[0].args).toEqual([A])
  })

  it('never asks for more papers than a path may hold', () => {
    answer([])
    const many = Array.from(
      { length: 40 },
      (_, index) =>
        `018f5b6c-0000-7000-8000-${String(index).padStart(12, '0')}`,
    )

    renderHook(() => useCitationPath(A, many))

    expect(useQuery.mock.calls[0]?.[0].args).toHaveLength(PATH_ARTICLES_MAX)
  })

  it('builds the steps from the rows, labelled by their edges', () => {
    answer([
      paper(A, 'Attention'),
      paper(B, 'BERT', [A]),
      paper(C, 'RoBERTa', [B]),
    ])

    const { result } = renderHook(() => useCitationPath(C, [A, B]))

    expect(result.current.map((step) => [step.title, step.label])).toEqual([
      ['Attention', null],
      ['BERT', 'cited by'],
      ['RoBERTa', 'cited by'],
    ])
  })

  it('has no path before the rows arrive', () => {
    answer([])

    const { result } = renderHook(() => useCitationPath(C, [A, B]))

    expect(result.current).toEqual([])
  })
})
