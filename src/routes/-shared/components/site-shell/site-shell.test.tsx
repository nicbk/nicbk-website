import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SiteShell } from './site-shell'

// SiteShell renders SiteHeader, whose <Link>s need a live router; the decided
// unit-test pattern (research/testing-qa/test-runner-and-frameworks.md) mocks
// Link to a plain anchor so the shell renders in isolation.
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

describe('SiteShell', () => {
  it('renders the site header and a focusable <main> landmark wrapping its children', () => {
    render(
      <SiteShell>
        <p>page content</p>
      </SiteShell>,
    )

    // The site header (a <header>, role "banner") is present.
    expect(screen.getByRole('banner')).toBeInTheDocument()

    // The <main> landmark carries the skip-link / focus-handoff id and is
    // programmatically focusable (tabIndex={-1}).
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')

    // Children render inside the landmark, not outside it.
    expect(main).toContainElement(screen.getByText('page content'))
  })
})
