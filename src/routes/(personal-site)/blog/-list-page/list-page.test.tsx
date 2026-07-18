import { render, screen, within } from '@testing-library/react'
import { type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ListPage } from './list-page'
import { type PostListItem } from '~blog/posts'

// The list reads its filter state from the route's search params and renders row
// titles as router <Link>s. Mock both without a live router:
//  - `getRouteApi().useSearch` returns a per-test-controllable search state
//    (`mockState.search`), so tests can drive the query/tags the page filters by.
//  - `Link` becomes a plain anchor that substitutes the `$slug` param into `to`,
//    so we can assert the real post href.
const { mockState } = vi.hoisted(() => ({
  mockState: {
    search: { q: '', tags: [] as string[] },
    navigate: vi.fn(),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useSearch: () => mockState.search,
    useNavigate: () => mockState.navigate,
  }),
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params?: Record<string, string>
    children: ReactNode
    className?: string
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (path, [key, value]) => path.replace(`$${key}`, value),
      to,
    )
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  },
}))

beforeEach(() => {
  mockState.search = { q: '', tags: [] }
  mockState.navigate.mockClear()
})

function post(
  slug: string,
  overrides: Partial<PostListItem['frontmatter']> = {},
): PostListItem {
  return {
    slug,
    frontmatter: {
      title: `Title of ${slug}`,
      date: new Date('2026-06-15T00:00:00Z'),
      description: `Description of ${slug}`,
      tags: [],
      draft: false,
      ...overrides,
    },
  }
}

describe('ListPage', () => {
  it('renders the single main heading (focus-handoff target)', () => {
    render(<ListPage posts={[post('a')]} />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('blog')
  })

  it('renders one row per post: date, title link, description, inline tags', () => {
    render(
      <ListPage
        posts={[
          post('first', {
            title: 'First Post',
            date: new Date('2026-06-15T00:00:00Z'),
            description: 'The first description',
            tags: ['react', 'meta'],
          }),
        ]}
      />,
    )
    const list = screen.getByRole('list', { name: 'Blog posts' })
    const [firstItem] = within(list).getAllByRole('listitem')
    expect(firstItem).toBeDefined()
    const row = within(firstItem as HTMLElement)
    expect(row.getByText('2026-06-15')).toBeInTheDocument()
    expect(row.getByRole('link', { name: 'First Post' })).toHaveAttribute(
      'href',
      '/blog/first',
    )
    expect(row.getByText('The first description')).toBeInTheDocument()
    expect(row.getByText('react')).toBeInTheDocument()
    expect(row.getByText('meta')).toBeInTheDocument()
  })

  it('renders rows in the order given (list does not re-sort)', () => {
    render(<ListPage posts={[post('newer'), post('older')]} />)
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/blog/newer',
      '/blog/older',
    ])
  })

  it('shows the plain-text empty state when there are no posts', () => {
    render(<ListPage posts={[]} />)
    expect(screen.getByText('No posts yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Blog posts' })).toBeNull()
    // With no posts at all, the search/filter controls are not rendered.
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('renders the search field and tag filter when posts exist', () => {
    render(<ListPage posts={[post('a', { tags: ['react'] })]} />)
    expect(
      screen.getByRole('searchbox', { name: 'Search posts' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Filter by tag' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'react' })).toBeInTheDocument()
  })

  it('narrows the list to posts matching the active search query', () => {
    mockState.search = { q: 'hooks', tags: [] }
    render(
      <ListPage
        posts={[
          post('a', { title: 'Understanding hooks' }),
          post('b', { title: 'Type-safe schemas' }),
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/blog/a'])
  })

  it('narrows the list to posts carrying the selected tags', () => {
    mockState.search = { q: '', tags: ['react'] }
    render(
      <ListPage
        posts={[
          post('a', { tags: ['react', 'meta'] }),
          post('b', { tags: ['zod'] }),
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/blog/a'])
  })

  it('shows the no-match state (distinct wording) when the filter excludes every post', () => {
    mockState.search = { q: 'kubernetes', tags: [] }
    render(<ListPage posts={[post('a'), post('b')]} />)
    expect(screen.getByText('No posts match your search.')).toBeInTheDocument()
    expect(screen.queryByText('No posts yet.')).toBeNull()
    expect(screen.queryByRole('list', { name: 'Blog posts' })).toBeNull()
    // The controls remain so the reader can adjust or clear the filter.
    expect(
      screen.getByRole('searchbox', { name: 'Search posts' }),
    ).toBeInTheDocument()
  })
})
