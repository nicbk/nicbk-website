import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The narrow-screen sheet. The filter list inside it is stubbed — what it draws
 * is `filter-groups`' own coverage, and mounting the real one here would need a
 * Zero client. What this file is about is the sheet: that it opens, and that it
 * does not stay open once the rail has taken the filters back.
 */
vi.mock('./collection-filters', () => ({
  CollectionFilters: () => <p>the filters</p>,
}))

const { FiltersDrawer } = await import('./filters-drawer')

/**
 * jsdom has no layout, so `matchMedia` is stubbed with one this test drives —
 * which is also the only way to *cross* a breakpoint without a real viewport.
 */
const media = vi.hoisted(() => ({
  narrow: true,
  listeners: new Set<() => void>(),
}))

beforeEach(() => {
  media.narrow = true
  media.listeners.clear()
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return media.narrow
    },
    addEventListener: (_: string, listener: () => void) =>
      media.listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      media.listeners.delete(listener),
  }))
})

/** Widen the window past the breakpoint, as a real resize would. */
function widen() {
  media.narrow = false
  for (const listener of media.listeners) {
    listener()
  }
}

describe('FiltersDrawer', () => {
  it('opens the sheet from the control row', async () => {
    const user = userEvent.setup()
    render(<FiltersDrawer />)

    await user.click(screen.getByRole('button', { name: 'filters' }))

    expect(screen.getByRole('dialog', { name: 'filters' })).toBeInTheDocument()
    expect(screen.getByText('the filters')).toBeInTheDocument()
  })

  it('shows nothing until it is asked for', () => {
    render(<FiltersDrawer />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes itself when the window grows past the breakpoint', async () => {
    // Hiding the trigger in CSS stops a wide window opening the sheet, but does
    // nothing about one already open: widening then showed the rail and the
    // sheet at once, two copies of the same filters.
    const user = userEvent.setup()
    render(<FiltersDrawer />)
    await user.click(screen.getByRole('button', { name: 'filters' }))

    widen()

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
