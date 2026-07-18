import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearchBar } from './search-bar'

afterEach(() => {
  vi.useRealTimers()
})

describe('SearchBar', () => {
  it('renders a search field with a discernible accessible name', () => {
    render(<SearchBar value="" onQueryChange={() => {}} />)
    expect(
      screen.getByRole('searchbox', { name: 'Search posts' }),
    ).toBeInTheDocument()
  })

  it('initializes the field from the value prop', () => {
    render(<SearchBar value="hooks" onQueryChange={() => {}} />)
    expect(screen.getByRole('searchbox')).toHaveValue('hooks')
  })

  it('pushes the settled text once, after the debounce, not per keystroke', () => {
    vi.useFakeTimers()
    const onQueryChange = vi.fn()
    render(<SearchBar value="" onQueryChange={onQueryChange} />)
    const input = screen.getByRole('searchbox')

    // Two edits in quick succession; only the last should reach the URL.
    fireEvent.change(input, { target: { value: 'mi' } })
    fireEvent.change(input, { target: { value: 'mini' } })
    // Still within the debounce window: no navigation yet.
    expect(onQueryChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(onQueryChange).toHaveBeenCalledTimes(1)
    expect(onQueryChange).toHaveBeenLastCalledWith('mini')
  })

  it('adopts an external value change without calling back', () => {
    const onQueryChange = vi.fn()
    const { rerender } = render(
      <SearchBar value="" onQueryChange={onQueryChange} />,
    )
    // Simulates the URL changing from a shared link or the back button.
    rerender(<SearchBar value="react" onQueryChange={onQueryChange} />)

    expect(screen.getByRole('searchbox')).toHaveValue('react')
    expect(onQueryChange).not.toHaveBeenCalled()
  })
})
