import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TagFilter } from './tag-filter'

describe('TagFilter', () => {
  it('renders a labelled toggle button per tag', () => {
    render(
      <TagFilter tags={['react', 'zod']} selected={[]} onToggle={() => {}} />,
    )
    expect(
      screen.getByRole('navigation', { name: 'Filter by tag' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'react' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'zod' })).toBeInTheDocument()
  })

  it('conveys each tag’s pressed state via aria-pressed', () => {
    render(
      <TagFilter
        tags={['react', 'zod']}
        selected={['zod']}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'react' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'zod' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('calls onToggle with the tag when a toggle is activated', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <TagFilter tags={['react', 'zod']} selected={[]} onToggle={onToggle} />,
    )

    await user.click(screen.getByRole('button', { name: 'react' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('react')
  })

  it('renders nothing when there are no tags', () => {
    const { container } = render(
      <TagFilter tags={[]} selected={[]} onToggle={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
