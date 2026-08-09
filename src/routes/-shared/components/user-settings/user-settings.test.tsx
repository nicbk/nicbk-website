import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserSettings } from './user-settings'

// Better Auth's client is the boundary: the real one would fire requests at a
// server jsdom has no way to reach. Everything else here is the real
// component, including Base UI's dialog behavior.
const { signOut, deleteUser } = vi.hoisted(() => ({
  signOut: vi.fn(),
  deleteUser: vi.fn(),
}))
vi.mock('~/auth/auth-client', () => ({
  authClient: { signOut, deleteUser, signIn: { social: vi.fn() } },
}))

const EMAIL = 'reader@example.com'
const TRIGGER = { name: 'Account settings' }

function renderSettings(
  props: Partial<Parameters<typeof UserSettings>[0]> = {},
) {
  return render(
    <UserSettings email={EMAIL} triggerLabel="Account settings" {...props}>
      account
    </UserSettings>,
  )
}

/** Opens the modal and returns the trigger, which focus must come back to. */
async function openSettings(): Promise<HTMLElement> {
  const trigger = screen.getByRole('button', TRIGGER)
  await userEvent.click(trigger)
  await screen.findByRole('dialog')
  return trigger
}

beforeEach(() => {
  signOut.mockReset()
  signOut.mockResolvedValue({ data: null, error: null })
  deleteUser.mockReset()
  deleteUser.mockResolvedValue({ data: null, error: null })
})

describe('UserSettings', () => {
  it('stays closed until the trigger is used', () => {
    renderSettings()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the signed-in account email', async () => {
    renderSettings()
    await openSettings()

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('signed in as')
    expect(dialog).toHaveTextContent(EMAIL)
  })

  it('offers no editable account fields — the email is display only', async () => {
    renderSettings()
    await openSettings()

    // The delete confirmation field is the only input this modal ever has, and
    // it is not on screen until the destructive action has been asked for.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('names the dialog by its heading', async () => {
    renderSettings()
    await openSettings()

    expect(screen.getByRole('dialog')).toHaveAccessibleName('account')
  })

  it('moves focus into the dialog when it opens', async () => {
    renderSettings()
    await openSettings()

    // Where focus *stays* — the trap — is asserted in the browser
    // (e2e-auth/user-settings.spec.ts) rather than here: jsdom implements
    // neither `inert` nor real sequential focus navigation, so tabbing in it
    // walks straight out of a dialog that traps focus perfectly well in a
    // browser. A passing trap assertion here would be measuring jsdom.
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toContainElement(
        document.activeElement as HTMLElement | null,
      )
    })
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    renderSettings()
    const trigger = await openSettings()

    await userEvent.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(trigger).toHaveFocus()
    })
  })

  it('puts the title and the dismiss control on one row, title first', async () => {
    // They used to stack, which spent a whole row of the card's height on a
    // control that says nothing. Title first so it anchors the corner and the
    // reading order starts with what the dialog *is*.
    renderSettings()
    await openSettings()

    const title = screen.getByRole('heading', { name: 'account' })
    const close = screen.getByRole('button', { name: 'Close settings' })

    expect(title.parentElement).toBe(close.parentElement)
    expect(
      title.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('closes from its own dismiss control, for a pointer or a touch reader', async () => {
    renderSettings()
    await openSettings()

    await userEvent.click(
      screen.getByRole('button', { name: 'Close settings' }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('ends the session when logging out, then tells the caller', async () => {
    const onSignedOut = vi.fn()
    renderSettings({ onSignedOut })
    await openSettings()

    await userEvent.click(screen.getByRole('button', { name: 'log out' }))

    expect(signOut).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(onSignedOut).toHaveBeenCalledTimes(1)
    })
  })

  it('reports a failed log-out inline and leaves the modal usable', async () => {
    signOut.mockResolvedValue({ data: null, error: { message: 'offline' } })
    const onSignedOut = vi.fn()
    renderSettings({ onSignedOut })
    await openSettings()

    await userEvent.click(screen.getByRole('button', { name: 'log out' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Signing out didn't work.",
      )
    })
    expect(onSignedOut).not.toHaveBeenCalled()
    // Still there to try again — the failure was in the request, not the
    // session.
    expect(screen.getByRole('button', { name: 'log out' })).toBeInTheDocument()
  })

  it('forgets a half-typed delete confirmation when reopened', async () => {
    renderSettings()
    await openSettings()

    await userEvent.click(
      screen.getByRole('button', { name: 'delete account' }),
    )
    await userEvent.type(screen.getByRole('textbox'), EMAIL)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await openSettings()

    // Back to a modal that isn't one click from deleting the account.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'delete account' }),
    ).toBeInTheDocument()
  })
})
