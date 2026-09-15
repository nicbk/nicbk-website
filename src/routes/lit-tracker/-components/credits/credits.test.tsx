import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Credits } from './credits'

/**
 * The tracker's credits: Semantic Scholar's attribution, one press away from
 * every tracker page.
 */
describe('Credits', () => {
  it('is a named button that shows nothing until pressed', () => {
    render(<Credits />)

    expect(screen.getByRole('button', { name: 'credits' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('credits Semantic Scholar, linked in a new tab', async () => {
    render(<Credits />)

    await userEvent.click(screen.getByRole('button', { name: 'credits' }))

    const link = await screen.findByRole('link', { name: /Semantic Scholar/ })
    expect(link).toHaveAttribute('href', 'https://www.semanticscholar.org')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(
      screen.getByText(/paper metadata and citations from/),
    ).toBeInTheDocument()
  })
})
