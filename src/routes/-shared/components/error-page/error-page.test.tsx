import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorPage } from './error-page'

// The "back to home" link is a router <Link>; mock it to a plain anchor so
// the page renders without a live router (the decided unit-test pattern).
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

describe('ErrorPage', () => {
  it('shows the generic message as the main heading and a home link', () => {
    render(<ErrorPage error={new Error('boom')} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'something went wrong' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'back to home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('hides the technical detail until the disclosure is opened, then reveals the error message', async () => {
    render(<ErrorPage error={new Error('boom-xyz')} />)

    // The message is rendered but hidden inside a collapsed <details>: jest-dom
    // treats descendants of a closed <details> as not visible.
    const message = screen.getByText('boom-xyz')
    expect(message).not.toBeVisible()

    // Activating the disclosure control reveals the detail.
    await userEvent.click(screen.getByText('technical detail'))
    expect(message).toBeVisible()
  })

  it('renders a valid page for an error carrying no message or stack', () => {
    // A defensive worst case: neither message nor stack available.
    const bare = new Error('')
    bare.stack = undefined
    render(<ErrorPage error={bare} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'something went wrong' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'back to home' })).toHaveAttribute(
      'href',
      '/',
    )
    // With nothing to show, the disclosure is omitted entirely — no empty,
    // broken detail region.
    expect(screen.queryByText('technical detail')).toBeNull()
  })
})
