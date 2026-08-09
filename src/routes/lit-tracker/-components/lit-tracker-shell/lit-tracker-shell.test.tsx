import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * The shell mounts the Zero client around both of its panels (so the filter rail
 * in the sidebar can query), which in the unit tier means mocking it: the real
 * one needs a WebSocket and a running zero-cache. What is under test here is the
 * layout — which landmark holds what — not the sync engine.
 */
vi.mock('../zero-client/zero-client-provider', () => ({
  ZeroClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

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

const { LitTrackerShell } = await import('./lit-tracker-shell')

const ACCOUNT = {
  id: 'user-1',
  name: 'Nicolás Kennedy',
  email: 'nicbk@example.com',
  image: null,
}

function renderShell(filters?: React.ReactNode) {
  return render(
    <LitTrackerShell account={ACCOUNT} filters={filters}>
      <p>content</p>
    </LitTrackerShell>,
  )
}

describe('LitTrackerShell', () => {
  it('renders the tracker header, not the site header', () => {
    renderShell()

    expect(
      screen.getByRole('link', { name: 'Literature Tracker' }),
    ).toBeInTheDocument()
    // The site header's nav has no place here — the tracker is its own
    // sub-application with its own chrome.
    expect(screen.queryByRole('navigation', { name: 'Site' })).toBeNull()
  })

  it('puts the account control in the header, outside the content', () => {
    // It sat at the foot of the sidebar until 2026-08-09, when the rail filled
    // with tags and one avatar under thirty of them read as the last item of
    // the list rather than as the account control.
    renderShell()

    const account = screen.getByRole('button', { name: 'Account settings' })
    expect(screen.getByRole('banner')).toContainElement(account)
    expect(screen.getByRole('main')).not.toContainElement(account)
  })

  it('wraps content in the landmark the skip link and focus handoff target', () => {
    renderShell()

    const main = screen.getByRole('main')
    // Both are load-bearing: __root.tsx's skip link points at the id, and
    // src/focus-handoff.ts focuses this element when a page has no <h1>.
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(main).toContainElement(screen.getByText('content'))
  })

  it('puts the filters in the sidebar, beside the content rather than in it', () => {
    renderShell(<p>filters</p>)

    const filters = screen.getByText('filters')
    expect(screen.getByRole('main')).not.toContainElement(filters)
    expect(screen.getByRole('banner')).not.toContainElement(filters)
  })
})
