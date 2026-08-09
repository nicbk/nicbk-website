import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeleteTagDialog } from './delete-tag-dialog'

/**
 * The confirmation standing in front of an irreversible write.
 *
 * Asserted against an injected callback: that a confirmed delete actually
 * deletes — and cascades to every `article_tags` row — is task 2's integration
 * suite, which runs the mutator against a real Postgres. What matters here is
 * that nothing is called until the reader says so.
 */

const TAG = { id: 't1', name: 'rlhf' }

function renderDialog(articleCount = 3) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()

  render(
    <DeleteTagDialog
      tag={TAG}
      articleCount={articleCount}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )

  return { onConfirm, onCancel, user: userEvent.setup() }
}

describe('DeleteTagDialog', () => {
  it('asks before anything happens', () => {
    const { onConfirm } = renderDialog()

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('names the tag and how many articles carry it', () => {
    // "delete rlhf?" and "delete rlhf, which is on 3 papers?" are different
    // questions, and only the second one can be answered.
    renderDialog(3)

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('delete “rlhf”?')
    expect(dialog).toHaveTextContent('it will be removed from 3 articles.')
  })

  it('reads correctly for a single article', () => {
    renderDialog(1)

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'it will be removed from 1 article.',
    )
  })

  it('says plainly when nothing carries the tag', () => {
    renderDialog(0)

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'no articles carry this tag.',
    )
  })

  it('opens with focus on cancel, not on the button that deletes', async () => {
    // Base UI focuses the first tabbable element by default, which is the
    // destructive one — so a reflexive Enter after a mis-clicked `×` would
    // confirm the very thing the dialog exists to question. Awaited because the
    // dialog moves focus after it has mounted, not during.
    renderDialog()

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'cancel' }),
      ),
    )
  })

  it('reports the tag once confirmed', async () => {
    const { onConfirm, user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'delete tag' }))

    expect(onConfirm).toHaveBeenCalledWith(TAG)
  })

  it('deletes nothing when cancelled', async () => {
    const { onConfirm, onCancel, user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'cancel' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it('deletes nothing when dismissed with Escape', async () => {
    // The reflex dismissal, and the one a native `confirm()` would answer with
    // "OK" as readily as with "Cancel".
    const { onConfirm, onCancel, user } = renderDialog()

    await user.keyboard('{Escape}')

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows nothing at all when no tag is pending', () => {
    render(
      <DeleteTagDialog
        tag={null}
        articleCount={0}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
