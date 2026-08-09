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
