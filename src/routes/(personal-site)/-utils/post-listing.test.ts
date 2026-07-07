import { describe, expect, it } from 'vitest'
import { excludeDrafts, sortByDateDesc } from './post-listing'
import { type PostListItem } from '~blog/posts'

/** Build a listing item with just the fields these transforms read. */
function item(slug: string, date: string, draft = false): PostListItem {
  return {
    slug,
    frontmatter: {
      title: slug,
      date: new Date(date),
      description: `${slug} description`,
      tags: [],
      draft,
    },
  }
}

describe('sortByDateDesc', () => {
  it('orders posts newest-first by frontmatter date', () => {
    const unsorted = [
      item('middle', '2026-03-01'),
      item('newest', '2026-06-01'),
      item('oldest', '2026-01-01'),
    ]
    expect(sortByDateDesc(unsorted).map((p) => p.slug)).toEqual([
      'newest',
      'middle',
      'oldest',
    ])
  })

  it('does not mutate its input', () => {
    const input = [item('a', '2026-01-01'), item('b', '2026-02-01')]
    const before = input.map((p) => p.slug)
    sortByDateDesc(input)
    expect(input.map((p) => p.slug)).toEqual(before)
  })
})

describe('excludeDrafts', () => {
  it('removes posts marked draft: true, keeps the rest', () => {
    const items = [
      item('published', '2026-01-01', false),
      item('wip', '2026-02-01', true),
    ]
    expect(excludeDrafts(items).map((p) => p.slug)).toEqual(['published'])
  })
})
