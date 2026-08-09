import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TRACKER_LOADING_MESSAGE } from '../-components/tracker-loading/tracker-loading'
import { EMPTY_COLLECTION_MESSAGE } from './article-collection'

/**
 * The half of the collection surface that talks to Zero: which query it asks
 * for, and how it maps Zero's per-query result type onto what the page draws.
 * What that markup looks like is article-collection.test.tsx's job.
 *
 * `useQuery` is mocked because the real one requires a mounted Zero client —
 * a WebSocket, IndexedDB, and a running zero-cache. That whole path is covered
 * for real in e2e-auth/lit-tracker.spec.ts.
 */

const useQuery = vi.hoisted(() => vi.fn())
vi.mock('@rocicorp/zero/react', () => ({ useQuery }))

const { CollectionPage } = await import('./collection-page')

const ARTICLE = {
  id: '1',
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }],
}

describe('CollectionPage', () => {
  it('asks for the signed-in user’s own articles, by name', () => {
    useQuery.mockReturnValue([[], { type: 'complete' }])
    render(<CollectionPage />)

    // The request names a registered query rather than carrying a filter the
    // client chose — which is what lets `/api/zero/query` decide whose rows
    // those are (src/zero/queries.ts).
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ queryName: 'articles.mine' }),
      }),
    )
  })

  it('keeps one main heading, for structure and focus handoff', () => {
    // The decided layout draws no page title — the panel opens with the
    // toolbar row — but the heading still has to exist: it names the page for
    // assistive technology and is what the route-change focus handoff moves
    // to. It is clipped in CSS rather than removed, so this stays true.
    useQuery.mockReturnValue([[], { type: 'complete' }])
    render(<CollectionPage />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('collection')
  })

  it('treats an unfinished query as still syncing, not as an empty collection', () => {
    // The mapping this component exists to get right. Zero reports `unknown`
    // until the query has completed a round trip, and the rows in hand until
    // then may be a partial local view — or nothing at all.
    useQuery.mockReturnValue([[], { type: 'unknown' }])
    render(<CollectionPage />)

    expect(screen.getByRole('status')).toHaveTextContent(
      TRACKER_LOADING_MESSAGE,
    )
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })

  it('shows the empty state only once the query is complete', () => {
    useQuery.mockReturnValue([[], { type: 'complete' }])
    render(<CollectionPage />)

    expect(screen.getByText(EMPTY_COLLECTION_MESSAGE)).toBeInTheDocument()
  })

  it('surfaces a failed query as an alert', () => {
    useQuery.mockReturnValue([[], { type: 'error' }])
    render(<CollectionPage />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })

  it('renders the rows the query returns', () => {
    useQuery.mockReturnValue([[ARTICLE], { type: 'complete' }])
    render(<CollectionPage />)

    expect(screen.getByRole('listitem')).toHaveTextContent(
      'Attention Is All You Need',
    )
  })
})
