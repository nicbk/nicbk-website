import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LitTrackerShell } from './lit-tracker-shell'

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

const ACCOUNT = { name: 'Nicolás Kennedy', email: 'nicbk@example.com' }

describe('LitTrackerShell', () => {
  it('renders the tracker header, not the site header', () => {
    render(
      <LitTrackerShell account={ACCOUNT}>
        <p>content</p>
      </LitTrackerShell>,
    )

    expect(
      screen.getByRole('link', { name: 'Literature Tracker' }),
    ).toBeInTheDocument()
    // The site header's nav has no place here — the tracker is its own
    // sub-application with its own chrome.
    expect(screen.queryByRole('navigation', { name: 'Site' })).toBeNull()
  })

  it('wraps content in the landmark the skip link and focus handoff target', () => {
    render(
      <LitTrackerShell account={ACCOUNT}>
        <p>content</p>
      </LitTrackerShell>,
    )

    const main = screen.getByRole('main')
    // Both are load-bearing: __root.tsx's skip link points at the id, and
    // src/focus-handoff.ts focuses this element when a page has no <h1>.
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(main).toContainElement(screen.getByText('content'))
  })
})
