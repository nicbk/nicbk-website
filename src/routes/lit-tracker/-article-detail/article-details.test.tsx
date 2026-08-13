import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ArticleDetails } from './article-details'
import { formatPublication } from './detail-article'

/**
 * What the paper is, at the top of its menu.
 *
 * These three lines used to be a header above the reader. They moved here when
 * the row was reclaimed for the document (user-decided 2026-08-13), which makes
 * this the only surface that shows them — so what it omits, it omits for good.
 */

const ARTICLE = {
  id: '018f5b6c-0000-7000-8000-000000000001',
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
  publicationYear: 2017,
  venue: 'Advances in Neural Information Processing Systems',
  status: 'reading' as const,
  notes: null,
}

describe('formatPublication', () => {
  it('joins the year and the venue', () => {
    expect(formatPublication(2017, 'NeurIPS')).toBe('2017, NeurIPS')
  })

  it('keeps whichever one exists', () => {
    // A preprint has no venue; a scanned document can lose its year.
    expect(formatPublication(2017, null)).toBe('2017')
    expect(formatPublication(null, 'NeurIPS')).toBe('NeurIPS')
  })

  it('treats an empty venue as no venue, not as an empty half', () => {
    expect(formatPublication(2017, '')).toBe('2017')
  })

  it('is nothing at all when neither exists', () => {
    // `null` rather than an empty string, so the caller omits the line instead
    // of drawing a blank one.
    expect(formatPublication(null, null)).toBeNull()
  })
})

describe('ArticleDetails', () => {
  it('shows the title, the authors, and the publication', () => {
    render(<ArticleDetails article={ARTICLE} />)

    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
    expect(screen.getByText(/Ashish Vaswani/)).toBeInTheDocument()
    expect(screen.getByText(/2017, Advances in Neural/)).toBeInTheDocument()
  })

  it('repeats the title on purpose, in full', () => {
    // The header ellipsises it — it has a row to share — so this is the one
    // place a long paper title can be read without hovering for a tooltip.
    render(<ArticleDetails article={ARTICLE} />)

    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
  })

  it('does not add a second heading to the page', () => {
    // The page's one <h1> lives in <main> for the focus handoff.
    render(<ArticleDetails article={ARTICLE} />)

    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('omits the publication line rather than leaving a gap', () => {
    render(
      <ArticleDetails
        article={{ ...ARTICLE, publicationYear: null, venue: null }}
      />,
    )

    expect(screen.queryByText(/2017/)).toBeNull()
    expect(screen.queryByText(',')).toBeNull()
  })
})
