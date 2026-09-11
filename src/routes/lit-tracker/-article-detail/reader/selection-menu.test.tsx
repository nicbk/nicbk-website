import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SelectionSelectionMenuProps } from '@embedpdf/plugin-selection/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectionMenu } from './selection-menu'

/**
 * The control over a selected passage: what it offers, and that it never
 * pretends.
 *
 * Copying had no affordance before #9 — the plugin's own call reaches nothing in
 * this reader — so the first claims are plain reachability. The rest are about
 * honesty: a paper that forbids extraction, a paper that forbids marking, and a
 * clipboard that refuses must all be visible rather than presenting as buttons
 * that do nothing.
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

function renderMenu(props: Partial<Parameters<typeof SelectionMenu>[0]> = {}) {
  return render(
    <SelectionMenu
      {...menuProps(props)}
      canCopy={props.canCopy ?? true}
      canMark={props.canMark ?? true}
      state={props.state ?? 'idle'}
      onCopy={props.onCopy ?? vi.fn()}
      onMark={props.onMark ?? vi.fn()}
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

describe('marking the passage from where it was selected', () => {
  it('offers the four tools that attach to text', () => {
    // The same four the toolbar's `text` group holds, named with the toolbar's
    // own words — one vocabulary, not two.
    renderMenu()

    for (const name of ['highlight', 'underline', 'strikeout', 'squiggly']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }
  })

  it('offers no drawing tool', () => {
    // A rectangle is drawn on the page, not attached to a passage; this control
    // acts on the passage and must not become a second toolbar.
    renderMenu()

    expect(screen.queryByRole('button', { name: 'rectangle' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'sticky note' })).toBeNull()
  })

  it('marks with the tool that was chosen', async () => {
    const onMark = vi.fn()
    renderMenu({ onMark })

    await userEvent.click(screen.getByRole('button', { name: 'underline' }))

    // The id EmbedPDF knows the tool by, not the reader's word for it.
    expect(onMark).toHaveBeenCalledWith('underline')
  })

  it('keeps copy first, because it is what a reader reaches for', () => {
    // The control existed for copying; marking is the addition. Order is the
    // cheapest way to keep that true.
    renderMenu()

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAccessibleName('copy')
  })

  it('offers nothing to mark with when the paper forbids it', () => {
    /*
     * Absent rather than disabled, unlike copy: there are four of them, the
     * explanation would not fit beside a selection, and a reader who never sees
     * a control does not wonder why pressing it did nothing. The plugin refuses
     * such a create silently, so an offered control would be a lie.
     */
    renderMenu({ canMark: false })

    expect(screen.queryByRole('button', { name: 'highlight' })).toBeNull()
    expect(screen.getByRole('button', { name: 'copy' })).toBeInTheDocument()
  })

  it('still marks on a paper that forbids copying', () => {
    // The two permissions are independent, and so are the controls.
    renderMenu({ canCopy: false })

    expect(screen.getByRole('button', { name: 'highlight' })).toBeEnabled()
  })
})

describe('the target a thumb has to hit', () => {
  const stylesheet = readFileSync(
    join(__dirname, 'selection-menu.module.css'),
    'utf8',
  )

  function rulesFor(selector: string): string {
    const start = stylesheet.indexOf(selector)
    if (start === -1) {
      throw new Error(`No such rule in selection-menu.module.css: ${selector}`)
    }
    return stylesheet.slice(
      stylesheet.indexOf('{', start) + 1,
      stylesheet.indexOf('}', start),
    )
  }

  it('is at least the 24px WCAG 2.2 AA asks for, for the glyph-only tools', () => {
    /*
     * SC 2.5.8, the floor this site conforms to
     * (research/accessibility/conformance-target.md). The glyph stays small
     * because this bar floats over the reader's paper; the target is grown past
     * it invisibly, as the selection handles' dot is. jsdom applies no
     * stylesheets, so the CSS is the only place this can be asserted.
     */
    const target = rulesFor('.tool::after')
    const size = (property: string) => {
      const match = target.match(new RegExp(`${property}:\\s*([\\d.]+)rem`))
      if (!match?.[1]) {
        throw new Error(`No ${property} in rem: ${target}`)
      }
      return Number(match[1]) * 16
    }

    expect(size('width')).toBeGreaterThanOrEqual(24)
    expect(size('height')).toBeGreaterThanOrEqual(24)
  })
})
