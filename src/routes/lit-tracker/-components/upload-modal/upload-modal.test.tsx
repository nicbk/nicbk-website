import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UploadModal } from './upload-modal'

/**
 * The network call is the seam: `uploadPdfs` is tested on its own, and the
 * e2e tier drives the real endpoint. What matters here is what the modal does
 * with an outcome — close, or show it inline.
 */
const uploadPdfs = vi.hoisted(() => vi.fn())
vi.mock('./upload-request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./upload-request')>()),
  uploadPdfs,
}))

function pdf(name: string) {
  return new File([new Uint8Array(new ArrayBuffer(8))], name, {
    type: 'application/pdf',
  })
}

async function open() {
  const user = userEvent.setup()
  render(<UploadModal />)
  await user.click(screen.getByRole('button', { name: 'Add articles' }))
  return user
}

/** The file input is the modal's only content, and is labelled rather than named. */
function picker(): HTMLInputElement {
  return screen.getByLabelText(/PDFs/i) as HTMLInputElement
}

beforeEach(() => {
  uploadPdfs.mockReset()
  uploadPdfs.mockResolvedValue({ status: 'accepted', count: 1 })
})

describe('UploadModal', () => {
  it('opens a modal containing a multi-select PDF picker', async () => {
    await open()

    const input = picker()
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('multiple')
    expect(input).toHaveAttribute('accept', 'application/pdf')
  })

  it('puts the title and the dismiss control on one row, title first', async () => {
    // Matches the account modal: the two share the card's first row rather than
    // stacking, so a small dialog does not spend a row of height on a control
    // that says nothing.
    await open()

    const title = screen.getByRole('heading', { name: 'add articles' })
    const close = screen.getByRole('button', { name: 'Close' })

    expect(title.parentElement).toBe(close.parentElement)
    expect(
      title.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('submits every selected file in one action', async () => {
    const user = await open()

    await user.upload(picker(), [pdf('a.pdf'), pdf('b.pdf')])
    await user.click(screen.getByRole('button', { name: 'upload 2 PDFs' }))

    expect(uploadPdfs).toHaveBeenCalledTimes(1)
    const submitted = uploadPdfs.mock.calls[0]?.[0] as File[]
    expect(submitted.map((file) => file.name)).toEqual(['a.pdf', 'b.pdf'])
  })

  it('closes immediately once the upload is accepted', async () => {
    const user = await open()

    await user.upload(picker(), [pdf('a.pdf')])
    await user.click(screen.getByRole('button', { name: 'upload 1 PDF' }))

    // No metadata review, no confirmation step: submitting is the last action.
    expect(screen.queryByLabelText(/PDFs/i)).toBeNull()
  })

  it('shows a rejection inline and stays open', async () => {
    uploadPdfs.mockResolvedValue({
      status: 'rejected',
      rejected: [
        { filename: 'cat.png', message: 'Not a PDF: this file is image/png.' },
      ],
    })
    const user = await open()

    await user.upload(picker(), [pdf('cat.png')])
    await user.click(screen.getByRole('button', { name: 'upload 1 PDF' }))

    // Inline beside the picker rather than a toast — the message names a file
    // the user chose, so it belongs where they chose it.
    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('Not a PDF: this file is image/png.')
    expect(error).toHaveTextContent('cat.png')
    expect(picker()).toBeInTheDocument()
  })

  it('reports every rejected file, not only the first', async () => {
    uploadPdfs.mockResolvedValue({
      status: 'rejected',
      rejected: [
        { filename: 'a.png', message: 'Not a PDF.' },
        { filename: 'b.gif', message: 'Not a PDF.' },
      ],
    })
    const user = await open()

    await user.upload(picker(), [pdf('a.png'), pdf('b.gif')])
    await user.click(screen.getByRole('button', { name: 'upload 2 PDFs' }))

    expect(await screen.findAllByRole('alert')).toHaveLength(2)
  })

  it('clears a previous rejection when new files are chosen', async () => {
    uploadPdfs.mockResolvedValue({
      status: 'rejected',
      rejected: [{ filename: 'cat.png', message: 'Not a PDF.' }],
    })
    const user = await open()

    await user.upload(picker(), [pdf('cat.png')])
    await user.click(screen.getByRole('button', { name: 'upload 1 PDF' }))
    await screen.findByRole('alert')

    await user.upload(picker(), [pdf('real.pdf')])

    // Leaving the old message up would read as a verdict on the new selection.
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('cannot be submitted with nothing selected', async () => {
    await open()

    // Nothing chosen is not an error worth a message; the button just has
    // nothing to do. It stays focusable so a keyboard user can find it.
    expect(screen.getByRole('button', { name: 'upload' })).toHaveAttribute(
      'data-disabled',
    )
  })

  it('forgets a previous attempt when reopened', async () => {
    uploadPdfs.mockResolvedValue({
      status: 'rejected',
      rejected: [{ filename: 'cat.png', message: 'Not a PDF.' }],
    })
    const user = await open()

    await user.upload(picker(), [pdf('cat.png')])
    await user.click(screen.getByRole('button', { name: 'upload 1 PDF' }))
    await screen.findByRole('alert')

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Add articles' }))

    expect(screen.queryByRole('alert')).toBeNull()
    expect(picker().files).toHaveLength(0)
  })

  it('is dismissible from the keyboard', async () => {
    const user = await open()

    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText(/PDFs/i)).toBeNull()
  })

  it('returns focus to the trigger on close', async () => {
    const user = await open()

    await user.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: 'Add articles' })).toHaveFocus()
  })
})

/*
 * How the two controls are drawn. jsdom lays nothing out and resolves no custom
 * properties, so what a unit test can hold is the declaration — the rendered
 * geometry is measured in a browser and recorded in the task's status.
 *
 * Comments are stripped before matching: a comment naming a property otherwise
 * satisfies the assertion looking for it (collection-toolbar.test.tsx).
 */
const MODAL_CSS = readFileSync(
  join(__dirname, 'upload-modal.module.css'),
  'utf8',
)
const TOOLBAR_CSS = readFileSync(
  join(__dirname, '../collection-toolbar/collection-toolbar.module.css'),
  'utf8',
)

function declarationsOf(stylesheet: string, selector: string): string {
  const css = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '')
  const start = css.indexOf(`\n${selector} {`)
  if (start === -1) {
    throw new Error(`No \`${selector}\` rule in the stylesheet.`)
  }
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
}

describe('the shape of the add-articles controls', () => {
  it('makes the trigger square without opting out of the row', () => {
    /*
     * It measured 28.4 × 39.5px: an intrinsic width against a height the row
     * handed it through `align-items: stretch`. That stretch is itself a fix —
     * three controls sized to their own contents looked ragged side by side — so
     * squaring the button must not be bought by removing it. `aspect-ratio`
     * keeps both: the row sets the height, the button stays square at it.
     */
    expect(declarationsOf(MODAL_CSS, '.trigger')).toMatch(/aspect-ratio:\s*1\b/)
    expect(declarationsOf(TOOLBAR_CSS, '.controls')).toMatch(
      /align-items:\s*stretch\b/,
    )
  })

  it('reserves the width it draws', () => {
    /*
     * The two declarations above are also what made this button 11.1px wider
     * than the room its row kept for it: the height arrives by stretching and
     * the width follows, but intrinsic sizing runs before there is a height, so
     * the width it *contributed* was its glyph's. The row overran at every
     * width, and on a phone that became a sideways scroll
     * (features/it-fits-the-screen).
     *
     * A floor is the part layout can see, and it must stay — without it the
     * overrun comes back silently, at a width nobody is looking at.
     */
    expect(declarationsOf(MODAL_CSS, '.trigger')).toMatch(
      /min-width:\s*2\.5rem\b/,
    )
  })

  it('draws the field with a dash rather than a solid box', () => {
    // Dashed says "put something here" without words. Solid, on a box this
    // size, reads as a text area — somewhere to type rather than to pick from.
    expect(declarationsOf(MODAL_CSS, '.pickerField')).toMatch(
      /border:\s*1px\s+dashed\b/,
    )
  })

  it('hides the native input without taking it out of reach', () => {
    /*
     * The platform draws `<input type="file">` as its own button hard against
     * "No file chosen", with no spacing to give and no portable way to restyle
     * either part — so the field is a `<label>` and the input is clipped behind
     * it. Clipped, never `display: none`: that would drop the control out of the
     * tab order and out of the accessibility tree, which is how this pattern is
     * usually got wrong.
     */
    const input = declarationsOf(MODAL_CSS, '.pickerInput')

    expect(input).toMatch(/clip-path:\s*inset\(50%\)/)
    expect(input).not.toMatch(/display:\s*none/)
    expect(input).not.toMatch(/visibility:\s*hidden/)
  })

  it('puts the focus ring on the field, not on the clipped input', () => {
    // The input is one pixel. The global :focus-visible ring would draw around
    // something invisible and a keyboard reader would see nothing happen.
    expect(MODAL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')).toMatch(
      /\.pickerInput:focus-visible \+ \.pickerField \{[^}]*outline:/,
    )
  })
})

describe('what the picker field says', () => {
  it('invites a choice before anything is chosen', async () => {
    await open()

    expect(screen.getByText('choose PDFs')).toBeInTheDocument()
  })

  it('names a single file back, rather than counting it', async () => {
    // The useful half of what the platform summary did. One name fits; several
    // would be a column of long paper filenames pushing submit off a phone.
    const user = await open()
    await user.upload(picker(), pdf('attention-is-all-you-need.pdf'))

    expect(
      screen.getByText('attention-is-all-you-need.pdf'),
    ).toBeInTheDocument()
  })

  it('counts them once there is more than one', async () => {
    const user = await open()
    await user.upload(picker(), [pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')])

    expect(screen.getByText('3 PDFs selected')).toBeInTheDocument()
  })
})
