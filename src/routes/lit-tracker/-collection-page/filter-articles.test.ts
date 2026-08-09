import { describe, expect, it } from 'vitest'
import type { CollectionTag } from './article-card/article-menu/article-menu'
import { filterArticles } from './filter-articles'

/**
 * The predicate behind the filter rail. Pure, so all of this runs with no
 * router, no Zero client, and no DOM.
 */

const TRANSFORMERS: CollectionTag = { id: 't1', name: 'transformers' }
const RLHF: CollectionTag = { id: 't2', name: 'rlhf' }

const ATTENTION = { id: 'a1', status: 'reading' as const }
const INSTRUCT = { id: 'a2', status: 'read' as const }
const RESNET = { id: 'a3', status: 'pending' as const }

const ARTICLES = [ATTENTION, INSTRUCT, RESNET]

/** Attention carries both tags; InstructGPT carries one; ResNet carries none. */
const TAGS_BY_ARTICLE = new Map<string, readonly CollectionTag[]>([
  ['a1', [TRANSFORMERS, RLHF]],
  ['a2', [RLHF]],
])

function ids(articles: readonly { id: string }[]) {
  return articles.map((article) => article.id)
}

describe('filterArticles', () => {
  it('requires ALL selected tags, not any of them', () => {
    // The case worth writing first: with OR semantics this returns both
    // articles, and nothing about the page would look wrong until a reader
    // selected a second tag.
    const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
      tags: ['transformers', 'rlhf'],
      status: undefined,
    })

    expect(ids(result)).toEqual(['a1'])
  })

  it('keeps everything when nothing is selected', () => {
    const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
      tags: [],
      status: undefined,
    })

    expect(result).toEqual(ARTICLES)
  })

  it('filters on the status column', () => {
    const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
      tags: [],
      status: 'read',
    })

    expect(ids(result)).toEqual(['a2'])
  })

  it('composes tags with status', () => {
    // `rlhf` alone keeps a1 and a2; adding `reading` leaves only a1.
    const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
      tags: ['rlhf'],
      status: 'reading',
    })

    expect(ids(result)).toEqual(['a1'])
  })

  it('treats an article with no status as pending', () => {
    // Zero types a defaulted column as nullable even though Postgres is `not
    // null`, and the card reads a missing value the same way. A row that fell
    // out of every status filter would be invisible with no way to find it.
    const unwritten = { id: 'a4', status: null }

    const result = filterArticles([unwritten], new Map(), {
      tags: [],
      status: 'pending',
    })

    expect(ids(result)).toEqual(['a4'])
  })

  it('matches tag names case-insensitively', () => {
    // The URL is shareable and hand-editable, and "RLHF" is the same label to
    // the person who typed it.
    const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
      tags: ['RLHF'],
      status: undefined,
    })

    expect(ids(result)).toEqual(['a1', 'a2'])
  })

  it('matches nothing for a tag nobody has, rather than throwing', () => {
    // A stale or hand-edited link degrades to "no articles match".
    const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
      tags: ['deleted-tag'],
      status: undefined,
    })

    expect(result).toEqual([])
  })

  it('preserves the order it was given', () => {
    const result = filterArticles(ARTICLES, TAGS_BY_ARTICLE, {
      tags: ['rlhf'],
      status: undefined,
    })

    expect(ids(result)).toEqual(['a1', 'a2'])
  })
})
