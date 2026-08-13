import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * The `/lit-tracker/$articleId` mount. Everything this page does is
 * `-article-detail/`'s; what this file has to get right is that the id in the
 * URL reaches the page, that the guard is not re-declared, and — the one worth
 * asserting rather than assuming — that there is **no loader**.
 */

const ArticleDetailPage = vi.hoisted(() =>
  vi.fn(({ articleId }: { articleId: string }) => articleId),
)
vi.mock('./-article-detail/article-detail-page', () => ({ ArticleDetailPage }))

const params = vi.hoisted(() => ({ current: { articleId: 'article-1' } }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
    useParams: () => params.current,
  }),
}))

const { Route } = await import('./$articleId')

// Named rather than indexed, as in `index.test.tsx`: an index signature forces
// bracket access, which Biome's useLiteralKeys then rejects.
const options = Route.options as unknown as {
  component: () => React.ReactNode
  beforeLoad?: unknown
  loader?: unknown
}

describe('the /lit-tracker/$articleId mount', () => {
  it('hands the id from the URL to the page', () => {
    params.current = { articleId: '018f5b6c-0000-7000-8000-000000000001' }
    const Component = options.component

    render(<Component />)

    expect(
      screen.getByText('018f5b6c-0000-7000-8000-000000000001'),
    ).toBeInTheDocument()
  })

  it('has no loader', () => {
    // Every other dynamic route on this site resolves its subject server-side
    // and throws `notFound()` for an unknown one. This article arrives by sync,
    // so at the moment the route matches there is nothing to resolve — "not
    // found" is a state the page draws once its query completes empty. A loader
    // appearing here later would mean that reasoning had been forgotten.
    expect(options.loader).toBeUndefined()
  })

  it('adds no guard of its own', () => {
    // `requireAuth` is attached once, at the group root (route.tsx). Repeating
    // it here would resolve the session twice per navigation.
    expect(options.beforeLoad).toBeUndefined()
  })
})
