import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SiteHeader } from './site-header'

// TanStack Router's <Link> needs a live router; the decided unit-test
// pattern (research/testing-qa/test-runner-and-frameworks.md) mocks it to
// a plain anchor so the header renders in isolation.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

describe('SiteHeader', () => {
  it('renders the site name linking to home', () => {
    render(<SiteHeader />)
    const siteName = screen.getByRole('link', { name: 'Nicolás Kennedy' })
    expect(siteName).toHaveAttribute('href', '/')
  })

  it('renders exactly the three nav links with correct destinations', () => {
    render(<SiteHeader />)
    const nav = screen.getByRole('navigation', { name: 'Site' })
    const links = within(nav).getAllByRole('link')
    expect(
      links.map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['projects', '/projects'],
      ['blog', '/blog'],
      ['about', '/about'],
    ])
  })

  it('has no active-page indication and no auth UI', () => {
    render(<SiteHeader />)
    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current')
    }
    expect(screen.queryByText(/sign in|log in|sign out|log out/i)).toBeNull()
  })
})
