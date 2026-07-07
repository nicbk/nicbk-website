import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlogImage } from './blog-image'

describe('BlogImage', () => {
  it('renders an image with its src and alt text, loaded lazily', () => {
    render(<BlogImage src="/pic.png" alt="A description" />)
    const img = screen.getByAltText('A description')
    expect(img).toHaveAttribute('src', '/pic.png')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
  })
})
