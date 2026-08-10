import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '~/routes/-shared/components/toast/toaster'
import { TRACKER_LOADING_MESSAGE } from '../-components/tracker-loading/tracker-loading'
import {
  EMPTY_COLLECTION_MESSAGE,
  NO_MATCHES_MESSAGE,
} from './article-collection'

/**
 * The half of the collection surface that talks to Zero: which queries it asks
 * for, and how it maps Zero's per-query result type onto what the page draws.
 * What that markup looks like is article-collection.test.tsx's job.
 *
 * `useQuery` and `useZero` are mocked because the real ones require a mounted
 * Zero client — a WebSocket, IndexedDB, and a running zero-cache. That whole
 * path is covered for real in e2e-auth/lit-tracker.spec.ts.
 */

const useQuery = vi.hoisted(() => vi.fn())
const mutate = vi.hoisted(() =>
  vi.fn(() => ({
    client: Promise.resolve({ type: 'success' }),
    server: Promise.resolve({ type: 'success' }),
  })),
)
vi.mock('@rocicorp/zero/react', () => ({
  useQuery,
  useZero: () => ({ mutate }),
}))

/**
 * The filter state the page reads. It lives in the `/lit-tracker` route's search
 * params, so the router is stubbed with a value a test can set — which is also
 * the only way to say "this URL is filtered" without mounting a router.
 */
const search = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
/**
 * One stable spy for every `useNavigate()` on the page, so a test can assert
 * that typing did *not* navigate — which is the whole claim about the search
 * field being instant.
 */
const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useSearch: () => search.current,
    useNavigate: () => navigate,
  }),
}))

const { CollectionPage } = await import('./collection-page')

const ARTICLE = {
  id: '1',
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }],
  status: 'pending',
}

/** A second article, so a filter has something to exclude. */
const OTHER_ARTICLE = {
  id: '2',
  title: 'Deep Residual Learning',
  authors: [{ name: 'Kaiming He' }],
  status: 'read',
}

beforeEach(() => {
  search.current = {}
  navigate.mockClear()
})

afterEach(() => {
  // The search tests below run on fake timers to step over the URL mirror's
  // debounce; left installed they would freeze every test after them.
  vi.useRealTimers()
})

/**
 * The page runs three queries. They are answered by name rather than by call
 * order, so a test can say what one of them returns without having to know
 * where it sits in the component.
 */
function answerQueries(
  answers: Partial<
    Record<'articles.mine' | 'tags.mine' | 'articleTags.mine', unknown[]>
  >,
  details: { type: string } = { type: 'complete' },
) {
  useQuery.mockImplementation((request: { query?: { queryName?: string } }) => {
    const name = request?.query?.queryName ?? ''
    return [answers[name as keyof typeof answers] ?? [], details]
  })
}

/**
 * Inside the toast provider, which the real page is always inside — it is
 * mounted once at the document root, and this page's mutations raise errors
 * through it. Rendering the page bare throws, which is the right behaviour: a
 * provider that has been forgotten should fail loudly rather than quietly drop
 * the one message a refused write has.
 */
function renderPage() {
  return render(
    <Toaster>
      <CollectionPage />
    </Toaster>,
  )
}

describe('CollectionPage', () => {
  it('asks for the signed-in user’s own articles, by name', () => {
    answerQueries({})
    renderPage()

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
    answerQueries({})
    renderPage()

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('collection')
  })

  it('treats an unfinished query as still syncing, not as an empty collection', () => {
    // The mapping this component exists to get right. Zero reports `unknown`
    // until the query has completed a round trip, and the rows in hand until
    // then may be a partial local view — or nothing at all.
    answerQueries({}, { type: 'unknown' })
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent(
      TRACKER_LOADING_MESSAGE,
    )
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })

  it('shows the empty state only once the query is complete', () => {
    answerQueries({})
    renderPage()

    expect(screen.getByText(EMPTY_COLLECTION_MESSAGE)).toBeInTheDocument()
  })

  it('surfaces a failed query as an alert', () => {
    answerQueries({}, { type: 'error' })
    renderPage()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })

  it('renders the rows the query returns', () => {
    answerQueries({ 'articles.mine': [ARTICLE] })
    renderPage()

    // The card, not one of its tag chips — both are list items now.
    expect(screen.getByRole('article')).toHaveTextContent(
      'Attention Is All You Need',
    )
  })

  it('draws only the articles the URL’s filters allow', () => {
    search.current = { status: 'read' }
    answerQueries({ 'articles.mine': [ARTICLE, OTHER_ARTICLE] })
    renderPage()

    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('Deep Residual Learning')
  })

  it('says nothing matches, rather than that the collection is empty', () => {
    // The distinction the reader acts on: one invites deselecting a filter, the
    // other invites an upload. Both are an empty array by the time the
    // collection draws them, so only the page knows which it is.
    search.current = { tags: ['nonexistent'] }
    answerQueries({ 'articles.mine': [ARTICLE] })
    renderPage()

    expect(screen.getByText(NO_MATCHES_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })

  describe('the search bar', () => {
    it('narrows the grid on the keystroke, before any navigation', () => {
      // The claim this task rests on: the rows are already on the client, so
      // filtering is a re-render and never waits on the router. A grid that
      // updated only once the URL had settled would lag every keystroke by the
      // mirror's debounce.
      vi.useFakeTimers()
      answerQueries({ 'articles.mine': [ARTICLE, OTHER_ARTICLE] })
      renderPage()

      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: 'residual' },
      })

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(1)
      expect(cards[0]).toHaveTextContent('Deep Residual Learning')
      expect(navigate).not.toHaveBeenCalled()
    })

    it('mirrors the settled query to the URL, keeping the other filters', () => {
      vi.useFakeTimers()
      search.current = { tags: ['rlhf'] }
      answerQueries({ 'articles.mine': [ARTICLE, OTHER_ARTICLE] })
      renderPage()

      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: 'residual' },
      })
      act(() => {
        vi.advanceTimersByTime(250)
      })

      expect(navigate).toHaveBeenCalledTimes(1)
      // The updater is given the previous search and must return the whole
      // object: a query that dropped the rail's tags would un-filter the
      // collection behind the reader's back, mid-sentence.
      const [{ search: updater }] = navigate.mock.calls[0] as [
        { search: (prev: Record<string, unknown>) => Record<string, unknown> },
      ]
      expect(updater({ tags: ['rlhf'] })).toEqual({
        q: 'residual',
        tags: ['rlhf'],
      })
    })

    it('leaves no key in the URL once the query is emptied again', () => {
      vi.useFakeTimers()
      search.current = { q: 'residual' }
      answerQueries({ 'articles.mine': [ARTICLE, OTHER_ARTICLE] })
      renderPage()

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
      act(() => {
        vi.advanceTimersByTime(250)
      })

      const [{ search: updater }] = navigate.mock.calls[0] as [
        { search: (prev: Record<string, unknown>) => Record<string, unknown> },
      ]
      expect(updater({ q: 'residual' })).toEqual({})
    })

    it('adopts a query that arrives in the URL, from a link or the back button', () => {
      search.current = { q: 'residual' }
      answerQueries({ 'articles.mine': [ARTICLE, OTHER_ARTICLE] })
      renderPage()

      expect(screen.getByRole('searchbox')).toHaveValue('residual')
      expect(screen.getAllByRole('article')).toHaveLength(1)
    })

    it('says nothing matches for a query that excludes everything', () => {
      // Same distinction as the tags case above, reached the other way: a
      // reader who has typed something is filtering, even though
      // `filters.active` — which only knows about tags and status — is false.
      search.current = { q: 'photosynthesis' }
      answerQueries({ 'articles.mine': [ARTICLE] })
      renderPage()

      expect(screen.getByText(NO_MATCHES_MESSAGE)).toBeInTheDocument()
      expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
    })

    it('intersects the query with the rail’s filters rather than replacing them', () => {
      // `read` alone keeps the second article; a query that matches only the
      // first must leave nothing, not reopen what the rail excluded.
      search.current = { status: 'read', q: 'attention' }
      answerQueries({ 'articles.mine': [ARTICLE, OTHER_ARTICLE] })
      renderPage()

      expect(screen.queryAllByRole('article')).toHaveLength(0)
      expect(screen.getByText(NO_MATCHES_MESSAGE)).toBeInTheDocument()
    })
  })
})
