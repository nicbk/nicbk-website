import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  EDIT_TAGS_LABEL,
  FIND_TAGS_LABEL,
  FilterGroups,
  NO_MATCHING_TAGS_MESSAGE,
  NO_TAGS_MESSAGE,
} from './filter-groups'

/**
 * The filter list's markup and the callbacks it fires. Presentational, so none
 * of this needs a router, a Zero client, or the confirmation dialog.
 */

const RLHF = { id: 't1', name: 'rlhf' }
const TAGS = [RLHF, { id: 't2', name: 'transformers' }]

function renderGroups(
  overrides: Partial<ComponentProps<typeof FilterGroups>> = {},
) {
  const onToggleTag = vi.fn()
  const onToggleStatus = vi.fn()
  const onRequestDelete = vi.fn()

  render(
    <FilterGroups
      tags={TAGS}
      selectedTags={[]}
      selectedStatus={undefined}
      onToggleTag={onToggleTag}
      onToggleStatus={onToggleStatus}
      onRequestDelete={onRequestDelete}
      {...overrides}
    />,
  )

  return { onToggleTag, onToggleStatus, onRequestDelete }
}

describe('FilterGroups', () => {
  it('renders one toggle per tag plus the three statuses', () => {
    renderGroups()

    expect(screen.getByRole('button', { name: 'rlhf' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'transformers' }),
    ).toBeInTheDocument()
    for (const status of ['pending', 'reading', 'read']) {
      expect(
        screen.getByRole('button', { name: `only articles marked ${status}` }),
      ).toBeInTheDocument()
    }
  })

  it('exposes each toggle’s selected state, pressed and not', () => {
    // `aria-pressed` is what a screen reader announces the selection with; the
    // stylesheet shows the same state in color *and* weight, never color alone.
    renderGroups({ selectedTags: ['rlhf'], selectedStatus: 'reading' })

    expect(screen.getByRole('button', { name: 'rlhf' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('button', { name: 'transformers' }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByRole('button', { name: 'only articles marked reading' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports a tag by name when it is toggled', () => {
    const { onToggleTag } = renderGroups()

    screen.getByRole('button', { name: 'rlhf' }).click()

    expect(onToggleTag).toHaveBeenCalledWith('rlhf')
  })

  it('reports a status when it is toggled', () => {
    const { onToggleStatus } = renderGroups()

    screen.getByRole('button', { name: 'only articles marked read' }).click()

    expect(onToggleStatus).toHaveBeenCalledWith('read')
  })

  it('says so when the reader has no tags, rather than showing an empty group', () => {
    renderGroups({ tags: [] })

    expect(screen.getByText(NO_TAGS_MESSAGE)).toBeInTheDocument()
    // The statuses are always there — they are not the reader's to create.
    expect(
      screen.getByRole('button', { name: 'only articles marked pending' }),
    ).toBeInTheDocument()
  })

  it('shows no deletes until removal is turned on', () => {
    // The resting state is a filter list, not a list of destructive buttons.
    renderGroups()

    expect(screen.queryByRole('button', { name: /^Delete tag/ })).toBeNull()
  })

  it('reveals a delete per tag once removal is on, and hides them again', async () => {
    const user = userEvent.setup()
    renderGroups()
    const edit = screen.getByRole('button', { name: EDIT_TAGS_LABEL })

    await user.click(edit)
    expect(screen.getAllByRole('button', { name: /^Delete tag/ })).toHaveLength(
      TAGS.length,
    )
    expect(edit).toHaveAttribute('aria-pressed', 'true')

    await user.click(edit)
    expect(screen.queryByRole('button', { name: /^Delete tag/ })).toBeNull()
  })

  it('names each delete for the tag it deletes', async () => {
    // Twenty rows of "Delete" would all announce identically; the name has to
    // say which one.
    const user = userEvent.setup()
    const { onRequestDelete } = renderGroups()

    await user.click(screen.getByRole('button', { name: EDIT_TAGS_LABEL }))
    await user.click(screen.getByRole('button', { name: 'Delete tag rlhf' }))

    expect(onRequestDelete).toHaveBeenCalledWith(RLHF)
  })

  it('offers no delete for a reading status, even while removal is on', async () => {
    // The three statuses render as tags but are not tags: they cannot be
    // renamed or deleted (research/ui-ux/.../collection-view.md).
    const user = userEvent.setup()
    renderGroups()

    await user.click(screen.getByRole('button', { name: EDIT_TAGS_LABEL }))

    expect(screen.queryByRole('button', { name: 'Delete tag read' })).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Delete tag/ })).toHaveLength(
      TAGS.length,
    )
  })

  it('offers nothing to edit when there are no tags', () => {
    renderGroups({ tags: [] })

    expect(screen.queryByRole('button', { name: EDIT_TAGS_LABEL })).toBeNull()
  })

  it('keeps every control reachable by keyboard, in the order it is read in', async () => {
    // Including the deletes, once revealed: a control reachable only by pointer
    // is not reachable (WCAG 2.1.1).
    renderGroups({ tags: [RLHF] })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: EDIT_TAGS_LABEL }))
    screen.getByRole('button', { name: EDIT_TAGS_LABEL }).blur()

    const order: [role: 'button' | 'textbox', name: string][] = [
      ['button', 'only articles marked pending'],
      ['button', 'only articles marked reading'],
      ['button', 'only articles marked read'],
      ['button', EDIT_TAGS_LABEL],
      ['textbox', FIND_TAGS_LABEL],
      ['button', 'rlhf'],
      ['button', 'Delete tag rlhf'],
    ]
    for (const [role, name] of order) {
      await user.tab()
      expect(screen.getByRole(role, { name })).toBe(document.activeElement)
    }
  })

  it('narrows the list to what was typed, without touching the statuses', async () => {
    // The find field is what makes a thirty-tag rail usable, and it must not
    // filter away the reading statuses beside it — they are a different group
    // with a different rule.
    const user = userEvent.setup()
    renderGroups()

    await user.type(
      screen.getByRole('textbox', { name: FIND_TAGS_LABEL }),
      'rl',
    )

    expect(screen.getByRole('button', { name: 'rlhf' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'transformers' })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'only articles marked reading' }),
    ).toBeInTheDocument()
  })

  it('says so when nothing matches, rather than showing an empty list', async () => {
    const user = userEvent.setup()
    renderGroups()

    await user.type(
      screen.getByRole('textbox', { name: FIND_TAGS_LABEL }),
      'nothing like this',
    )

    expect(screen.getByText(NO_MATCHING_TAGS_MESSAGE)).toBeInTheDocument()
    // Distinct from having no tags at all: one is cleared by emptying the
    // field, the other by making a tag.
    expect(screen.queryByText(NO_TAGS_MESSAGE)).toBeNull()
  })

  it('keeps a selected tag listed even when it does not match the query', async () => {
    // A selected tag is still narrowing the collection, and a filter the reader
    // cannot see is one they cannot turn off — they would be left looking at a
    // short collection with no visible reason for it.
    const user = userEvent.setup()
    renderGroups({ selectedTags: ['rlhf'] })

    await user.type(
      screen.getByRole('textbox', { name: FIND_TAGS_LABEL }),
      'transf',
    )

    expect(screen.getByRole('button', { name: 'rlhf' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('button', { name: 'transformers' }),
    ).toBeInTheDocument()
  })

  it('still reports a fruitless search, with the selections left showing', async () => {
    const user = userEvent.setup()
    renderGroups({ selectedTags: ['rlhf'] })

    await user.type(
      screen.getByRole('textbox', { name: FIND_TAGS_LABEL }),
      'nothing like this',
    )

    // Both facts, because they are different: the search found nothing, and
    // this tag is still on.
    expect(screen.getByText(NO_MATCHING_TAGS_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'rlhf' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'transformers' })).toBeNull()
  })

  it('offers no find field when there is nothing to find', () => {
    renderGroups({ tags: [] })

    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
