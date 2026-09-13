import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArticleDetails, EditableArticle } from './article-draft'
import {
  AUTHORS_REQUIRED,
  TITLE_REQUIRED,
  YEAR_NOT_A_YEAR,
} from './article-draft'
import { ArticleEditDialog } from './article-edit-dialog'

/**
 * The form as a reader meets it. Everything it computes is asserted next door in
 * `article-draft.test.ts`; this is about what appears, what is refused, and what
 * the dialog does with the answer it gets back.
 */

const ARTICLE: EditableArticle = {
  id: 'article-1',
  title: 'Attenton Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
  publicationYear: 2017,
  venue: 'NeurIPS',
  doi: null,
}

/** What a failed extraction leaves: a filename for a title, and no authors. */
const FAILED_EXTRACTION: EditableArticle = {
  id: 'article-2',
  title: 'vaswani-attention-2017.pdf',
  authors: [],
  publicationYear: null,
  venue: null,
  doi: null,
}

const onSave = vi.fn<(details: ArticleDetails) => Promise<null>>()

/**
 * The dialog with its open state held above it, as `ArticleMenu` holds it —
 * so a case can assert that a successful save closed the form.
 */
function OpenDialog({
  article = ARTICLE,
  initiallyOpen = true,
}: {
  article?: EditableArticle
  initiallyOpen?: boolean
}) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open it
      </button>
      <ArticleEditDialog
        article={article}
        open={open}
        onOpenChange={setOpen}
        onSave={onSave}
        finalFocus={createRef<HTMLElement>()}
      />
    </>
  )
}

function field(name: string): HTMLInputElement {
  return screen.getByRole('textbox', { name })
}

async function save(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'save' }))
}

beforeEach(() => {
  onSave.mockReset()
  onSave.mockResolvedValue(null)
})

describe('ArticleEditDialog', () => {
  it('is named by its heading', async () => {
    render(<OpenDialog />)

    expect(await screen.findByRole('dialog')).toHaveAccessibleName(
      'edit article',
    )
  })

  it('opens with the article in its fields', async () => {
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    expect(field('title')).toHaveValue('Attenton Is All You Need')
    expect(field('publication year')).toHaveValue('2017')
    expect(field('venue')).toHaveValue('NeurIPS')
    expect(field('DOI')).toHaveValue('')
    expect(field('Author 1')).toHaveValue('Ashish Vaswani')
    expect(field('Author 2')).toHaveValue('Noam Shazeer')
  })

  it('puts the cursor in the title, where a correction starts', async () => {
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    await waitFor(() => {
      expect(field('title')).toHaveFocus()
    })
  })

  it('saves the whole form in one call', async () => {
    const user = userEvent.setup()
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    await user.type(field('title'), 'x')
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      title: 'Attenton Is All You Needx',
      authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
      publicationYear: 2017,
      venue: 'NeurIPS',
      doi: null,
    })
  })

  it('closes once the save lands', async () => {
    const user = userEvent.setup()
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    await save(user)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('what it refuses', () => {
    it('will not save without a title, and says so beside it', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.clear(field('title'))
      await save(user)

      expect(await screen.findByText(TITLE_REQUIRED)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('will not save without an author', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.clear(field('Author 1'))
      await user.clear(field('Author 2'))
      await save(user)

      expect(await screen.findByText(AUTHORS_REQUIRED)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('objects to a year that is not one', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.clear(field('publication year'))
      await user.type(field('publication year'), '2o17')
      await save(user)

      expect(await screen.findByText(YEAR_NOT_A_YEAR)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('says nothing until the reader has tried to save', async () => {
      // A failed extraction opens this form already invalid. Greeting someone
      // with two errors for a mistake a machine made is scolding them for it.
      render(<OpenDialog article={FAILED_EXTRACTION} />)
      await screen.findByRole('dialog')

      expect(screen.queryByText(TITLE_REQUIRED)).not.toBeInTheDocument()
      expect(screen.queryByText(AUTHORS_REQUIRED)).not.toBeInTheDocument()
    })

    it('marks the field itself invalid, not only the message', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.clear(field('title'))
      await save(user)

      await waitFor(() => {
        expect(field('title')).toHaveAttribute('aria-invalid', 'true')
      })
    })
  })

  describe('when the server says no', () => {
    it('stays open and shows the refusal inside the form', async () => {
      // The decided rule: an error inside a form is shown in that form, and a
      // toast is for a write with nowhere to attach one.
      onSave.mockResolvedValue({
        title: 'that did not save',
        message: 'that item is not available to this account.',
      } as never)
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await save(user)

      expect(
        await screen.findByText('that item is not available to this account.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('the author list', () => {
    it('adds a row for a name the extractor missed', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.click(screen.getByRole('button', { name: 'add author' }))
      await user.type(field('Author 3'), 'Niki Parmar')
      await save(user)

      expect(onSave.mock.calls[0]?.[0].authors).toEqual([
        { name: 'Ashish Vaswani' },
        { name: 'Noam Shazeer' },
        { name: 'Niki Parmar' },
      ])
    })

    it('names each remove control for whom it removes', async () => {
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      // Twelve buttons called "Remove" is what this exists to avoid.
      expect(
        screen.getByRole('button', { name: 'Remove Ashish Vaswani' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Remove Noam Shazeer' }),
      ).toBeInTheDocument()
    })

    it('names a blank row by its position instead', async () => {
      render(<OpenDialog article={FAILED_EXTRACTION} />)
      await screen.findByRole('dialog')

      expect(
        screen.getByRole('button', { name: 'Remove author 1' }),
      ).toBeInTheDocument()
    })

    it('removes the row asked for and leaves the other alone', async () => {
      const user = userEvent.setup()
      render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.click(
        screen.getByRole('button', { name: 'Remove Ashish Vaswani' }),
      )
      await save(user)

      expect(onSave.mock.calls[0]?.[0].authors).toEqual([
        { name: 'Noam Shazeer' },
      ])
    })

    it('opens on an empty row when the extraction found no authors', async () => {
      render(<OpenDialog article={FAILED_EXTRACTION} />)
      await screen.findByRole('dialog')

      expect(field('Author 1')).toHaveValue('')
    })
  })

  it('saves the optional fields as typed', async () => {
    const user = userEvent.setup()
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    await user.clear(field('venue'))
    await user.type(field('venue'), 'ICML')
    await user.type(field('DOI'), '10.1145/3292500')
    await save(user)

    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      venue: 'ICML',
      doi: '10.1145/3292500',
    })
  })

  it('clears an optional field to absent rather than to empty text', async () => {
    const user = userEvent.setup()
    render(<OpenDialog />)
    await screen.findByRole('dialog')

    await user.clear(field('venue'))
    await save(user)

    expect(onSave.mock.calls[0]?.[0].venue).toBeNull()
  })

  describe('editing state', () => {
    it('keeps what the reader typed when the article changes underneath', async () => {
      // The decided rule (research/ui-ux/design-system.md): while a field is
      // being edited, an update arriving from sync must not land in it.
      const user = userEvent.setup()
      const { rerender } = render(<OpenDialog />)
      await screen.findByRole('dialog')

      await user.clear(field('title'))
      await user.type(field('title'), 'Attention Is All You Need')
      rerender(
        <OpenDialog
          article={{ ...ARTICLE, title: 'Something Else Entirely' }}
        />,
      )

      expect(field('title')).toHaveValue('Attention Is All You Need')
    })

    it('takes a fresh snapshot each time it is opened', async () => {
      // The other half of the same rule: holding a draft is right *while* the
      // form is open and wrong the next time it opens, when the row may have
      // moved on and the reader is starting again.
      const user = userEvent.setup()
      render(<OpenDialog initiallyOpen={false} />)

      await user.click(screen.getByRole('button', { name: 'open it' }))
      await screen.findByRole('dialog')
      await user.type(field('title'), ' — abandoned')
      await user.click(screen.getByRole('button', { name: 'cancel' }))
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'open it' }))

      await screen.findByRole('dialog')
      expect(field('title')).toHaveValue(ARTICLE.title)
    })

    it('forgets a validation message from a previous visit', async () => {
      const user = userEvent.setup()
      render(<OpenDialog initiallyOpen={false} />)
      await user.click(screen.getByRole('button', { name: 'open it' }))
      await screen.findByRole('dialog')
      await user.clear(field('title'))
      await save(user)
      await screen.findByText(TITLE_REQUIRED)
      await user.click(screen.getByRole('button', { name: 'cancel' }))
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'open it' }))

      await screen.findByRole('dialog')
      expect(screen.queryByText(TITLE_REQUIRED)).not.toBeInTheDocument()
    })
  })
})
