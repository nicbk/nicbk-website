import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * The article's segment of the header path.
 *
 * This is where the paper names itself now — the metadata header above the
 * reader is gone, and the decided path spec
 * (research/ui-ux/pages/lit-tracker/components/header.md) had a segment reserved
 * for exactly this since 2026-07-04.
 *
 * `useQuery` is mocked because the real one needs a mounted Zero client.
 */

const useQuery = vi.hoisted(() => vi.fn())
vi.mock('@rocicorp/zero/react', () => ({ useQuery, useZero: () => ({}) }))

const { ArticleTitle } = await import('./article-title')

const ARTICLE = {
  id: '018f5b6c-0000-7000-8000-000000000001',
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }],
  publicationYear: 2017,
  venue: 'Advances in Neural Information Processing Systems',
  status: 'reading',
  notes: null,
}

function answerWith(articles: unknown[], type = 'complete') {
  useQuery.mockImplementation((request: { query?: { queryName?: string } }) =>
    request?.query?.queryName === 'articles.byId'
      ? [articles, { type }]
      : [[], { type }],
  )
}

describe('ArticleTitle', () => {
  it('names the article being read', () => {
    answerWith([ARTICLE])
    render(<ArticleTitle articleId={ARTICLE.id} />)

    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
  })

  it('marks itself as the current page rather than linking anywhere', () => {
    // It names where you already are, so there is nowhere for it to go.
    answerWith([ARTICLE])
    render(<ArticleTitle articleId={ARTICLE.id} />)

    expect(screen.getByText(ARTICLE.title)).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('is not a heading', () => {
    // The page's one <h1> is inside <main> for the focus handoff
    // (src/focus-handoff.ts); a second heading in the banner would put a rival
    // at the top of the document outline.
    answerWith([ARTICLE])
    render(<ArticleTitle articleId={ARTICLE.id} />)

    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('keeps the full title reachable where the visible one is cut short', () => {
    // The row is shared with the app name and the account controls, so a real
    // paper title is ellipsised. This is what gives it back.
    answerWith([ARTICLE])
    render(<ArticleTitle articleId={ARTICLE.id} />)

    expect(screen.getByText(ARTICLE.title)).toHaveAttribute(
      'title',
      ARTICLE.title,
    )
  })

  it('renders nothing while the row is still arriving', () => {
    // A path segment reading "loading…" would be worse than a path that briefly
    // stops at the root.
    answerWith([], 'unknown')
    const { container } = render(<ArticleTitle articleId={ARTICLE.id} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for an article that is not in this account', () => {
    // Same answer for someone else's article as for one that does not exist —
    // the query is scoped by owner, so both arrive as an empty result, and the
    // header must not distinguish them either.
    answerWith([])
    const { container } = render(<ArticleTitle articleId={ARTICLE.id} />)

    expect(container).toBeEmptyDOMElement()
  })
})
