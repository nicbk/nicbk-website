import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CitationEdge, CitationLists } from './citation-lists'
import { citationLists } from './citation-lists'

/**
 * What the citations view draws from its lists: the tabs and counts, what each
 * row says and where it goes, the notices, and the credit. The lists' own rules
 * are `citation-lists.test.ts`'s.
 */

/** The router's `Link`, as the attributes it would render with. */
const linkProps = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react')
  return {
    Link: (props: {
      to: string
      params: { articleId: string }
      search: (previous: Record<string, unknown>) => Record<string, unknown>
      className?: string
      children: ReactNode
    }) => {
      linkProps(props)
      return createElement(
        'a',
        { href: `/lit-tracker/${props.params.articleId}` },
        props.children,
      )
    },
  }
})

const { CitationsView } = await import('./citations-view')

const BERT = {
  id: 'article-bert',
  title: 'BERT',
  authors: [{ name: 'Jacob Devlin' }, { name: 'Ming-Wei Chang' }],
  publicationYear: 2019,
}
const GPT = {
  id: 'article-gpt',
  title: 'Language Models are Few-Shot Learners',
  authors: [{ name: 'Tom Brown' }],
  publicationYear: 2020,
}

function edge(fields: Partial<CitationEdge>): CitationEdge {
  return {
    id: `edge-${Math.random()}`,
    title: 'untitled',
    authors: [],
    publicationYear: null,
    semanticScholarId: null,
    rawText: null,
    ...fields,
  }
}

const LISTS: CitationLists = citationLists(
  [
    edge({ citedArticle: BERT }),
    edge({
      rawText: 'D. Bahdanau. Neural machine translation. 2014.',
      semanticScholarId: 'fa72afa9',
    }),
    edge({
      title: 'Grammar as a foreign language',
      authors: [{ name: 'Oriol Vinyals' }],
      publicationYear: 2015,
    }),
  ],
  [edge({ citingArticle: GPT })],
)

function renderView(
  overrides: Partial<Parameters<typeof CitationsView>[0]> = {},
) {
  return render(
    <CitationsView
      state="ready"
      lists={LISTS}
      referenceCount={null}
      {...overrides}
    />,
  )
}

describe('CitationsView', () => {
  it('has three tabs, each named with its count at every width', () => {
    // The narrow panel draws a glyph and a short word instead of the full
    // label (a container query jsdom cannot exercise), so the name must not
    // depend on which words are drawn.
    renderView()

    expect(
      screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label')),
    ).toEqual([
      'in your collection 1',
      'cited by 1',
      'not in your collection 2',
    ])
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'in your collectioncollection1',
      'cited bycited by1',
      'not in your collectionelsewhere2',
    ])
  })

  it('shows no counts until the lists have arrived', () => {
    renderView({ state: 'syncing' })

    expect(
      screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label')),
    ).toEqual(['in your collection', 'cited by', 'not in your collection'])
    expect(screen.getByText('loading…')).toBeInTheDocument()
  })

  it('opens on the papers in the collection, each a link to its reader', () => {
    renderView()

    const link = screen.getByRole('link', { name: /BERT/ })
    expect(link).toHaveAttribute('href', '/lit-tracker/article-bert')
    expect(link).toHaveTextContent('Jacob Devlin, Ming-Wei Chang · 2019')
  })

  it('drops the view when opening a paper, and keeps the rest of the search', () => {
    renderView()

    const props = linkProps.mock.calls.at(-1)?.[0]
    expect(props.to).toBe('/lit-tracker/$articleId')
    expect(props.search({ q: 'attention', view: 'citations' })).toEqual({
      q: 'attention',
      view: undefined,
    })
  })

  it('lists what cites it', async () => {
    renderView()

    await userEvent.click(screen.getByRole('tab', { name: /cited by/ }))

    expect(screen.getByRole('link', { name: /Few-Shot/ })).toHaveAttribute(
      'href',
      '/lit-tracker/article-gpt',
    )
  })

  it('links an outside reference to Semantic Scholar in a new tab, as printed', async () => {
    renderView()

    await userEvent.click(
      screen.getByRole('tab', { name: /not in your collection/ }),
    )

    const link = screen.getByRole('link', { name: /Bahdanau/ })
    expect(link).toHaveAttribute(
      'href',
      'https://www.semanticscholar.org/paper/fa72afa9',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleName(
      /Neural machine translation\. 2014\.\s*\(opens Semantic Scholar in a new tab\)/,
    )
  })

  it('shows a reference with no id as text, not a link', async () => {
    renderView()

    await userEvent.click(
      screen.getByRole('tab', { name: /not in your collection/ }),
    )

    const list = screen.getByRole('list', {
      name: 'cites, not in your collection',
    })
    const plain = within(list).getByText('Grammar as a foreign language')
    expect(plain.closest('a')).toBeNull()
    expect(within(list).getByText('Oriol Vinyals · 2015')).toBeInTheDocument()
  })

  it('says how many references were read of how many', () => {
    renderView({ referenceCount: 41 })

    expect(screen.getByText('3 of 41 references read.')).toBeInTheDocument()
  })

  it('says the bibliography was not read, rather than showing an empty list', () => {
    renderView({ lists: citationLists([], []) })

    expect(
      screen.getByText('its bibliography was not read.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('says it cites nothing else in the collection', () => {
    renderView({ lists: citationLists([edge({})], []) })

    expect(
      screen.getByText('it cites nothing else in your collection.'),
    ).toBeInTheDocument()
  })

  it('credits Semantic Scholar whichever tab is open', async () => {
    renderView()

    const credit = () => screen.getByRole('link', { name: 'Semantic Scholar' })
    expect(credit()).toHaveAttribute('href', 'https://www.semanticscholar.org')
    expect(credit()).toHaveAttribute('rel', 'noopener noreferrer')

    await userEvent.click(screen.getByRole('tab', { name: /cited by/ }))
    expect(credit()).toBeInTheDocument()
  })

  it('reports a failed query as its own state', () => {
    renderView({ state: 'error' })

    expect(screen.getByText(/could not load/)).toBeInTheDocument()
  })

  it('carries the page’s controls', () => {
    renderView({ actions: <button type="button">page menu</button> })

    expect(
      screen.getByRole('button', { name: 'page menu' }),
    ).toBeInTheDocument()
  })
})
