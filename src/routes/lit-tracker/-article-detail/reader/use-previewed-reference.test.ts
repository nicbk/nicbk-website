import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PreviewRegion } from './link-preview-region'

/**
 * The preview's reading of the open paper's bibliography. `useQuery` is mocked
 * because the real one needs a Zero client; which query is asked, and with
 * what, is the point.
 */

const useQuery = vi.hoisted(() => vi.fn())
vi.mock('@rocicorp/zero/react', () => ({ useQuery }))

const { usePreviewedReference } = await import('./use-previewed-reference')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

/** BERT's entry for ELMo, as GROBID located it, and the region #22 drew. */
const ELMO = {
  id: 'edge-elmo',
  citedArticle: { id: 'article-elmo', title: 'Deep Contextualized Word' },
  entryRegions: {
    pageIndex: 10,
    boxes: [
      { x: 72, y: 723.6, width: 218.27, height: 8.64 },
      { x: 82.91, y: 734.56, width: 207.36, height: 8.64 },
      { x: 82.91, y: 745.52, width: 207.36, height: 8.64 },
      { x: 82.91, y: 756.31, width: 97.38, height: 8.81 },
    ],
  },
}
const REGION: PreviewRegion = {
  pageIndex: 10,
  rect: {
    origin: { x: 64.02, y: 716.13 },
    size: { width: 228.98, height: 48.87 },
  },
}

beforeEach(() => {
  useQuery.mockReset()
  useQuery.mockReturnValue([[ELMO], { type: 'complete' }])
})

describe('usePreviewedReference', () => {
  it('reads the open paper’s own references', () => {
    renderHook(() => usePreviewedReference(ARTICLE_ID, REGION))

    const [request] = useQuery.mock.calls[0] ?? []
    expect(request.query.queryName).toBe('citationEdges.references')
    expect(request.args).toBe(ARTICLE_ID)
  })

  it('is the reference the region is showing, with its article', () => {
    const { result } = renderHook(() =>
      usePreviewedReference(ARTICLE_ID, REGION),
    )

    expect(result.current?.id).toBe('edge-elmo')
    expect(result.current?.citedArticle?.id).toBe('article-elmo')
  })

  it('is nothing until a region has been worked out', () => {
    const { result } = renderHook(() => usePreviewedReference(ARTICLE_ID, null))

    expect(result.current).toBeNull()
  })
})
