import { render, screen } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BlogPostPage } from './blog-post-page'
import Fixture from './fixture.mdx'
import { type Frontmatter } from '~blog/frontmatter-schema'

// The "back to blog list" link is a router <Link>; mock it to a plain anchor so
// the page renders without a live router (the decided unit-test pattern).
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const frontmatter: Frontmatter = {
  title: 'Fixture Post',
  date: new Date('2026-06-15T00:00:00Z'),
  description: 'A fixture post.',
  tags: ['alpha', 'beta'],
  draft: false,
}

describe('BlogPostPage', () => {
  it('renders the title as the single main heading (focus-handoff target)', () => {
    render(<BlogPostPage frontmatter={frontmatter} Content={Fixture} />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('Fixture Post')
  })

  it('shows the formatted date and the tags', () => {
    render(<BlogPostPage frontmatter={frontmatter} Content={Fixture} />)
    expect(screen.getByText('June 15, 2026')).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  it('shows an "updated" date only when present', () => {
    const { rerender } = render(
      <BlogPostPage frontmatter={frontmatter} Content={Fixture} />,
    )
    expect(screen.queryByText(/updated/)).toBeNull()
    rerender(
      <BlogPostPage
        frontmatter={{
          ...frontmatter,
          updated: new Date('2026-06-20T00:00:00Z'),
        }}
        Content={Fixture}
      />,
    )
    expect(screen.getByText(/updated/)).toBeInTheDocument()
    expect(screen.getByText('June 20, 2026')).toBeInTheDocument()
  })

  it('links back to the blog list', () => {
    render(<BlogPostPage frontmatter={frontmatter} Content={Fixture} />)
    expect(
      screen.getByRole('link', { name: /back to blog list/ }),
    ).toHaveAttribute('href', '/blog')
  })

  it('renders the compiled MDX body: code, a Callout, and an image with alt', () => {
    render(<BlogPostPage frontmatter={frontmatter} Content={Fixture} />)
    // Build-time-highlighted code (the token text survives highlighting).
    expect(screen.getByText(/answer/)).toBeInTheDocument()
    // The global <Callout> resolved through the MDX provider.
    expect(screen.getByText('Tip')).toBeInTheDocument()
    expect(screen.getByText('A tip from the fixture.')).toBeInTheDocument()
    // The overridden <img> carries its alt text.
    expect(screen.getByAltText('A fixture image')).toBeInTheDocument()
  })
})
