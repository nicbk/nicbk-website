import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * The article sidebar as it sits in the shell rail.
 *
 * The sidebar's own behaviour is `article-sidebar.test.tsx`'s; what this file
 * covers is the wrapper around it, which is entirely about landmarks — the part
 * a screen-reader user meets and no other test would notice was wrong.
 */

const ArticleSidebar = vi.hoisted(() =>
  vi.fn(({ articleId }: { articleId: string }) => articleId),
)
vi.mock('./article-sidebar', () => ({ ArticleSidebar }))

const { ArticleRail } = await import('./article-rail')

describe('ArticleRail', () => {
  it('names a complementary landmark rather than a navigation one', () => {
    // `<aside>`, not the filter rail's `<nav>`: nothing in here navigates. These
    // are controls and a text field about the page you are already on.
    render(<ArticleRail articleId="article-1" label="article" />)

    expect(
      screen.getByRole('complementary', { name: 'article' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('passes the article through to the sidebar', () => {
    render(<ArticleRail articleId="article-42" label="article" />)

    expect(screen.getByText('article-42')).toBeInTheDocument()
  })
})
