import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TRACKER_LOADING_MESSAGE } from '../-components/tracker-loading/tracker-loading'
import type { CollectionArticle } from './article-collection'
import {
  ArticleCollection,
  COLLECTION_ERROR_MESSAGE,
  EMPTY_COLLECTION_MESSAGE,
} from './article-collection'

/**
 * The collection surface with its query result injected, so this stays a
 * component test rather than a Zero test — what the query returns for a given
 * session is task 1's `/query` boundary and is covered against a real database
 * in src/zero/zero.integration.test.ts.
 */

const ARTICLES: CollectionArticle[] = [
  {
    id: '1',
    title: 'Attention Is All You Need',
    authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
    publicationYear: 2017,
    venue: 'Advances in Neural Information Processing Systems',
  },
  {
    id: '2',
    title: 'A Mathematical Theory of Communication',
    authors: [{ name: 'Claude Shannon' }],
    publicationYear: 1948,
    venue: 'Bell System Technical Journal',
  },
]

describe('ArticleCollection', () => {
  it('renders one card per article', () => {
    render(<ArticleCollection articles={ARTICLES} state="ready" />)

    const cells = within(
      screen.getByRole('list', { name: 'Articles' }),
    ).getAllByRole('listitem')

    expect(cells).toHaveLength(2)
    expect(cells[0]).toHaveTextContent('Attention Is All You Need')
    expect(cells[0]).toHaveTextContent('Ashish Vaswani, Noam Shazeer')
    expect(cells[1]).toHaveTextContent('A Mathematical Theory of Communication')
    expect(cells[1]).toHaveTextContent('Claude Shannon')
  })

  it('shows plain inline text when the collection is empty', () => {
    render(<ArticleCollection articles={[]} state="ready" />)

    expect(screen.getByText(EMPTY_COLLECTION_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('shows the placeholder — not the empty state — while still syncing', () => {
    // The distinction that matters most on this surface: an account whose data
    // has not arrived and an account with nothing in it are the same empty
    // array, and saying "no articles yet" during the first sync is a lie that
    // looks exactly like data loss.
    render(<ArticleCollection articles={[]} state="syncing" />)

    expect(screen.getByRole('status')).toHaveTextContent(
      TRACKER_LOADING_MESSAGE,
    )
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })

  it('announces a failed query instead of rendering it as an empty collection', () => {
    render(<ArticleCollection articles={[]} state="error" />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      COLLECTION_ERROR_MESSAGE,
    )
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })
})
