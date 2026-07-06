import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from '~/theme'
import { ThemeToggle } from './theme-toggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    window.localStorage.clear()
  })

  it('has an accessible name', () => {
    render(<ThemeToggle />)
    expect(
      screen.getByRole('button', { name: 'Toggle theme' }),
    ).toBeInTheDocument()
  })

  it('flips and persists the theme on click', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('renders both theme icons for CSS-driven visibility', () => {
    const { container } = render(<ThemeToggle />)
    // Two decorative SVG icons (sun + moon); CSS shows one per theme.
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      2,
    )
  })
})
