import { Separator } from '@base-ui/react/separator'
import { render } from '@testing-library/react'
import { Sun } from 'lucide-react'
import { describe, expect, it } from 'vitest'

/**
 * Sanity checks that the design-system dependencies are correctly wired:
 * a trivial Base UI primitive and a Lucide icon render, and both are
 * styleable the way this project styles things — className (CSS Modules)
 * and data-* attribute hooks. Real components (header, etc.) build on
 * these in later tasks.
 */
describe('design-system dependencies', () => {
  it('renders a Base UI primitive with className and data-* styling hooks', () => {
    const { container } = render(
      <Separator className="fromCssModule" orientation="horizontal" />,
    )
    const separator = container.querySelector('[role="separator"]')
    expect(separator).not.toBeNull()
    expect(separator).toHaveClass('fromCssModule')
    // Base UI exposes state via data-* attributes — the styling hook the
    // project's CSS Modules key off (e.g. data-focus-visible on widgets).
    expect(separator).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('renders a Lucide icon as an inline, styleable SVG', () => {
    const { container } = render(
      <Sun className="fromCssModule" aria-hidden="true" />,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveClass('fromCssModule')
  })
})
