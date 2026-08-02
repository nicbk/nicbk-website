import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LitTrackerHeader } from './lit-tracker-header'

// TanStack Router's <Link> needs a live router; the decided unit-test pattern
// (research/testing-qa/test-runner-and-frameworks.md) mocks it to a plain
// anchor so the header renders in isolation. Note that the settings modal
// underneath is NOT mocked — that it opens is what this file is here to prove.
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

describe('LitTrackerHeader', () => {
  it('renders the app name as the tracker home link', () => {
    render(<LitTrackerHeader account={ACCOUNT} />)
    expect(
      screen.getByRole('link', { name: 'Literature Tracker' }),
    ).toHaveAttribute('href', '/lit-tracker')
  })

  it('shows the collection path with only its root segment', () => {
    render(<LitTrackerHeader account={ACCOUNT} />)
    const path = screen.getByRole('navigation', { name: 'Collection path' })
    expect(path).toHaveTextContent('↳/nicbk_home')
    // One segment today. #9 grows it one per citation-graph hop, which is why
    // it is a list rather than a string.
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('gives the avatar a discernible name rather than a bare letter', () => {
    render(<LitTrackerHeader account={ACCOUNT} />)
    // The letter is decoration — announcing "N" would tell a screen-reader
    // user nothing about what the control does.
    const avatar = screen.getByRole('button', { name: 'Account settings' })
    expect(avatar).toHaveTextContent('N')
  })

  it('opens the shared settings modal from the avatar', async () => {
    // The loop #6 left open: the modal shipped with nothing to trigger it.
    const user = userEvent.setup()
    render(<LitTrackerHeader account={ACCOUNT} />)

    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Account settings' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(ACCOUNT.email)
  })

  it('is reachable and operable by keyboard alone', async () => {
    const user = userEvent.setup()
    render(<LitTrackerHeader account={ACCOUNT} />)

    await user.tab()
    expect(
      screen.getByRole('link', { name: 'Literature Tracker' }),
    ).toHaveFocus()
    await user.tab()
    expect(
      screen.getByRole('button', { name: 'Account settings' }),
    ).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
