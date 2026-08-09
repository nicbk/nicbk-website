import { describe, expect, it } from 'vitest'
import type { CollectionTag } from './article-card/article-menu/article-menu'
import { tagsByArticle } from './article-tags'

/**
 * The client-side join between the two synced lists.
 *
 * Worth its own tests because the interesting cases are all about *partial*
 * data, and partial data is the normal condition here rather than a fault: the
 * three queries land independently, so there is a real moment during the first
 * sync when join rows have arrived and their tags have not.
 */

const ATTENTION: CollectionTag = { id: 'tag-1', name: 'attention' }
const SURVEY: CollectionTag = { id: 'tag-2', name: 'survey' }
const THEORY: CollectionTag = { id: 'tag-3', name: 'theory' }

describe('tagsByArticle', () => {
  it('groups each article’s tags under its own id', () => {
    const result = tagsByArticle(
      [
        { articleId: 'a', tagId: ATTENTION.id },
        { articleId: 'b', tagId: SURVEY.id },
        { articleId: 'a', tagId: SURVEY.id },
      ],
      [ATTENTION, SURVEY],
    )

    expect(result.get('a')?.map((tag) => tag.name)).toEqual([
      'attention',
      'survey',
    ])
    expect(result.get('b')?.map((tag) => tag.name)).toEqual(['survey'])
  })

  it('keeps every article’s tags in one order, not in join-row order', () => {
    // The tag query sorts by name; join rows arrive in whatever order they were
    // written. Without the re-sort, the same tag would sit in a different
    // position on each card, which reads as randomness rather than as data.
    const result = tagsByArticle(
      [
        { articleId: 'a', tagId: THEORY.id },
        { articleId: 'a', tagId: ATTENTION.id },
        { articleId: 'b', tagId: ATTENTION.id },
        { articleId: 'b', tagId: THEORY.id },
      ],
      [ATTENTION, SURVEY, THEORY],
    )

    expect(result.get('a')?.map((tag) => tag.name)).toEqual([
      'attention',
      'theory',
    ])
    expect(result.get('b')?.map((tag) => tag.name)).toEqual([
      'attention',
      'theory',
    ])
  })

  it('skips a join row whose tag has not arrived yet', () => {
    // Not a defensive hypothetical: `tags.mine` and `articleTags.mine` are
    // separate subscriptions and settle independently. Rendering a chip with an
    // empty label for the gap between them would be a visible flicker of
    // nothing.
    const result = tagsByArticle(
      [
        { articleId: 'a', tagId: ATTENTION.id },
        { articleId: 'a', tagId: 'not-synced-yet' },
      ],
      [ATTENTION],
    )

    expect(result.get('a')).toEqual([ATTENTION])
  })

  it('leaves an untagged article out of the map entirely', () => {
    // The caller substitutes a shared empty list, so an article with no tags
    // costs no allocation per render.
    const result = tagsByArticle(
      [{ articleId: 'a', tagId: ATTENTION.id }],
      [ATTENTION],
    )

    expect(result.has('b')).toBe(false)
  })

  it('returns an empty map when nothing has synced', () => {
    expect(tagsByArticle([], []).size).toBe(0)
  })
})
