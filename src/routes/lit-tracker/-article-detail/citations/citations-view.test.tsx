import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CitationEdge, CitationLists } from './citation-lists'
import { citationLists } from './citation-lists'

/**
 * What the citations view draws from its lists: the two tabs and their counts,
 * the groups inside "cites", what each row says and where it goes, and the
 * notices. The lists' own rules are `citation-lists.test.ts`'s.
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

/** The paper whose citations are on screen — the step a followed link records. */
const OPEN_PAPER = 'article-attention'

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

let next = 0
function edge(fields: Partial<CitationEdge>): CitationEdge {
  next += 1
  return {
    id: `edge-${next}`,
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
      articleId={OPEN_PAPER}
      state="ready"
      lists={LISTS}
      {...overrides}
    />,
  )
}

describe('CitationsView', () => {
  it('has two tabs, the paper’s two directions, each with its count', () => {
    renderView()

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'cites 3',
      'cited by 1',
    ])
  })

  it('shows no counts until the lists have arrived', () => {
    renderView({ state: 'syncing' })

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'cites ',
      'cited by ',
    ])
    expect(screen.getByText('loading…')).toBeInTheDocument()
  })

  it('opens on what it cites: papers in the collection first, then the rest', () => {
    renderView()

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'in your collection · 1',
      'elsewhere · 2',
    ])
  })

  it('links a paper in the collection to its reader', () => {
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
      via: [OPEN_PAPER],
    })
  })

  it('records the paper being left on the way back', () => {
    renderView()

    const props = linkProps.mock.calls.at(-1)?.[0]

    expect(props.search({ via: ['article-roberta'] }).via).toEqual([
      'article-roberta',
      OPEN_PAPER,
    ])
  })

  it('cuts the path back when the paper opened is already on it', () => {
    renderView()

    // The link is BERT's, and BERT is where this journey began: opening it
    // again is the way back to it, not a fourth step.
    const props = linkProps.mock.calls.at(-1)?.[0]

    expect(
      props.search({ via: ['article-bert', 'article-roberta'] }).via,
    ).toBeUndefined()
  })

  it('lists what cites it', async () => {
    renderView()

    await userEvent.click(screen.getByRole('tab', { name: /cited by/ }))

    expect(screen.getByRole('link', { name: /Few-Shot/ })).toHaveAttribute(
      'href',
      '/lit-tracker/article-gpt',
    )
  })

  it('links a reference elsewhere to Semantic Scholar in a new tab, as printed', () => {
    renderView()

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

  it('shows a reference with no id as text, not a link', () => {
    renderView()

    const list = screen.getByRole('list', { name: 'cites, elsewhere' })
    const plain = within(list).getByText('Grammar as a foreign language')
    expect(plain.closest('a')).toBeNull()
    expect(within(list).getByText('Oriol Vinyals · 2015')).toBeInTheDocument()
  })

  it('says the bibliography was not read, rather than showing an empty list', () => {
    renderView({ lists: citationLists([], []) })

    expect(
      screen.getByText('its bibliography was not read.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('says it cites nothing else in the collection, over the rest', () => {
    renderView({ lists: citationLists([edge({ title: 'Adam' })], []) })

    expect(
      screen.getByText('it cites nothing else in your collection.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /in your collection/ }),
    ).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'elsewhere · 1' }),
    ).toBeInTheDocument()
  })

  it('says when nothing in the collection cites it', async () => {
    renderView({ lists: citationLists([edge({})], []) })

    await userEvent.click(screen.getByRole('tab', { name: /cited by/ }))

    expect(
      screen.getByText('nothing in your collection cites it.'),
    ).toBeInTheDocument()
  })

  it('compares nothing against Semantic Scholar’s reference count', () => {
    // "40 of 41 references read" claimed a loss that had not happened: the
    // count disagreed with the printed bibliography (user-decided to drop).
    renderView()

    expect(screen.queryByText(/references read/)).toBeNull()
    // And no credit line: that lives in the header's credits now.
    expect(screen.queryByText(/data from/)).toBeNull()
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

/**
 * The row's own spacing, which only a stylesheet expresses.
 *
 * Comments are stripped before matching, so a comment naming a property cannot
 * satisfy an assertion looking for it (the upload modal's tests explain why).
 */
const VIEW_CSS = readFileSync(
  join(__dirname, 'citations-view.module.css'),
  'utf8',
)

/** The narrow tier's declarations, with comments stripped. */
function narrowTier(): string {
  const css = VIEW_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  const tier = css.match(/@media \(max-width: 768px\) \{[\s\S]*?\n\}/)?.[0]
  if (!tier) {
    throw new Error('No narrow-tier rule in the stylesheet.')
  }
  return tier
}

describe('the citations row’s spacing', () => {
  it('takes the gap for itself only where no sidebar sits beside it', () => {
    /*
     * On a desktop this row is held to a tab's height so its rule meets the
     * sidebar's — measured at 0px apart, from an earlier report, and that must
     * not change. Below the breakpoint the sidebar is a sheet, so there is
     * nothing to meet, and the row gains that sheet's *bordered* trigger: the
     * clearance that was invisible under a borderless glyph became a box
     * sitting 2.2px off the line with 16px of air above it.
     *
     * The rule is declared for the narrow tier alone, and that tier is the one
     * the sidebar itself disappears at.
     */
    const narrow = narrowTier()

    expect(narrow).toMatch(/margin-top:\s*calc\(-1 \* var\(--space-lg\)\)/)
  })

  it('grows the row from the tabs, so the words stay on the controls’ line', () => {
    /*
     * The regression this row exists to prevent. A `min-height` on the row was
     * the first attempt: `.tabs` is `align-self: stretch` so a selected tab's
     * underline lands on the rule, and a stretched tab holds its text at its
     * own top — so the row grew, the buttons centred, and "cites" and "cited
     * by" stayed up by the header (user-reported).
     *
     * Padding on the tab grows the same row with the text between equal
     * amounts of space, and the underline still the tab's own bottom edge.
     */
    const narrow = narrowTier()

    expect(narrow).toMatch(/\.tab\s*\{[^}]*padding-block:/)
    expect(narrow).not.toMatch(/min-height:/)
  })
})
