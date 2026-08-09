import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UNKNOWN_AUTHORS } from '../authors'
import type { CollectionArticle } from './article-card'
import { ArticleCard } from './article-card'

/**
 * The card against the shapes real articles actually take.
 *
 * The sparse cases are not hypothetical: most of this collection is preprints,
 * which have no venue, and the extract stage creates an article row even when
 * GROBID finds nothing at all. What a card does with a missing field is
 * therefore ordinary behavior, not an edge case.
 */

function articleWith(
  overrides: Partial<CollectionArticle> = {},
): CollectionArticle {
  return {
    id: '018f5b6c-0000-7000-8000-000000000001',
    title: 'Attention Is All You Need',
    authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
    publicationYear: 2017,
    venue: 'Advances in Neural Information Processing Systems',
    ...overrides,
  }
}

describe('ArticleCard', () => {
  it('shows the title, authors, year, and venue', () => {
    render(<ArticleCard article={articleWith()} />)

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
    render(
      <ArticleCard
        article={articleWith({
          authors: [
            { name: 'Ashish Vaswani' },
            { name: 'Noam Shazeer' },
            { name: 'Niki Parmar' },
          ],
        })}
      />,
    )

    expect(screen.getByText('Ashish Vaswani et al.')).toBeInTheDocument()
    expect(screen.queryByText(/Niki Parmar/)).toBeNull()
  })

  it('says the authors are unknown rather than leaving a gap', () => {
    // The failed-extraction case: the article row exists with an empty author
    // list, and a blank line where a name belongs reads as a rendering bug.
    render(<ArticleCard article={articleWith({ authors: [] })} />)

    expect(screen.getByText(UNKNOWN_AUTHORS)).toBeInTheDocument()
  })

  it('draws nothing at all for a preprint with no venue and no year', () => {
    const { container } = render(
      <ArticleCard
        article={articleWith({ publicationYear: null, venue: null })}
      />,
    )

    expect(screen.getByRole('heading')).toBeInTheDocument()
    // Not merely "no venue text": the whole line is absent, so there is no empty
    // row holding space open under the authors.
    expect(container.textContent).toBe(
      'Attention Is All You NeedAshish Vaswani, Noam Shazeer',
    )
  })

  it('drops the comma when only one of year and venue is known', () => {
    render(<ArticleCard article={articleWith({ venue: null })} />)
    expect(screen.getByText('2017')).toBeInTheDocument()

    render(<ArticleCard article={articleWith({ publicationYear: null })} />)
    expect(
      screen.getByText('Advances in Neural Information Processing Systems'),
    ).toBeInTheDocument()
  })

  it('keeps the full text reachable on hover, since every line is elided', () => {
    // The card is one cell of a uniform grid, so text that does not fit is cut
    // off with an ellipsis. Without this the elided part would be readable
    // nowhere at all — and which strings actually overflow depends on the
    // rendered width, so it is set on all three rather than guessed at.
    const article = articleWith()
    render(<ArticleCard article={article} />)

    expect(screen.getByRole('heading')).toHaveAttribute('title', article.title)
    expect(screen.getByText('Ashish Vaswani, Noam Shazeer')).toHaveAttribute(
      'title',
      'Ashish Vaswani, Noam Shazeer',
    )
    expect(
      screen.getByText(
        '2017, Advances in Neural Information Processing Systems',
      ),
    ).toHaveAttribute(
      'title',
      '2017, Advances in Neural Information Processing Systems',
    )
  })

  it('is not a link', () => {
    // #9 owns navigation to the article detail page. Until it exists, a card
    // that looks clickable and does nothing is worse than one that plainly is
    // not — so there is nothing here for a pointer or a keyboard to activate.
    render(<ArticleCard article={articleWith()} />)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
