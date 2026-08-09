import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * The rail's one job: naming the landmark it wraps the filters in. What is
 * inside is `collection-filters`' coverage, so it is stubbed — mounting the real
 * one here would need a Zero client and a router to say nothing this file is
 * about.
 */
vi.mock('./collection-filters', () => ({
  CollectionFilters: () => <p>the filters</p>,
}))

const { FilterRail } = await import('./filter-rail')

describe('FilterRail', () => {
  it('is a navigation landmark, named for what it filters', () => {
    // #7 deliberately left this rail un-named while it was empty — a navigation
    // region with nothing in it announces a promise it does not keep. Naming it
    // is part of the task that gave it contents.
    render(<FilterRail label="filter collection" />)

    const rail = screen.getByRole('navigation', { name: 'filter collection' })
    expect(rail).toContainElement(screen.getByText('the filters'))
  })
})
