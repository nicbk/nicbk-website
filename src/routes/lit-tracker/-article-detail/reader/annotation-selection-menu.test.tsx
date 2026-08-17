import type { AnnotationSelectionMenuProps } from '@embedpdf/plugin-annotation/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AnnotationSelectionMenu } from './annotation-selection-menu'

/**
 * The one thing that can be done to a selected mark, and the two cases where it
 * must not be offered.
 *
 * Deleting is the half of this feature that was fully built underneath and
 * unreachable on screen, so what these assert is reachability: a real button,
 * with a name, that calls the engine with the mark it is attached to.
 */

function menuProps(
  overrides: Partial<AnnotationSelectionMenuProps> = {},
): AnnotationSelectionMenuProps {
  return {
    rect: { origin: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
    menuWrapperProps: {},
    selected: true,
    placement: { suggestTop: false },
    context: {
      type: 'annotation',
      pageIndex: 3,
      annotation: { object: { id: 'a1' } },
      structurallyLocked: false,
      contentLocked: false,
    },
    ...overrides,
  } as unknown as AnnotationSelectionMenuProps
}

describe('the selected mark’s menu', () => {
  it('offers a named control, since it is a glyph and nothing else', () => {
    render(<AnnotationSelectionMenu {...menuProps()} onDelete={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'delete annotation' }),
    ).toBeInTheDocument()
  })

  it('removes the mark it is attached to, by page and id', () => {
    // The page index matters: EmbedPDF addresses an annotation by both, and a
    // menu that passed the wrong one would delete nothing, silently.
    const onDelete = vi.fn()
    render(<AnnotationSelectionMenu {...menuProps()} onDelete={onDelete} />)

    return userEvent
      .click(screen.getByRole('button', { name: 'delete annotation' }))
      .then(() => {
        expect(onDelete).toHaveBeenCalledWith(3, 'a1')
      })
  })

  it('draws nothing for a mark that is not selected', () => {
    // It is rendered for every annotation on the page, so this is the common
    // case rather than an edge one.
    const { container } = render(
      <AnnotationSelectionMenu
        {...menuProps({ selected: false })}
        onDelete={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing for a mark the document itself locks', () => {
    // A PDF can arrive with read-only annotations. Offering to delete what the
    // engine will refuse to touch is a control that lies.
    const { container } = render(
      <AnnotationSelectionMenu
        {...menuProps({
          context: {
            ...menuProps().context,
            structurallyLocked: true,
          },
        })}
        onDelete={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
