import { describe, expect, it } from 'vitest'
import type { CollectionTag } from '~/routes/lit-tracker/-components/article-menu/article-menu'
import { filterArticles } from './filter-articles'

/**
 * The one predicate behind both the filter rail and the search bar. Pure, so all
 * of this runs with no router, no Zero client, and no DOM.
 */

const TRANSFORMERS: CollectionTag = { id: 't1', name: 'transformers' }
const RLHF: CollectionTag = { id: 't2', name: 'rlhf' }

const ATTENTION = {
  id: 'a1',
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
  status: 'reading' as const,
}
const INSTRUCT = {
  id: 'a2',
  title: 'Training Language Models to Follow Instructions',
  authors: [{ name: 'Long Ouyang' }],
  status: 'read' as const,
}
const RESNET = {
  id: 'a3',
  title: 'Deep Residual Learning for Image Recognition',
  authors: [{ name: 'Kaiming He' }],
  status: 'pending' as const,
}

const ARTICLES = [ATTENTION, INSTRUCT, RESNET]

/** No filters at all — the value every "just this one clause" case starts from. */
const NOTHING = { query: '', tags: [], status: undefined }

/** Attention carries both tags; InstructGPT carries one; ResNet carries none. */
const TAGS_BY_ARTICLE = new Map<string, readonly CollectionTag[]>([
  ['a1', [TRANSFORMERS, RLHF]],
  ['a2', [RLHF]],
])

function ids(articles: readonly { id: string }[]) {
  return articles.map((article) => article.id)
}

describe('filterArticles', () => {
  describe('tags and status', () => {
    it('requires ALL selected tags, not any of them', () => {
      // The case worth writing first: with OR semantics this returns both
      // articles, and nothing about the page would look wrong until a reader
      // selected a second tag.
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        tags: ['transformers', 'rlhf'],
      })

      expect(ids(result)).toEqual(['a1'])
    })

    it('keeps everything when nothing is selected', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, NOTHING)

      expect(result).toEqual(ARTICLES)
    })

    it('filters on the status column', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        status: 'read',
      })

      expect(ids(result)).toEqual(['a2'])
    })

    it('composes tags with status', () => {
      // `rlhf` alone keeps a1 and a2; adding `reading` leaves only a1.
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        tags: ['rlhf'],
        status: 'reading',
      })

      expect(ids(result)).toEqual(['a1'])
    })

    it('treats an article with no status as pending', () => {
      // Zero types a defaulted column as nullable even though Postgres is `not
      // null`, and the card reads a missing value the same way. A row that fell
      // out of every status filter would be invisible with no way to find it.
      const unwritten = { ...RESNET, id: 'a4', status: null }

      const result = filterArticles([unwritten], new Map(), {
        ...NOTHING,
        status: 'pending',
      })

      expect(ids(result)).toEqual(['a4'])
    })

    it('matches tag names case-insensitively', () => {
      // The URL is shareable and hand-editable, and "RLHF" is the same label to
      // the person who typed it.
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        tags: ['RLHF'],
      })

      expect(ids(result)).toEqual(['a1', 'a2'])
    })

    it('matches nothing for a tag nobody has, rather than throwing', () => {
      // A stale or hand-edited link degrades to "no articles match".
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        tags: ['deleted-tag'],
      })

      expect(result).toEqual([])
    })

    it('preserves the order it was given', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        tags: ['rlhf'],
      })

      expect(ids(result)).toEqual(['a1', 'a2'])
    })
  })

  describe('the search text', () => {
    it('matches the title', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        query: 'residual',
      })

      expect(ids(result)).toEqual(['a3'])
    })

    it("matches an author's name, including one who is not first", () => {
      // Not just the first author: the card shows "Vaswani et al." and the
      // reader may well be looking for the person the card is not naming.
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        query: 'shazeer',
      })

      expect(ids(result)).toEqual(['a1'])
    })

    it('matches a tag name', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        query: 'transformers',
      })

      expect(ids(result)).toEqual(['a1'])
    })

    it('matches the reading status', () => {
      // Statuses are searchable because the decided model presents them as tags
      // — a reader typing "pending" is asking the same question as pressing the
      // rail's `pending` toggle.
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        query: 'pending',
      })

      expect(ids(result)).toEqual(['a3'])
    })

    it('matches case-insensitively and ignores surrounding whitespace', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        query: '  ATTENTION ',
      })

      expect(ids(result)).toEqual(['a1'])
    })

    it('keeps everything for a whitespace-only query', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        query: '   ',
      })

      expect(result).toEqual(ARTICLES)
    })

    it('returns nothing when the query matches nothing', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        query: 'photosynthesis',
      })

      expect(result).toEqual([])
    })

    it('does not match an article on a field it does not have', () => {
      // The mistake this guards: building the haystack by joining fields
      // straight into a string turns an absent one into `""` or, worse,
      // `"null"` — and then a search for "null" returns the whole collection
      // while a search for anything matches rows that carry none of it. An
      // article with no authors and no tags is searchable by its title only.
      const bare = {
        id: 'a5',
        title: 'A Scanned Preprint',
        authors: [],
        status: null,
      }

      expect(
        filterArticles([bare], new Map(), { ...NOTHING, query: 'preprint' }),
      ).toHaveLength(1)
      expect(
        filterArticles([bare], new Map(), { ...NOTHING, query: 'null' }),
      ).toHaveLength(0)
      expect(
        filterArticles([bare], new Map(), { ...NOTHING, query: 'vaswani' }),
      ).toHaveLength(0)
    })

    it('preserves the order it was given', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        ...NOTHING,
        query: 'e',
      })

      expect(ids(result)).toEqual(['a1', 'a2', 'a3'])
    })
  })

  describe('composition', () => {
    /*
     * The most important assertions in this file. Search and the rail are one
     * predicate rather than two filtering passes, and the difference is only
     * visible when the two disagree: a query that matches an article the rail
     * excludes must leave it hidden, and vice versa. Two passes in two
     * components can each be right on their own and still show the wrong grid.
     */

    it('hides an article the query matches but the tags exclude', () => {
      // "attention" finds a1 alone; `rlhf` keeps a1 and a2. The intersection is
      // a1 — but pointed the other way, at an article the query finds and the
      // tags do not:
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        query: 'residual', // a3, which carries no tags at all
        tags: ['rlhf'],
        status: undefined,
      })

      expect(result).toEqual([])
    })

    it('hides an article the query matches but the status excludes', () => {
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        query: 'attention', // a1, which is `reading`
        tags: [],
        status: 'read',
      })

      expect(result).toEqual([])
    })

    it('intersects all three at once', () => {
      // `rlhf` keeps a1 and a2; `reading` narrows that to a1; and the query has
      // to agree with what is left rather than reopening it.
      const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
        query: 'vaswani',
        tags: ['rlhf'],
        status: 'reading',
      })

      expect(ids(result)).toEqual(['a1'])
    })
  })
})
