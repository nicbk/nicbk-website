import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomePage } from './home-page'

describe('HomePage', () => {
  it('renders both content lines verbatim', () => {
    render(<HomePage />)
    expect(
      screen.getByText('who: 22 yr old dude from SF Bay Area'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'doing: MLE intern @ Pinterest Labs in SF, MSCS AI @ Stanford',
      ),
    ).toBeInTheDocument()
  })

  it('exposes a main heading for document structure and focus handoff', () => {
    render(<HomePage />)
    // Visually hidden but present in the accessibility tree.
    expect(
      screen.getByRole('heading', { level: 1, name: 'home' }),
    ).toBeInTheDocument()
  })
})
