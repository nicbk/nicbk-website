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

describe('LitTrackerHeader', () => {
  it('sends the app name to the tracker root', () => {
    render(<LitTrackerHeader />)
    expect(
      screen.getByRole('link', { name: 'Literature Tracker' }),
    ).toHaveAttribute('href', '/lit-tracker')
  })

  it('sends the path root to the personal site, not back to the tracker', () => {
    // The two links are not the same destination: `nicbk_home` is the root of
    // the path — the site this sub-application is hosted on — while the app
    // name is the tracker's own home.
    render(<LitTrackerHeader />)
    const path = screen.getByRole('navigation', { name: 'Breadcrumb' })

    expect(path).toHaveTextContent('↳/nicbk_home')
    expect(
      within(path).getByRole('link', { name: 'nicbk_home' }),
    ).toHaveAttribute('href', '/')
    // One segment today. #9 grows it one per citation-graph hop, which is why
    // it is a list rather than a string.
    expect(within(path).getAllByRole('listitem')).toHaveLength(1)
  })

  it('names the site owner, not whoever is signed in', () => {
    // `nicbk` is literal for every account — the header takes no account at
    // all, which is what makes that impossible to get wrong.
    render(<LitTrackerHeader />)
    expect(screen.getByRole('link', { name: 'nicbk_home' })).toBeInTheDocument()
  })

  it('groups the path and the theme toggle on the right, app name on the left', () => {
    render(<LitTrackerHeader />)
    const header = screen.getByRole('banner')

    expect(header.children[0]).toBe(
      screen.getByRole('link', { name: 'Literature Tracker' }),
    )
    expect(header.children[1]).toBe(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    )
    // Without the toggle here the tracker would be the one place on the site
    // with no way to change theme, since it does not use the site-wide header.
    expect(header.lastElementChild).toBe(
      screen.getByRole('button', { name: 'Toggle theme' }),
    )
  })

  it('carries no account control — that lives in the sidebar', () => {
    render(<LitTrackerHeader />)
    expect(
      screen.queryByRole('button', { name: 'Account settings' }),
    ).toBeNull()
  })
})
