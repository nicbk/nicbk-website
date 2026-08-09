import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CollectionTag } from './article-menu'
import { ArticleMenu } from './article-menu'

/**
 * The card menu's contract, asserted against injected callbacks.
 *
 * Nothing here goes near Zero: the menu decides *what was asked for*, and
 * whether that write is allowed is `src/zero/mutators.ts`'s business, proven
 * against a real database in `mutators.integration.test.ts`. Keeping the two
 * apart is what lets this file be about keyboard operation and about the one
 * piece of real logic the menu owns — that a typed name may already exist.
 */

const ATTENTION: CollectionTag = { id: 'tag-1', name: 'attention' }
const SURVEY: CollectionTag = { id: 'tag-2', name: 'survey' }

function renderMenu(
  overrides: Partial<Parameters<typeof ArticleMenu>[0]> = {},
) {
  const handlers = {
    onSetStatus: vi.fn(),
    onToggleTag: vi.fn(),
    onCreateTag: vi.fn(),
  }
  render(
    <ArticleMenu
      articleTitle="Attention Is All You Need"
      status="pending"
      allTags={[ATTENTION, SURVEY]}
      appliedTagIds={new Set([ATTENTION.id])}
      {...handlers}
      {...overrides}
    />,
  )
  return handlers
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Options for/ }))
  return screen.findByRole('menu')
}

describe('ArticleMenu', () => {
  it('names its trigger after the article it belongs to', () => {
    // Twenty cards in a grid, each with a menu: "options" repeated twenty times
    // is not a name, and a screen-reader user listing the page's controls would
    // have no way to tell them apart.
    renderMenu()

    expect(
      screen.getByRole('button', {
        name: 'Options for Attention Is All You Need',
      }),
    ).toBeInTheDocument()
  })

  it('opens from its trigger and closes on Escape, returning focus', async () => {
    const user = userEvent.setup()
    renderMenu()
    const trigger = screen.getByRole('button', { name: /Options for/ })

    await openMenu(user)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).toBeNull()
    // Focus back where it started — otherwise a keyboard user is returned to
    // the top of the document and has to tab through the whole grid again.
    expect(trigger).toHaveFocus()
  })

  it('opens from the keyboard and moves between items with the arrow keys', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.tab()
    expect(screen.getByRole('button', { name: /Options for/ })).toHaveFocus()

    await user.keyboard('{Enter}')
    const menu = await screen.findByRole('menu')

    await user.keyboard('{ArrowDown}')
    expect(
      within(menu).getByRole('menuitemradio', { name: 'reading' }),
    ).toHaveFocus()
  })

  it('reports the chosen reading status', async () => {
    const user = userEvent.setup()
    const { onSetStatus } = renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitemradio', { name: 'read' }))

    expect(onSetStatus).toHaveBeenCalledWith('read')
  })

  it('reports only the new status, with no call to clear the old one', async () => {
    // Mutual exclusivity comes from the column being single-valued, not from
    // the UI unsetting anything. If this ever needs two calls, the model has
    // drifted from `research/data-modeling/tags-and-reading-status.md`.
    const user = userEvent.setup()
    const { onSetStatus } = renderMenu({ status: 'reading' })

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitemradio', { name: 'read' }))

    expect(onSetStatus).toHaveBeenCalledTimes(1)
    expect(onSetStatus).toHaveBeenCalledWith('read')
  })

  it('shows which tags this article already carries', async () => {
    const user = userEvent.setup()
    renderMenu()

    const menu = await openMenu(user)

    expect(
      within(menu).getByRole('menuitemcheckbox', { name: 'attention' }),
    ).toBeChecked()
    expect(
      within(menu).getByRole('menuitemcheckbox', { name: 'survey' }),
    ).not.toBeChecked()
  })

  it('applies an unchecked tag and removes a checked one', async () => {
    const user = userEvent.setup()
    const { onToggleTag } = renderMenu()

    const menu = await openMenu(user)
    await user.click(
      within(menu).getByRole('menuitemcheckbox', { name: 'survey' }),
    )
    await user.click(
      within(menu).getByRole('menuitemcheckbox', { name: 'attention' }),
    )

    expect(onToggleTag).toHaveBeenNthCalledWith(1, SURVEY.id, true)
    expect(onToggleTag).toHaveBeenNthCalledWith(2, ATTENTION.id, false)
  })

  it('stays open while tags are toggled', async () => {
    // Tagging is rarely one tag. A menu that closed after each would make
    // applying three tags three trips.
    const user = userEvent.setup()
    renderMenu()

    const menu = await openMenu(user)
    await user.click(
      within(menu).getByRole('menuitemcheckbox', { name: 'survey' }),
    )

    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('creates a tag when the typed name is new', async () => {
    const user = userEvent.setup()
    const { onCreateTag, onToggleTag } = renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'new tag…' }))
    await user.type(await screen.findByLabelText('tag name'), 'transformers')
    await user.click(screen.getByRole('button', { name: 'add' }))

    expect(onCreateTag).toHaveBeenCalledWith('transformers')
    expect(onToggleTag).not.toHaveBeenCalled()
  })

  it('applies the existing tag when the typed name is one the reader already has', async () => {
    // The whole reason there is no separate "manage tags" screen: typing a name
    // is how a tag is both created and reused, and typing "survey" twice must
    // not leave two tags called "survey".
    const user = userEvent.setup()
    const { onCreateTag, onToggleTag } = renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'new tag…' }))
    await user.type(await screen.findByLabelText('tag name'), 'survey')
    await user.click(screen.getByRole('button', { name: 'add' }))

    expect(onToggleTag).toHaveBeenCalledWith(SURVEY.id, true)
    expect(onCreateTag).not.toHaveBeenCalled()
  })

  it('matches an existing name regardless of case', async () => {
    const user = userEvent.setup()
    const { onCreateTag, onToggleTag } = renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'new tag…' }))
    await user.type(await screen.findByLabelText('tag name'), 'Survey')
    await user.click(screen.getByRole('button', { name: 'add' }))

    expect(onToggleTag).toHaveBeenCalledWith(SURVEY.id, true)
    expect(onCreateTag).not.toHaveBeenCalled()
  })

  it('trims what was typed, and will not submit a name of only spaces', async () => {
    const user = userEvent.setup()
    const { onCreateTag } = renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'new tag…' }))
    const field = await screen.findByLabelText('tag name')

    await user.type(field, '   ')
    // Disabled rather than accepted-and-refused: the mutator would reject this,
    // and an error toast for something the form could see is a worse answer.
    expect(screen.getByRole('button', { name: 'add' })).toBeDisabled()

    await user.clear(field)
    await user.type(field, '  spaced  ')
    await user.click(screen.getByRole('button', { name: 'add' }))

    expect(onCreateTag).toHaveBeenCalledWith('spaced')
  })

  it('asks for nothing when the naming dialog is dismissed', async () => {
    const user = userEvent.setup()
    const { onCreateTag, onToggleTag } = renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'new tag…' }))
    await user.type(await screen.findByLabelText('tag name'), 'abandoned')
    await user.keyboard('{Escape}')

    expect(onCreateTag).not.toHaveBeenCalled()
    expect(onToggleTag).not.toHaveBeenCalled()
  })

  it('forgets an abandoned name rather than offering it again', async () => {
    const user = userEvent.setup()
    renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'new tag…' }))
    await user.type(await screen.findByLabelText('tag name'), 'abandoned')
    await user.keyboard('{Escape}')

    const reopened = await openMenu(user)
    await user.click(
      within(reopened).getByRole('menuitem', { name: 'new tag…' }),
    )

    expect(await screen.findByLabelText('tag name')).toHaveValue('')
  })

  it('offers only the naming item when the reader has no tags yet', async () => {
    const user = userEvent.setup()
    renderMenu({ allTags: [], appliedTagIds: new Set() })

    const menu = await openMenu(user)

    expect(within(menu).queryAllByRole('menuitemcheckbox')).toHaveLength(0)
    expect(
      within(menu).getByRole('menuitem', { name: 'new tag…' }),
    ).toBeInTheDocument()
  })
})
