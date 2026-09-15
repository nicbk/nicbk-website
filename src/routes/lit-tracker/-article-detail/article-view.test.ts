import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * The article page's view in the URL: what a search means, and what switching
 * writes. The router is mocked; that `navigate` builds the URL from this is the
 * router's job.
 */

const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { articleViewOf, useSetArticleView } = await import('./article-view')

describe('articleViewOf', () => {
  it('is the reader unless the search says citations', () => {
    expect(articleViewOf({ view: 'citations' })).toBe('citations')
    expect(articleViewOf({})).toBe('reader')
    expect(articleViewOf(undefined)).toBe('reader')
  })
})

describe('useSetArticleView', () => {
  function switchTo(view: 'reader' | 'citations') {
    navigate.mockClear()
    const { result } = renderHook(() => useSetArticleView('article-1'))
    result.current(view)
    return navigate.mock.calls[0]?.[0] as {
      to: string
      params: unknown
      replace?: boolean
      search: (previous: Record<string, unknown>) => Record<string, unknown>
    }
  }

  it('writes citations into the search, keeping the collection’s filters', () => {
    const call = switchTo('citations')

    expect(call.to).toBe('/lit-tracker/$articleId')
    expect(call.params).toEqual({ articleId: 'article-1' })
    expect(call.search({ q: 'attention', tags: ['nlp'] })).toEqual({
      q: 'attention',
      tags: ['nlp'],
      view: 'citations',
    })
  })

  it('writes the reader as no view at all', () => {
    const call = switchTo('reader')

    expect(call.search({ q: 'attention', view: 'citations' })).toEqual({
      q: 'attention',
      view: undefined,
    })
  })

  it('pushes a history entry, so Back returns to the other view', () => {
    expect(switchTo('citations').replace).toBeUndefined()
  })
})
