import type { SelectionSelectionMenuProps } from '@embedpdf/plugin-selection/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectionCopyMenu } from './selection-copy-menu'

/**
 * The control over a selected passage: that it exists at all, and that it never
 * pretends.
 *
 * Copying had no affordance before this — the plugin's own call reaches nothing
 * in this reader — so the first claim is plain reachability. The rest are about
 * honesty: a paper that forbids extraction, and a clipboard that refuses, must
 * both be visible rather than presenting as a button that does nothing.
 */

function menuProps(
  overrides: Partial<SelectionSelectionMenuProps> = {},
): SelectionSelectionMenuProps {
  return {
    rect: { origin: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
    menuWrapperProps: {},
    selected: true,
    placement: { suggestTop: false },
    context: { type: 'selection', pageIndex: 0 },
    ...overrides,
  } as unknown as SelectionSelectionMenuProps
}

function renderMenu(
  props: Partial<Parameters<typeof SelectionCopyMenu>[0]> = {},
) {
  return render(
    <SelectionCopyMenu
      {...menuProps(props)}
      canCopy={props.canCopy ?? true}
      state={props.state ?? 'idle'}
      onCopy={props.onCopy ?? vi.fn()}
    />,
  )
}

describe('the selected passage’s menu', () => {
  it('offers a copy control, which nothing did before', () => {
    renderMenu()

    expect(screen.getByRole('button', { name: 'copy' })).toBeEnabled()
  })

  it('copies what is selected', async () => {
    const onCopy = vi.fn()
    renderMenu({ onCopy })

    await userEvent.click(screen.getByRole('button', { name: 'copy' }))

    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('draws nothing without a selection', () => {
    // Rendered for the selection layer whether or not there is one.
    const { container } = renderMenu({ selected: false })

    expect(container).toBeEmptyDOMElement()
  })

  it('confirms in place rather than leaving the reader guessing', () => {
    renderMenu({ state: 'copied' })

    expect(screen.getByRole('button', { name: 'copied' })).toBeInTheDocument()
  })

  it('says so when the clipboard refused', () => {
    // Ordinary — permission policy, an unfocused document, plain HTTP — and the
    // library's own utility would have swallowed it.
    renderMenu({ state: 'failed' })

    expect(
      screen.getByRole('button', { name: 'could not copy' }),
    ).toBeInTheDocument()
  })

  it('explains a paper that forbids copying instead of failing silently', () => {
    // The plugin declines such a copy with a debug log and no event, so this is
    // the only surface that can carry the reason.
    renderMenu({ canCopy: false })

    const button = screen.getByRole('button', {
      name: 'this pdf does not allow copying',
    })
    expect(button).toBeDisabled()
  })

  it('does not report success it cannot have had', () => {
    // A stale "copied" from an earlier paper must not survive into one that
    // refuses: the permission answer wins over the state.
    renderMenu({ canCopy: false, state: 'copied' })

    expect(screen.queryByRole('button', { name: 'copied' })).toBeNull()
  })
})
