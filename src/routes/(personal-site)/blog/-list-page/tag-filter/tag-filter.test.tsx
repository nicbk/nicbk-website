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

  it('drops focus after a pointer tap so no focus ring lingers', async () => {
    // A pointer/touch tap must not leave focus (and its accent ring, which looks
    // like the selected state) on the toggle; keyboard activation, tested below,
    // keeps focus.
    const user = userEvent.setup()
    render(<TagFilter tags={['react']} selected={[]} onToggle={() => {}} />)
    const button = screen.getByRole('button', { name: 'react' })

    await user.click(button)
    expect(button).not.toHaveFocus()
  })

  it('keeps focus on a tag after keyboard activation', async () => {
    const user = userEvent.setup()
    render(<TagFilter tags={['react']} selected={[]} onToggle={() => {}} />)
    const button = screen.getByRole('button', { name: 'react' })

    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveFocus()
  })
})
