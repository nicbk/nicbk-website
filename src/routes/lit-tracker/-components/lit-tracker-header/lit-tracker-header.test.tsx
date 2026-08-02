import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LitTrackerHeader } from './lit-tracker-header'

// TanStack Router's <Link> needs a live router; the decided unit-test pattern
// (research/testing-qa/test-runner-and-frameworks.md) mocks it to a plain
// anchor so the header renders in isolation.
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

const ACCOUNT = { email: 'nicbk@example.com' }

describe('LitTrackerHeader', () => {
  it('renders the app name as the tracker home link', () => {
    render(<LitTrackerHeader account={ACCOUNT} />)
    expect(
      screen.getByRole('link', { name: 'Literature Tracker' }),
    ).toHaveAttribute('href', '/lit-tracker')
  })

  it('shows the collection path with only its root segment, as a link back', () => {
    render(<LitTrackerHeader account={ACCOUNT} />)
    const path = screen.getByRole('navigation', { name: 'Collection path' })

    expect(path).toHaveTextContent('↳/nicbk_home')
    expect(
      within(path).getByRole('link', { name: 'nicbk_home' }),
    ).toHaveAttribute('href', '/lit-tracker')
    // One segment today. #9 grows it one per citation-graph hop, which is why
    // it is a list rather than a string.
    expect(within(path).getAllByRole('listitem')).toHaveLength(1)
  })

  it('carries the theme toggle at the far end, like the site header', () => {
    // Without it the tracker would be the one place on the site with no way to
    // change theme, since it does not use the site-wide header.
    render(<LitTrackerHeader account={ACCOUNT} />)

    const toggle = screen.getByRole('button', { name: 'Toggle theme' })
    expect(screen.getByRole('banner').lastElementChild).toBe(toggle)
  })

  it('carries no account control — that lives in the sidebar', () => {
    render(<LitTrackerHeader account={ACCOUNT} />)
    expect(
      screen.queryByRole('button', { name: 'Account settings' }),
    ).toBeNull()
  })
})
