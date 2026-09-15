import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react')
  return {
    Link: ({ to, children }: { to: string; children: ReactNode }) =>
      createElement('a', { href: to }, children),
    useMatch: () => undefined,
    useNavigate: () => navigate,
    // Stands in for the real boundary by rendering only its fallback, which is
    // what the server pass does. That keeps PDFium's WebAssembly out of jsdom,
    // and it is deliberately not a pass-through: a `ClientOnly` that rendered
    // its children here would let a refactor make the engine SSR-eligible
    // without any test noticing.
    ClientOnly: ({ fallback }: { fallback: ReactNode }) => fallback,
  }
})

const { ArticleDetailPage, readingPositionOf } = await import(
  './article-detail-page'
)

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

const ATTENTION_TAG = {
  id: '018f5b6c-0000-7000-8000-0000000000a1',
  name: 'attention',
}

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

const onViewChange = vi.fn()

function page(view: 'reader' | 'citations' = 'reader') {
  return (
    <Toaster>
      <ArticleDetailPage
        articleId={ARTICLE_ID}
        view={view}
        onViewChange={onViewChange}
      />
    </Toaster>
  )
}

function renderPage(view: 'reader' | 'citations' = 'reader') {
  return render(page(view))
}

beforeEach(() => {
  useQuery.mockReset()
  mutate.mockClear()
  navigate.mockClear()
  onViewChange.mockClear()
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

  it('names the article in a heading, without drawing one', () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderPage()

    // The <h1> is still here — the focus handoff (src/focus-handoff.ts) lands on
    // it — but nothing on this page draws the title any more: the header's
    // header does (article-title.tsx). What that buys is the panel
    // height the metadata row used to spend.
    expect(
      screen.getByRole('heading', { level: 1, name: ARTICLE.title }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Ashish Vaswani/)).toBeNull()
    expect(screen.queryByText(/Neural Information/)).toBeNull()
  })

  it('keeps the authors and venue in the menu, where they moved', async () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderPage()

    await userEvent.click(
      screen.getByRole('button', { name: `Options for ${ARTICLE.title}` }),
    )

    expect(screen.getByText(/Ashish Vaswani/)).toBeInTheDocument()
    expect(screen.getByText(/2017, Advances in Neural/)).toBeInTheDocument()
  })

  it('omits a field the article does not have, rather than leaving a gap', async () => {
    answerQueries({
      'articles.byId': [{ ...ARTICLE, publicationYear: null, venue: null }],
    })
    renderPage()

    await userEvent.click(
      screen.getByRole('button', { name: `Options for ${ARTICLE.title}` }),
    )

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
        <ArticleDetailPage
          articleId="018f5b6c-0000-7000-8000-00000000dead"
          view="reader"
          onViewChange={onViewChange}
        />
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

  it('fills the reader’s space with the reader, and not on the server', () => {
    // Task 1 held this space open; task 3 put the reader in it. The engine is
    // WebAssembly, so what a server render produces here is the fallback —
    // which is exactly what the mocked `ClientOnly` above renders.
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderPage()

    expect(screen.getByText(/starting the reader/)).toBeInTheDocument()
  })

  it('carries the card’s menu, not a second one of its own', () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderPage()

    expect(
      screen.getByRole('button', { name: `Options for ${ARTICLE.title}` }),
    ).toBeInTheDocument()
  })

  describe('the citations view', () => {
    beforeEach(() => {
      // jsdom has no `matchMedia`, which the sheet listens to while open. Always
      // narrow: these tests are about a phone's sheet.
      vi.stubGlobal('matchMedia', (query: string) => ({
        media: query,
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('hides the reader behind it rather than unmounting it', () => {
      // The decided swap (features/citation-graph-traversal): the paper stays
      // open, at its place, while the lists show. The same element before and
      // after is what "not unmounted" means — a remount would be a new one.
      answerQueries({ 'articles.byId': [ARTICLE] })
      const { rerender } = renderPage('reader')
      const reader = screen.getByText(/starting the reader/)

      rerender(page('citations'))

      // `getByText` matches hidden elements too, which is what this needs.
      expect(screen.getByText(/starting the reader/)).toBe(reader)
      expect(reader.closest('[hidden]')).not.toBeNull()
      expect(
        screen.getByRole('region', { name: 'citations' }),
      ).toBeInTheDocument()

      rerender(page('reader'))

      expect(screen.getByText(/starting the reader/)).toBe(reader)
      expect(reader.closest('[hidden]')).toBeNull()
      expect(screen.queryByRole('region', { name: 'citations' })).toBeNull()
    })

    it('gives a new paper a new reader, rather than handing the old one a second document', () => {
      // Following a citation changes only the id in the URL, so this page stays
      // mounted. A reader kept across that change threw inside EmbedPDF.
      answerQueries({ 'articles.byId': [ARTICLE] })
      const { rerender } = renderPage('reader')
      const first = screen.getByText(/starting the reader/)

      rerender(
        <Toaster>
          <ArticleDetailPage
            articleId="018f5b6c-0000-7000-8000-000000000002"
            view="reader"
            onViewChange={onViewChange}
          />
        </Toaster>,
      )

      expect(screen.getByText(/starting the reader/)).not.toBe(first)
    })

    it('takes the page’s controls while the reader is hidden, in one place only', () => {
      answerQueries({ 'articles.byId': [ARTICLE] })
      renderPage('citations')

      const menus = screen.getAllByRole('button', {
        name: `Options for ${ARTICLE.title}`,
        hidden: true,
      })
      expect(menus).toHaveLength(1)
      expect(
        screen.getByRole('region', { name: 'citations' }),
      ).toContainElement(menus[0] ?? null)
    })

    it('closes the sheet when Citations is chosen in it', async () => {
      answerQueries({ 'articles.byId': [ARTICLE] })
      renderPage('reader')

      await userEvent.click(screen.getByRole('button', { name: 'article' }))
      const sheet = await screen.findByRole('dialog', { name: 'article' })
      await userEvent.click(
        within(sheet).getByRole('tab', { name: 'citations' }),
      )

      expect(onViewChange).toHaveBeenCalledWith('citations')
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'article' })).toBeNull(),
      )
    })

    it('keeps the sheet open for any other tab', async () => {
      answerQueries({ 'articles.byId': [ARTICLE] })
      renderPage('reader')

      await userEvent.click(screen.getByRole('button', { name: 'article' }))
      const sheet = await screen.findByRole('dialog', { name: 'article' })
      await userEvent.click(within(sheet).getByRole('tab', { name: 'notes' }))

      expect(
        screen.getByRole('dialog', { name: 'article' }),
      ).toBeInTheDocument()
      expect(onViewChange).not.toHaveBeenCalled()
    })
  })

  describe('the menu writes against this article', () => {
    /** Opens the summary's three-dot menu, which every case below acts inside. */
    async function openMenu() {
      answerQueries({
        'articles.byId': [ARTICLE],
        'tags.mine': [ATTENTION_TAG],
        'articleTags.mine': [
          { articleId: ARTICLE_ID, tagId: ATTENTION_TAG.id },
        ],
      })
      renderPage()
      await userEvent.click(
        screen.getByRole('button', { name: `Options for ${ARTICLE.title}` }),
      )
    }

    it('sets reading status', async () => {
      await openMenu()

      await userEvent.click(screen.getByRole('button', { name: 'read' }))

      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    })

    it('removes a tag the article carries', async () => {
      await openMenu()

      await userEvent.click(screen.getByRole('checkbox', { name: /attention/ }))

      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    })

    it('creates and applies a new tag', async () => {
      // Two writes: create, then attach.
      await openMenu()

      await userEvent.type(
        screen.getByRole('textbox', { name: 'tags' }),
        'diffusion{Enter}',
      )

      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2))
    })

    it('leaves for the collection when the article being read is deleted', async () => {
      // Zero applies the delete to the local copy at once, so staying would
      // drop this page into its own "no such article" branch — a dead end
      // shown to the reader who just asked for the deletion, which reads as an
      // error rather than as the thing working.
      await openMenu()
      await userEvent.click(screen.getByRole('button', { name: 'delete…' }))
      await screen.findByRole('dialog', { name: 'delete article' })

      await userEvent.type(
        screen.getByRole('textbox', { name: /type/ }),
        'delete',
      )
      await userEvent.click(
        screen.getByRole('button', { name: 'delete article' }),
      )

      expect(navigate).toHaveBeenCalledWith({ to: '/lit-tracker' })
      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    })
  })
})

describe('readingPositionOf', () => {
  it('is the stored page and offset', () => {
    expect(readingPositionOf({ readingPage: 7, readingOffset: 412.5 })).toEqual(
      { page: 7, offset: 412.5 },
    )
  })

  it('is none for a paper not yet read, or half a position', () => {
    // Offset 0 is a real position, the top of a page — only null means none.
    expect(readingPositionOf({ readingPage: 3, readingOffset: 0 })).toEqual({
      page: 3,
      offset: 0,
    })
    expect(
      readingPositionOf({ readingPage: null, readingOffset: null }),
    ).toBeNull()
    expect(
      readingPositionOf({ readingPage: 4, readingOffset: null }),
    ).toBeNull()
  })
})
