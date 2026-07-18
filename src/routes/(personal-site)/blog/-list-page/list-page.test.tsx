import { render, screen, within } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ListPage } from './list-page'
import { type PostListItem } from '~blog/posts'

// Row titles are router <Link>s; mock to a plain anchor that substitutes the
// `$slug` param into the `to` template, so we can assert the real post href
// without a live router (the decided unit-test pattern).
vi.mock('@tanstack/react-router', () => ({
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
    const [firstItem] = screen.getAllByRole('listitem')
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
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
