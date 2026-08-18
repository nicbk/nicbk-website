import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { AnnotationSelectionMenuProps } from '@embedpdf/plugin-annotation/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AnnotationSelectionMenu } from './annotation-selection-menu'

/**
 * What can be done to a selected mark — write on it, remove it — and the cases
 * where each must not be offered.
 *
 * Deleting was the half of task 4 that was fully built underneath and
 * unreachable on screen, so what these assert is reachability: a real button,
 * with a name, that calls the engine with the mark it is attached to. The note
 * is the same shape of claim, plus the one thing that distinguishes it — it must
 * not appear on a mark that already has an editor of the engine's own.
 */

interface MenuOverrides extends Partial<AnnotationSelectionMenuProps> {
  /** Merged into `context.annotation.object`, which is the mark itself. */
  object?: Record<string, unknown>
}

function menuProps({
  object,
  context,
  ...overrides
}: MenuOverrides = {}): AnnotationSelectionMenuProps {
  return {
    rect: { origin: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
    menuWrapperProps: {},
    selected: true,
    placement: { suggestTop: false },
    ...overrides,
    // After the spread, because the overrides carry only *part* of a context
    // and replacing the whole one would drop the mark itself.
    context: {
      type: 'annotation',
      pageIndex: 3,
      annotation: {
        object: {
          id: 'a1',
          type: PdfAnnotationSubtype.HIGHLIGHT,
          ...object,
        },
      },
      structurallyLocked: false,
      contentLocked: false,
      ...context,
    },
  } as unknown as AnnotationSelectionMenuProps
}

function renderMenu(overrides: MenuOverrides = {}, handlers = {}) {
  return render(
    <AnnotationSelectionMenu
      {...menuProps(overrides)}
      onDelete={vi.fn()}
      onSaveNote={vi.fn()}
      {...handlers}
    />,
  )
}

describe('the selected mark’s menu', () => {
  it('offers named controls, since they are glyphs and nothing else', () => {
    renderMenu()

    expect(
      screen.getByRole('button', { name: 'delete annotation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'write a note' }),
    ).toBeInTheDocument()
  })

  it('removes the mark it is attached to, by page and id', () => {
    // The page index matters: EmbedPDF addresses an annotation by both, and a
    // menu that passed the wrong one would delete nothing, silently.
    const onDelete = vi.fn()
    renderMenu({}, { onDelete })

    return userEvent
      .click(screen.getByRole('button', { name: 'delete annotation' }))
      .then(() => {
        expect(onDelete).toHaveBeenCalledWith(3, 'a1')
      })
  })

  it('draws nothing for a mark that is not selected', () => {
    // It is rendered for every annotation on the page, so this is the common
    // case rather than an edge one.
    const { container } = renderMenu({ selected: false })

    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing for a mark the document itself locks', () => {
    // A PDF can arrive with read-only annotations. Offering to delete what the
    // engine will refuse to touch is a control that lies.
    const { container } = renderMenu({
      context: { structurallyLocked: true },
    } as MenuOverrides)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('the note on a mark', () => {
  it('opens an editor carrying what the mark already says', async () => {
    renderMenu({ object: { contents: 'compare with the residual note' } })

    await userEvent.click(screen.getByRole('button', { name: 'write a note' }))

    expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue(
      'compare with the residual note',
    )
  })

  it('is not offered on a text box, which has the engine’s own editor', () => {
    // A free text's `contents` *is* what it says on the page, edited in place.
    // A second editor inches away would be two ways to write one field.
    renderMenu({ object: { type: PdfAnnotationSubtype.FREETEXT } })

    expect(
      screen.queryByRole('button', { name: 'write a note' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'delete annotation' }),
    ).toBeInTheDocument()
  })

  it('is not offered on a mark whose contents the document locks', () => {
    // The content-specific lock, distinct from the structural one: such a mark
    // can still be selected and deleted, just not written on.
    renderMenu({ context: { contentLocked: true } } as MenuOverrides)

    expect(
      screen.queryByRole('button', { name: 'write a note' }),
    ).not.toBeInTheDocument()
  })

  it('closes the editor when the mark is put down', async () => {
    // The component stays mounted for every annotation on the page and merely
    // stops drawing, so an editor left open would be waiting the next time this
    // mark was picked up.
    const { rerender } = renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'write a note' }))
    expect(screen.getByRole('textbox', { name: 'note' })).toBeInTheDocument()

    rerender(
      <AnnotationSelectionMenu
        {...menuProps({ selected: false })}
        onDelete={vi.fn()}
        onSaveNote={vi.fn()}
      />,
    )
    rerender(
      <AnnotationSelectionMenu
        {...menuProps()}
        onDelete={vi.fn()}
        onSaveNote={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('textbox', { name: 'note' }),
    ).not.toBeInTheDocument()
  })
})
