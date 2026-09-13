import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ArticleDeleteDialog,
  DELETE_CONFIRMATION,
} from './article-delete-dialog'

/**
 * The confirmation, as a reader meets it.
 *
 * The comparison itself is `confirmation-match.test.ts`'s; this is about what
 * the gate does with the answer — which is the part that would ship as a
 * one-click delete if it were wrong.
 */

const TITLE = 'Attention Is All You Need'

const onDelete = vi.fn()

function OpenDialog({ initiallyOpen = true }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open it
      </button>
      <ArticleDeleteDialog
        articleTitle={TITLE}
        open={open}
        onOpenChange={setOpen}
        onDelete={onDelete}
        finalFocus={createRef<HTMLElement>()}
      />
    </>
  )
}

function confirmButton(): HTMLElement {
  return screen.getByRole('button', { name: 'delete article' })
}

function field(): HTMLElement {
  return screen.getByRole('textbox', { name: `type ${DELETE_CONFIRMATION}` })
}

beforeEach(() => {
  onDelete.mockReset()
})

describe('ArticleDeleteDialog', () => {
  it('is named by its heading', async () => {
    render(<OpenDialog />)

    expect(await screen.findByRole('dialog')).toHaveAccessibleName(
      'delete article',
    )
  })

  it('names the paper it is about, and what goes with it', async () => {
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    const warning = screen.getByText(/permanently deletes/)
    expect(warning).toHaveTextContent(TITLE)
    // More than the card: a warning that mentions only the article understates
    // what the reader is about to lose.
    expect(warning).toHaveTextContent(/PDF/)
    expect(warning).toHaveTextContent(/annotations/)
  })

  it('puts the cursor in the field, which is all it asks for', async () => {
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    await waitFor(() => {
      expect(field()).toHaveFocus()
    })
  })

  describe('the gate', () => {
    it('does nothing until the word is typed', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.click(confirmButton())

      expect(onDelete).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it.each([
      ['nothing typed', ''],
      ['the wrong case', 'Delete'],
      ['a trailing character', 'deletee'],
      ['surrounding space', ' delete '],
      ['the article’s title, which is not the phrase', TITLE],
    ])('stays shut for %s', async (_case, typed) => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      if (typed !== '') {
        await user.type(field(), typed)
      }
      await user.click(confirmButton())

      expect(onDelete).not.toHaveBeenCalled()
    })

    it('deletes once the word matches exactly', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.type(field(), DELETE_CONFIRMATION)
      await user.click(confirmButton())

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('accepts Enter from the field, which is where the reader already is', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.type(field(), `${DELETE_CONFIRMATION}{Enter}`)

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('keeps the inert button reachable and says it is unavailable', async () => {
      // Natively disabled, it would leave the tab order, and a reader
      // navigating by keyboard would never learn the action exists — let alone
      // that typing a word is what unlocks it.
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      expect(confirmButton()).toHaveAttribute('aria-disabled', 'true')
      expect(confirmButton()).not.toHaveAttribute('disabled')
      expect(confirmButton()).toHaveAccessibleDescription(/cannot be undone/)
    })
  })

  it('closes as the delete is sent, rather than waiting for the server', async () => {
    // Zero has already taken the card out of the grid by now; a modal held open
    // over that would be asking about something already done.
    const user = userEvent.setup()
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    await user.type(field(), DELETE_CONFIRMATION)
    await user.click(confirmButton())

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('cancels without deleting', async () => {
    const user = userEvent.setup()
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    await user.type(field(), DELETE_CONFIRMATION)
    await user.click(screen.getByRole('button', { name: 'cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('opens empty the next time, however far the last visit got', async () => {
    // The same lesson task 1's form learned, and it matters more here: a
    // confirmation left half-typed is a destructive action one keystroke from
    // ready that the reader did not start.
    const user = userEvent.setup()
    render(<OpenDialog initiallyOpen={false} />)

    await user.click(screen.getByRole('button', { name: 'open it' }))
    await screen.findByRole('dialog')
    await user.type(field(), DELETE_CONFIRMATION)
    await user.click(screen.getByRole('button', { name: 'cancel' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'open it' }))

    await screen.findByRole('dialog')
    expect(field()).toHaveValue('')
    expect(confirmButton()).toHaveAttribute('aria-disabled', 'true')
  })
})
