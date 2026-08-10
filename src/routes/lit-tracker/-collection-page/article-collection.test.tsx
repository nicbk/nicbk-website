import { act, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    status: 'reading',
  },
  {
    id: '2',
    title: 'A Mathematical Theory of Communication',
    authors: [{ name: 'Claude Shannon' }],
    publicationYear: 1948,
    venue: 'Bell System Technical Journal',
    status: 'read',
  },
]

/** A collection of `count` distinct articles, for the reveal tests. */
function manyArticles(count: number): CollectionArticle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `long-${index}`,
    title: `Paper number ${index}`,
    authors: [{ name: 'A. Researcher' }],
    publicationYear: 2020,
    venue: null,
    status: 'pending' as const,
  }))
}

/** The collection with everything it needs, so a test names only its subject. */
function renderCollection(
  overrides: Partial<ComponentProps<typeof ArticleCollection>>,
) {
  return render(collection(overrides))
}

/** The same element, for a `rerender` that changes one prop. */
function collection(
  overrides: Partial<ComponentProps<typeof ArticleCollection>>,
) {
  return (
    <ArticleCollection
      articles={[]}
      state="ready"
      filtered={false}
      allTags={[]}
      tagsByArticle={new Map()}
      onSetStatus={vi.fn()}
      onToggleTag={vi.fn()}
      onCreateTag={vi.fn()}
      {...overrides}
    />
  )
}

/** How many cards are actually drawn. */
function drawnCards() {
  return screen.queryAllByRole('article').length
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ArticleCollection', () => {
  it('renders one card per article', () => {
    renderCollection({ articles: ARTICLES })

    const cells = within(
      screen.getByRole('list', { name: 'Articles' }),
    ).getAllByRole('listitem')

    // One list item per card, plus the chips inside each — so the cards are
    // picked out by the grid list they are the direct children of.
    expect(cells[0]).toHaveTextContent('Attention Is All You Need')
    expect(cells[0]).toHaveTextContent('Ashish Vaswani, Noam Shazeer')
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(
      screen.getByText('A Mathematical Theory of Communication'),
    ).toBeInTheDocument()
  })

  it('gives each card only its own tags', () => {
    // The join is done above this component, so what it has to get right is
    // handing the right list to the right card — the mistake that would
    // otherwise show every tag on every card.
    renderCollection({
      articles: ARTICLES,
      allTags: [{ id: 'tag-1', name: 'attention' }],
      tagsByArticle: new Map([['1', [{ id: 'tag-1', name: 'attention' }]]]),
    })

    const [first, second] = screen.getAllByRole('article')
    expect(first).toHaveTextContent('attention')
    expect(second).not.toHaveTextContent('attention')
  })

  it('shows plain inline text when the collection is empty', () => {
    renderCollection({ articles: [] })

    expect(screen.getByText(EMPTY_COLLECTION_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('shows the placeholder — not the empty state — while still syncing', () => {
    // The distinction that matters most on this surface: an account whose data
    // has not arrived and an account with nothing in it are the same empty
    // array, and saying "no articles yet" during the first sync is a lie that
    // looks exactly like data loss.
    renderCollection({ articles: [], state: 'syncing' })

    expect(screen.getByRole('status')).toHaveTextContent(
      TRACKER_LOADING_MESSAGE,
    )
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })

  it('announces a failed query instead of rendering it as an empty collection', () => {
    renderCollection({ articles: [], state: 'error' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      COLLECTION_ERROR_MESSAGE,
    )
    expect(screen.queryByText(EMPTY_COLLECTION_MESSAGE)).toBeNull()
  })

  describe('incremental reveal', () => {
    it('draws the first batch of a long collection, not all of it', () => {
      // Revealing, not fetching: every row is already on the client. What this
      // limits is how much is drawn at once.
      renderCollection({ articles: manyArticles(30) })

      expect(drawnCards()).toBe(12)
    })

    it('draws a short collection whole, with no sentinel to scroll to', () => {
      renderCollection({ articles: manyArticles(5) })

      expect(drawnCards()).toBe(5)
    })

    it('reveals the filtered set, so narrowing strands nothing', () => {
      /*
       * The assertion that makes reveal and search compose. `articles` arrives
       * already narrowed, so a collection filtered from thirty down to three
       * shows all three — rather than three of a batch of twelve counted
       * against the unfiltered list, with the rest behind a sentinel that can
       * never intersect.
       */
      const { rerender } = renderCollection({ articles: manyArticles(30) })
      expect(drawnCards()).toBe(12)

      rerender(collection({ articles: manyArticles(30).slice(0, 3) }))

      expect(drawnCards()).toBe(3)
    })
  })

  describe('the announced count', () => {
    it('reports how many matched, not how many are drawn', () => {
      // "12 articles" under a search that found thirty would be wrong in the one
      // way a reader listening to it cannot check.
      renderCollection({ articles: manyArticles(30) })

      expect(screen.getByRole('status')).toHaveTextContent('30 articles')
      expect(drawnCards()).toBe(12)
    })

    it('is singular for one article', () => {
      renderCollection({ articles: manyArticles(1) })

      expect(screen.getByRole('status')).toHaveTextContent('1 article')
    })

    it('waits for the count to settle before changing what it says', () => {
      /*
       * A polite region fed the live count announces once per keystroke while
       * someone is still typing — talking over them instead of telling them
       * where they landed. The grid beneath it is not debounced and must never
       * be: the cards update on the keystroke, the announcement waits.
       */
      vi.useFakeTimers()
      const { rerender } = renderCollection({ articles: manyArticles(30) })

      rerender(collection({ articles: manyArticles(9) }))
      expect(drawnCards()).toBe(9)
      expect(screen.getByRole('status')).toHaveTextContent('30 articles')

      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(screen.getByRole('status')).toHaveTextContent('9 articles')
    })
  })
})
