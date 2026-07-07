import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Render the layout outside a live router: createFileRoute becomes a
// passthrough, Outlet a sentinel standing in for page content, and Link a
// plain anchor (SiteHeader, rendered via SiteShell, needs it).
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Outlet: () => <div data-testid="outlet-content" />,
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

import { PersonalSiteLayout } from './route'

describe('PersonalSiteLayout (refactored onto SiteShell)', () => {
  it('still renders the site header and the focusable <main> landmark around page content', () => {
    render(<PersonalSiteLayout />)

    // Regression: the header is not lost in the move to SiteShell.
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Nicolás Kennedy' }),
    ).toBeInTheDocument()

    // The focusable <main> landmark is unchanged (same id + tabindex the skip
    // link and focus handoff target).
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')

    // Page content (the Outlet) renders inside the landmark.
    expect(main).toContainElement(screen.getByTestId('outlet-content'))
  })
})
