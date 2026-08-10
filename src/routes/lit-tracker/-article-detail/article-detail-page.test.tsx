import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '~/routes/-shared/components/toast/toaster'

/**
 * The page's states, and what it draws once it has an article.
 *
 * The load-bearing assertion here is that **"not found" and "not yours" are the
 * same page** — `queries.articles.byId` filters by owner as well as id, so both
 * arrive as an empty complete result, and this file pins that they stay
 * indistinguishable. The other one is that a still-syncing query is neither.
 *
 * `useQuery` and `useZero` are mocked because the real ones need a mounted Zero
 * client.
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

vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react')
  return {
    Link: ({ to, children }: { to: string; children: ReactNode }) =>
      createElement('a', { href: to }, children),
  }
})

const { ArticleDetailPage } = await import('./article-detail-page')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

const ARTICLE = {
  id: ARTICLE_ID,
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
  publicationYear: 2017,
  venue: 'Advances in Neural Information Processing Systems',
  status: 'pending',
  notes: 'the one everything else cites',
}

/**
 * The page runs three queries. They are answered by name rather than by call
 * order, so a test can say what one of them returns without knowing where it
 * sits in the component.
 */
function answerQueries(
  answers: Partial<
    Record<'articles.byId' | 'tags.mine' | 'articleTags.mine', unknown[]>
  >,
  details: { type: string } = { type: 'complete' },
) {
  useQuery.mockImplementation((request: { query?: { queryName?: string } }) => {
    const name = request?.query?.queryName ?? ''
    return [answers[name as keyof typeof answers] ?? [], details]
  })
}

function renderPage() {
  return render(
    <Toaster>
      <ArticleDetailPage articleId={ARTICLE_ID} />
    </Toaster>,
  )
}

beforeEach(() => {
  useQuery.mockReset()
})

describe('ArticleDetailPage', () => {
  it('asks for the one article by id, by query name', () => {
    // The request names a registered query rather than carrying a filter the
    // client chose — which is what lets `/api/zero/query` decide whose row that
    // is, and is why another user's id comes back empty rather than populated.
    answerQueries({})
    renderPage()

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ queryName: 'articles.byId' }),
      }),
    )
  })

  it('shows the article once it has arrived', () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: ARTICLE.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Ashish Vaswani/)).toBeInTheDocument()
    expect(screen.getByText(/2017/)).toBeInTheDocument()
  })

  it('omits a field the article does not have, rather than leaving a gap', () => {
    answerQueries({
      'articles.byId': [{ ...ARTICLE, publicationYear: null, venue: null }],
    })
    renderPage()

    // No stray separator, and no empty line where the publication details were.
    expect(screen.queryByText(/2017/)).toBeNull()
    expect(screen.queryByText(',')).toBeNull()
  })

  it('treats an unfinished query as syncing, not as a missing article', () => {
    // Zero reports `unknown` until the query has completed a round trip, and an
    // empty result until then says nothing at all. Drawing "no such article"
    // here would flash it on every cold load of a real one.
    answerQueries({}, { type: 'unknown' })
    renderPage()

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(screen.getByText(/loading/)).toBeInTheDocument()
  })

  it('says the article is not in the collection once the query is complete', () => {
    answerQueries({})
    renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: /no such article/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /back to your collection/ }),
    ).toBeInTheDocument()
  })

  it('says exactly the same thing for another user’s article', () => {
    // The security property, asserted rather than assumed: the query is scoped
    // by owner as well as by id, so a real article belonging to someone else is
    // an empty complete result — the same one a nonexistent id produces. If a
    // future change ever distinguished them, article ids would become
    // enumerable through this page.
    answerQueries({})
    const notMine = render(
      <Toaster>
        <ArticleDetailPage articleId="018f5b6c-0000-7000-8000-00000000dead" />
      </Toaster>,
    )
    const forSomeoneElse = notMine.container.innerHTML

    notMine.unmount()
    const missing = renderPage()

    expect(missing.container.innerHTML).toBe(forSomeoneElse)
  })

  it('surfaces a failed query as its own state', () => {
    // Not the same as an empty one: a query that could not run is a fault to
    // report, not an article that is not there.
    answerQueries({}, { type: 'error' })
    renderPage()

    expect(screen.getByText(/could not load/)).toBeInTheDocument()
    expect(screen.queryByText(/no such article/)).toBeNull()
  })

  it('holds the reader’s space open rather than hiding it', () => {
    // #7's reserved search slot is the precedent: the page's proportions now are
    // the ones it keeps when task 3 drops a document in.
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderPage()

    expect(screen.getByText(/the reader arrives/)).toBeInTheDocument()
  })

  it('carries the card’s menu, not a second one of its own', () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderPage()

    expect(
      screen.getByRole('button', { name: `Options for ${ARTICLE.title}` }),
    ).toBeInTheDocument()
  })
})
