import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchInput } from './search-input'

describe('SearchInput', () => {
  it('exposes a searchbox with the given accessible name', () => {
    render(
      <SearchInput value="" onValueChange={() => {}} label="Search posts" />,
    )
    expect(
      screen.getByRole('searchbox', { name: 'Search posts' }),
    ).toBeInTheDocument()
  })

  it('reflects the controlled value', () => {
    render(
      <SearchInput
        value="hooks"
        onValueChange={() => {}}
        label="Search posts"
      />,
    )
    expect(screen.getByRole('searchbox')).toHaveValue('hooks')
  })

  it('defaults the placeholder to the label, and lets it be overridden', () => {
    const { rerender } = render(
      <SearchInput value="" onValueChange={() => {}} label="Search posts" />,
    )
    expect(screen.getByPlaceholderText('Search posts')).toBeInTheDocument()

    rerender(
      <SearchInput
        value=""
        onValueChange={() => {}}
        label="Search posts"
        placeholder="Search posts…"
      />,
    )
    expect(screen.getByPlaceholderText('Search posts…')).toBeInTheDocument()
  })

  it('reports every keystroke immediately (no internal debounce)', () => {
    const onValueChange = vi.fn()
    render(
      <SearchInput
        value=""
        onValueChange={onValueChange}
        label="Search posts"
      />,
    )
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'm' },
    })
    expect(onValueChange).toHaveBeenCalledWith('m')
  })
})
