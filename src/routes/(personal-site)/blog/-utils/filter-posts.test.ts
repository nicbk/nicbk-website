import { describe, expect, it } from 'vitest'
import { filterPosts } from './filter-posts'
import { type PostListItem } from '~blog/posts'

/** Build a listing item with the fields the filter reads. */
function item(
  slug: string,
  fields: { title?: string; description?: string; tags?: string[] } = {},
): PostListItem {
  return {
    slug,
    frontmatter: {
      title: fields.title ?? slug,
      date: new Date('2026-01-01'),
      description: fields.description ?? `${slug} description`,
      tags: fields.tags ?? [],
      draft: false,
    },
  }
}

const posts = [
  item('react-hooks', {
    title: 'Understanding React hooks',
    description: 'A deep dive into state.',
    tags: ['react', 'frontend'],
  }),
  item('zod-schemas', {
    title: 'Type-safe schemas',
    description: 'Validating data with Zod.',
    tags: ['typescript', 'zod'],
  }),
  item('react-testing', {
    title: 'Testing components',
    description: 'How to test a React app.',
    tags: ['react', 'testing'],
  }),
]

describe('filterPosts', () => {
  it('returns the full list, in order, when no filters are active', () => {
    expect(filterPosts(posts, { q: '', tags: [] }).map((p) => p.slug)).toEqual([
      'react-hooks',
      'zod-schemas',
      'react-testing',
    ])
  })

  it('treats a whitespace-only query as empty', () => {
    expect(filterPosts(posts, { q: '   ', tags: [] })).toHaveLength(3)
  })

  it('matches the query against the title', () => {
    expect(
      filterPosts(posts, { q: 'hooks', tags: [] }).map((p) => p.slug),
    ).toEqual(['react-hooks'])
  })

  it('matches the query against the description', () => {
    expect(
      filterPosts(posts, { q: 'validating', tags: [] }).map((p) => p.slug),
    ).toEqual(['zod-schemas'])
  })

  it('matches the query against tags', () => {
    expect(
      filterPosts(posts, { q: 'frontend', tags: [] }).map((p) => p.slug),
    ).toEqual(['react-hooks'])
  })

  it('matches case-insensitively', () => {
    expect(
      filterPosts(posts, { q: 'REACT', tags: [] }).map((p) => p.slug),
    ).toEqual(['react-hooks', 'react-testing'])
  })

  it('returns nothing when the query matches no post', () => {
    expect(filterPosts(posts, { q: 'kubernetes', tags: [] })).toEqual([])
  })

  it('filters to posts carrying a selected tag', () => {
    expect(
      filterPosts(posts, { q: '', tags: ['react'] }).map((p) => p.slug),
    ).toEqual(['react-hooks', 'react-testing'])
  })

  it('AND-composes multiple selected tags (post must carry all)', () => {
    expect(
      filterPosts(posts, { q: '', tags: ['react', 'testing'] }).map(
        (p) => p.slug,
      ),
    ).toEqual(['react-testing'])
  })

  it('combines query and tags with AND', () => {
    // "components" matches only react-testing's title; the react tag keeps it.
    expect(
      filterPosts(posts, { q: 'components', tags: ['react'] }).map(
        (p) => p.slug,
      ),
    ).toEqual(['react-testing'])
    // Same query but a tag the matching post lacks yields nothing.
    expect(filterPosts(posts, { q: 'components', tags: ['zod'] })).toEqual([])
  })

  it('preserves the input order among matches', () => {
    expect(
      filterPosts(posts, { q: 'react', tags: [] }).map((p) => p.slug),
    ).toEqual(['react-hooks', 'react-testing'])
  })

  it('does not mutate its input', () => {
    const before = posts.map((p) => p.slug)
    filterPosts(posts, { q: 'react', tags: ['react'] })
    expect(posts.map((p) => p.slug)).toEqual(before)
  })
})
