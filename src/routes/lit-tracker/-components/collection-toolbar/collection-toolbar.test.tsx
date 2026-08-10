import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Toaster } from '~/routes/-shared/components/toast/toaster'

/**
 * The row above the collection. What is asserted here is the search field it
 * gained in #8's last task — that it is labelled, controlled, and reports every
 * keystroke — plus that the upload controls it has always held are still beside
 * it. What those controls *do* is their own tests' and #7's e2e coverage.
 *
 * `useQuery` is mocked because the real one needs a mounted Zero client.
 */

const useQuery = vi.hoisted(() => vi.fn(() => [[], { type: 'complete' }]))
vi.mock('@rocicorp/zero/react', () => ({
  useQuery,
  useZero: () => ({ mutate: vi.fn() }),
}))

const { CollectionToolbar, SEARCH_LABEL } = await import('./collection-toolbar')

function renderToolbar(query = '', onQueryChange = vi.fn()) {
  render(
    <Toaster>
      <CollectionToolbar query={query} onQueryChange={onQueryChange} />
    </Toaster>,
  )
  return { onQueryChange }
}

describe('CollectionToolbar', () => {
  it('gives the search field a discernible name', () => {
    // Visually hidden — the placeholder carries the cue for sighted readers —
    // but a field a screen reader announces as "search" and nothing else does
    // not say what it searches.
    renderToolbar()

    expect(
      screen.getByRole('searchbox', { name: SEARCH_LABEL }),
    ).toBeInTheDocument()
  })

  it('shows the query it is given rather than one of its own', () => {
    // Controlled from the page, which filters the grid from the same value. Two
    // copies is how the grid comes to show something the input does not say.
    renderToolbar('attention')

    expect(screen.getByRole('searchbox')).toHaveValue('attention')
  })

  it('reports every keystroke, with no debounce of its own', () => {
    const { onQueryChange } = renderToolbar()

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'att' },
    })

    expect(onQueryChange).toHaveBeenCalledWith('att')
  })

  it('keeps the upload controls beside the search field', () => {
    // This task moved them; it must not have removed them.
    renderToolbar()

    expect(
      screen.getByRole('button', { name: 'Add articles' }),
    ).toBeInTheDocument()
  })
})
