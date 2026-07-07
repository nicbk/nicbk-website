import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotFoundPage } from './not-found-page'

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

describe('NotFoundPage', () => {
  it('shows "page not found" as the single main heading, with no numeric 404', () => {
    render(<NotFoundPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'page not found' }),
    ).toBeInTheDocument()
    // The design deliberately omits the numeric code.
    expect(screen.queryByText(/404/)).toBeNull()
  })

  it('links back to the home page', () => {
    render(<NotFoundPage />)
    expect(screen.getByRole('link', { name: 'back to home' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
