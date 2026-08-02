import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteAccount } from './delete-account'

// Better Auth's client is the boundary: one call really would delete an
// account, and the re-authentication path really would navigate to Google.
const { deleteUser, signInSocial } = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  signInSocial: vi.fn(),
}))
vi.mock('~/auth/auth-client', () => ({
  authClient: { deleteUser, signIn: { social: signInSocial } },
}))

const EMAIL = 'reader@example.com'
const DELETE_BUTTON = { name: 'delete account' }

/** Opens the inline confirmation and returns its text field. */
async function startConfirming(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', DELETE_BUTTON))
  return screen.getByRole('textbox')
}

/** The confirm button is inert via aria-disabled, not the disabled attribute. */
function expectInert(button: HTMLElement, inert: boolean): void {
  expect(button).toHaveAttribute('aria-disabled', String(inert))
}

beforeEach(() => {
  deleteUser.mockReset()
  deleteUser.mockResolvedValue({ data: null, error: null })
  signInSocial.mockReset()
  signInSocial.mockResolvedValue({ data: null, error: null })
})

describe('DeleteAccount', () => {
  it('asks for nothing until the destructive action is chosen', () => {
    render(<DeleteAccount email={EMAIL} />)

    expect(screen.getByRole('button', DELETE_BUTTON)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('asks the reader to type their own address, and says why', async () => {
    render(<DeleteAccount email={EMAIL} />)
    const field = await startConfirming()

    expect(field).toHaveAccessibleName('your email address')
    expect(
      screen.getByText(/permanently deletes your account/i),
    ).toHaveTextContent(EMAIL)
  })

  it('keeps the confirm button inert — but reachable — until the match is exact', async () => {
    render(<DeleteAccount email={EMAIL} />)
    const field = await startConfirming()
    const confirm = screen.getByRole('button', DELETE_BUTTON)

    expectInert(confirm, true)
    // aria-disabled rather than the disabled attribute, so a screen-reader
    // user can still find the control and hear that it is unavailable.
    expect(confirm).not.toHaveAttribute('disabled')
    expect(confirm).toHaveAccessibleDescription(
      /permanently deletes your account/i,
    )

    await userEvent.type(field, 'reader@example.co')
    expectInert(confirm, true)

    await userEvent.type(field, 'm')
    await waitFor(() => {
      expectInert(confirm, false)
    })
  })

  it('does nothing when the inert confirm button is clicked anyway', async () => {
    render(<DeleteAccount email={EMAIL} />)
    const field = await startConfirming()
    await userEvent.type(field, 'Reader@Example.com')

    await userEvent.click(screen.getByRole('button', DELETE_BUTTON))

    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('deletes the account once the confirmation matches, then tells the caller', async () => {
    const onDeleted = vi.fn()
    render(<DeleteAccount email={EMAIL} onDeleted={onDeleted} />)
    const field = await startConfirming()
    await userEvent.type(field, EMAIL)

    await userEvent.click(screen.getByRole('button', DELETE_BUTTON))

    expect(deleteUser).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1)
    })
  })

  it('backs out cleanly on cancel, forgetting what was typed', async () => {
    render(<DeleteAccount email={EMAIL} />)
    const field = await startConfirming()
    await userEvent.type(field, EMAIL)

    await userEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    // Reopening starts from a blank field, not from a filled-in one that is
    // one click away from deleting the account.
    const reopened = await startConfirming()
    expect(reopened).toHaveValue('')
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('reports an ordinary failure inline and leaves the confirmation standing', async () => {
    deleteUser.mockResolvedValue({
      data: null,
      error: { code: 'FAILED_TO_GET_SESSION', message: 'nope' },
    })
    const onDeleted = vi.fn()
    render(<DeleteAccount email={EMAIL} onDeleted={onDeleted} />)
    const field = await startConfirming()
    await userEvent.type(field, EMAIL)

    await userEvent.click(screen.getByRole('button', DELETE_BUTTON))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Deleting your account didn't work.",
      )
    })
    expect(onDeleted).not.toHaveBeenCalled()
    // The typed confirmation survives, so retrying is one click and not a
    // whole transcription again.
    expect(screen.getByRole('textbox')).toHaveValue(EMAIL)
    expect(
      screen.queryByRole('button', { name: 'sign in again' }),
    ).not.toBeInTheDocument()
  })

  it('offers a way back through Google when the session is too old to delete with', async () => {
    deleteUser.mockResolvedValue({
      data: null,
      error: { code: 'SESSION_EXPIRED', message: 'stale' },
    })
    render(<DeleteAccount email={EMAIL} />)
    const field = await startConfirming()
    await userEvent.type(field, EMAIL)

    await userEvent.click(screen.getByRole('button', DELETE_BUTTON))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'For security, sign in again',
      )
    })
    // Retrying the same request cannot help here, so this failure — alone —
    // comes with the action that can.
    await userEvent.click(screen.getByRole('button', { name: 'sign in again' }))
    expect(signInSocial).toHaveBeenCalledWith({
      provider: 'google',
      // jsdom serves the tests from "/", which is where the reader returns to.
      callbackURL: '/',
    })
  })

  it('reports a re-authentication that never got started', async () => {
    deleteUser.mockResolvedValue({
      data: null,
      error: { code: 'SESSION_EXPIRED', message: 'stale' },
    })
    signInSocial.mockResolvedValue({
      data: null,
      error: { message: 'offline' },
    })
    render(<DeleteAccount email={EMAIL} />)
    const field = await startConfirming()
    await userEvent.type(field, EMAIL)
    await userEvent.click(screen.getByRole('button', DELETE_BUTTON))
    await screen.findByRole('button', { name: 'sign in again' })

    await userEvent.click(screen.getByRole('button', { name: 'sign in again' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Starting sign-in didn't work.",
      )
    })
  })

  it('does not fire a second delete while the first is in flight', async () => {
    let finishDelete: (result: { data: null; error: null }) => void = () => {}
    deleteUser.mockReturnValue(
      new Promise((resolve) => {
        finishDelete = resolve
      }),
    )
    render(<DeleteAccount email={EMAIL} />)
    const field = await startConfirming()
    await userEvent.type(field, EMAIL)

    const confirm = screen.getByRole('button', DELETE_BUTTON)
    await userEvent.click(confirm)
    await waitFor(() => {
      expectInert(screen.getByRole('button', { name: 'deleting…' }), true)
    })
    await userEvent.click(screen.getByRole('button', { name: 'deleting…' }))

    expect(deleteUser).toHaveBeenCalledTimes(1)
    finishDelete({ data: null, error: null })
  })
})
