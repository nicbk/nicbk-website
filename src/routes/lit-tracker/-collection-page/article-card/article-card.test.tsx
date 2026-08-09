import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UNKNOWN_AUTHORS } from '../authors'
import type { CollectionArticle } from './article-card'
import { ArticleCard } from './article-card'
import type { CollectionTag } from './article-menu/article-menu'

/**
 * The card against the shapes real articles actually take.
 *
 * The sparse cases are not hypothetical: most of this collection is preprints,
 * which have no venue, and the extract stage creates an article row even when
 * GROBID finds nothing at all. What a card does with a missing field is
 * therefore ordinary behavior, not an edge case.
 *
 * The menu's own behaviour is asserted next door in `article-menu.test.tsx`;
 * what this file cares about is that the card renders one, names it after the
 * article, and passes what it is given through.
 */

const ATTENTION_TAG: CollectionTag = { id: 'tag-1', name: 'attention' }
const SURVEY_TAG: CollectionTag = { id: 'tag-2', name: 'survey' }

function articleWith(
  overrides: Partial<CollectionArticle> = {},
): CollectionArticle {
  return {
    id: '018f5b6c-0000-7000-8000-000000000001',
    title: 'Attention Is All You Need',
    authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
    publicationYear: 2017,
    venue: 'Advances in Neural Information Processing Systems',
    status: 'pending',
    ...overrides,
  }
}

/** The card with everything it needs, so a test only names what it is about. */
function renderCard({
  article = articleWith(),
  tags = [],
  allTags = tags,
  ...handlers
}: {
  article?: CollectionArticle
  tags?: readonly CollectionTag[]
  allTags?: readonly CollectionTag[]
  onSetStatus?: (status: string) => void
  onToggleTag?: (tagId: string, applied: boolean) => void
  onCreateTag?: (name: string) => void
} = {}) {
  return render(
    <ArticleCard
      article={article}
      tags={tags}
      allTags={allTags}
      onSetStatus={handlers.onSetStatus ?? vi.fn()}
      onToggleTag={handlers.onToggleTag ?? vi.fn()}
      onCreateTag={handlers.onCreateTag ?? vi.fn()}
    />,
  )
}

describe('ArticleCard', () => {
  it('shows the title, authors, year, and venue', () => {
    renderCard()

    expect(
      screen.getByRole('heading', { name: 'Attention Is All You Need' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ashish Vaswani, Noam Shazeer')).toBeInTheDocument()
    expect(
      screen.getByText(
        '2017, Advances in Neural Information Processing Systems',
      ),
    ).toBeInTheDocument()
  })

  it('abbreviates three or more authors', () => {
    renderCard({
      article: articleWith({
        authors: [
          { name: 'Ashish Vaswani' },
          { name: 'Noam Shazeer' },
          { name: 'Niki Parmar' },
        ],
      }),
    })

    expect(screen.getByText('Ashish Vaswani et al.')).toBeInTheDocument()
    expect(screen.queryByText(/Niki Parmar/)).toBeNull()
  })

  it('says the authors are unknown rather than leaving a gap', () => {
    // The failed-extraction case: the article row exists with an empty author
    // list, and a blank line where a name belongs reads as a rendering bug.
    renderCard({ article: articleWith({ authors: [] }) })

    expect(screen.getByText(UNKNOWN_AUTHORS)).toBeInTheDocument()
  })

  it('draws no publication line at all for a preprint with no venue and no year', () => {
    renderCard({
      article: articleWith({ publicationYear: null, venue: null }),
    })

    expect(screen.getByRole('heading')).toBeInTheDocument()
    // Not merely "no venue text": the whole line is absent, so there is no empty
    // row holding space open under the authors. Asserted by its absence rather
    // than against the card's whole text, which now also carries chips.
    expect(screen.queryByText(/2017/)).toBeNull()
    expect(screen.queryByText(/Advances in Neural/)).toBeNull()
  })

  it('drops the comma when only one of year and venue is known', () => {
    renderCard({ article: articleWith({ venue: null }) })
    expect(screen.getByText('2017')).toBeInTheDocument()

    renderCard({ article: articleWith({ publicationYear: null }) })
    expect(
      screen.getByText('Advances in Neural Information Processing Systems'),
    ).toBeInTheDocument()
  })

  it('shows this article’s tags, and its status as an icon beside them', () => {
    renderCard({
      article: articleWith({ status: 'reading' }),
      tags: [ATTENTION_TAG, SURVEY_TAG],
    })

    expect(
      screen.getAllByRole('listitem').map((chip) => chip.textContent),
    ).toEqual(['attention', 'survey'])
    // Status is deliberately not a chip: it is an icon with a name, so it reads
    // as secondary to the title rather than competing with it.
    expect(screen.getByRole('img')).toHaveAccessibleName('status: reading')
  })

  it('shows the status even on an article with no tags at all', () => {
    // `pending` is the commonest state on this page — every freshly uploaded
    // paper is one — so it is the one that must not be the invisible one.
    renderCard({ tags: [] })

    expect(screen.getByRole('img')).toHaveAccessibleName('status: pending')
    // And no empty tag row, which would be a tab stop leading nowhere.
    expect(screen.queryByRole('list', { name: 'tags' })).toBeNull()
  })

  it('treats a missing status as pending', () => {
    // Zero types a defaulted column as optional even though Postgres never
    // stores null there. The card must not render an icon meaning nothing.
    renderCard({ article: articleWith({ status: null }) })

    expect(screen.getByRole('img')).toHaveAccessibleName('status: pending')
  })

  it('names the status in a tooltip for a reader who can see the icon', async () => {
    // The icon carries its meaning in an `aria-label`, which a screen reader
    // reads and a sighted reader cannot. The tooltip is the other half of that:
    // the text exists nowhere on the page until the pointer arrives, which is
    // why this counts one occurrence rather than a second copy of rendered text.
    const user = userEvent.setup()
    renderCard({ article: articleWith({ status: 'read' }) })
    expect(screen.queryAllByText('status: read')).toHaveLength(0)

    await user.hover(screen.getByRole('img'))

    await waitFor(
      () => {
        expect(screen.getAllByText('status: read')).toHaveLength(1)
      },
      { timeout: 3000 },
    )
  })

  it('reveals the full text of an elided line on hover', async () => {
    // Every line on the card is clamped, because the card is one cell of a
    // uniform grid, so a long title is cut off visually. The clamping is CSS —
    // the whole string stays in the DOM and in the accessibility tree either
    // way — which is why this asserts the text appears a *second* time rather
    // than asserting a description a screen reader would read: the tooltip
    // exists for the reader who can see the ellipsis.
    const user = userEvent.setup()
    renderCard()

    await user.hover(screen.getByRole('heading'))

    await waitFor(
      () => {
        expect(screen.getAllByText('Attention Is All You Need')).toHaveLength(2)
      },
      // Base UI waits 600ms before opening — the "I paused to read this"
      // threshold, rather than a tooltip on every pointer sweep across a grid.
      { timeout: 3000 },
    )
  })

  it('names its menu after the article, so twenty cards do not all say “options”', () => {
    renderCard()

    expect(
      screen.getByRole('button', {
        name: 'Options for Attention Is All You Need',
      }),
    ).toBeInTheDocument()
  })

  it('offers every tag the reader has in the menu, not only this card’s', async () => {
    const user = userEvent.setup()
    renderCard({ tags: [ATTENTION_TAG], allTags: [ATTENTION_TAG, SURVEY_TAG] })

    await user.click(screen.getByRole('button', { name: /Options for/ }))

    const popup = await screen.findByRole('dialog')
    expect(
      within(popup).getByRole('checkbox', { name: /attention/ }),
    ).toBeChecked()
    expect(
      within(popup).getByRole('checkbox', { name: /survey/ }),
    ).not.toBeChecked()
  })

  it('is not a link, and its only control is the menu', () => {
    // #9 owns navigation to the article detail page. Until it exists, a card
    // that looks clickable and does nothing is worse than one that plainly is
    // not — so the corner menu is the only thing here to activate, and the tag
    // chips are labels rather than a tab stop each.
    renderCard({ tags: [ATTENTION_TAG, SURVEY_TAG] })

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
