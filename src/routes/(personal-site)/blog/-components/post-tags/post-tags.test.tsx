import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostTags } from './post-tags'

describe('PostTags', () => {
  it('renders each tag as a labelled list item', () => {
    render(<PostTags tags={['react', 'testing']} />)
    const list = screen.getByRole('list', { name: 'Tags' })
    expect(list).toBeInTheDocument()
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('testing')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders nothing when there are no tags', () => {
    const { container } = render(<PostTags tags={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
