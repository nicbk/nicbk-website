import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignInPage } from './sign-in-page'

// The button's whole job is to hand off to Better Auth, so that hand-off is the
// boundary these tests replace: the real client would try to navigate jsdom to
// Google.
const { signInSocial } = vi.hoisted(() => ({ signInSocial: vi.fn() }))
vi.mock('~/auth/auth-client', () => ({
  authClient: { signIn: { social: signInSocial } },
}))

const GOOGLE_BUTTON = { name: 'sign in with Google' }

beforeEach(() => {
  signInSocial.mockReset()
  signInSocial.mockResolvedValue({ data: null, error: null })
})

describe('SignInPage', () => {
  it('exposes exactly one main heading for structure and focus handoff', () => {
    render(<SignInPage />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('sign in')
  })

  it('explains why signing in is needed', () => {
    render(<SignInPage />)
    expect(
      screen.getByText(/only needed for the academic literature tracker/i),
    ).toBeInTheDocument()
  })

  it('offers a Google sign-in button with a discernible name', () => {
    render(<SignInPage />)
    expect(screen.getByRole('button', GOOGLE_BUTTON)).toBeEnabled()
  })

  it('starts Better Auth’s Google flow, returning to where the user came from', async () => {
    render(<SignInPage returnTo="/lit/collection?sort=recent" />)
    await userEvent.click(screen.getByRole('button', GOOGLE_BUTTON))

    expect(signInSocial).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/lit/collection?sort=recent',
      errorCallbackURL: '/sign-in',
    })
  })

  it('never hands an off-site destination to Better Auth', async () => {
    render(<SignInPage returnTo="https://evil.example/phish" />)
    await userEvent.click(screen.getByRole('button', GOOGLE_BUTTON))

    expect(signInSocial).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: '/' }),
    )
  })

  it('defaults the destination when none was carried in', async () => {
    render(<SignInPage />)
    await userEvent.click(screen.getByRole('button', GOOGLE_BUTTON))

    expect(signInSocial).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: '/' }),
    )
  })

  it('shows no error before anything has gone wrong', () => {
    render(<SignInPage />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a failed callback as an inline error tied to the button', () => {
    render(<SignInPage error="state_mismatch" />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("Sign-in didn't complete.")
    // Programmatically associated, not merely nearby: a screen-reader user who
    // tabs to the button hears why the last attempt failed.
    expect(
      screen.getByRole('button', GOOGLE_BUTTON),
    ).toHaveAccessibleDescription("Sign-in didn't complete. Please try again.")
  })

  it('says a cancelled sign-in was cancelled, not that it broke', () => {
    render(<SignInPage error="access_denied" />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sign-in was cancelled.',
    )
  })

  it('reports a request that never reached Google inline as well', async () => {
    signInSocial.mockResolvedValue({
      data: null,
      error: { message: 'offline' },
    })
    render(<SignInPage />)
    await userEvent.click(screen.getByRole('button', GOOGLE_BUTTON))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Sign-in didn't complete.",
      )
    })
    // The attempt failed here rather than at Google, so the user must be able
    // to try again.
    expect(screen.getByRole('button', GOOGLE_BUTTON)).toBeEnabled()
  })

  it('does not start a second flow while the first is redirecting', async () => {
    render(<SignInPage />)
    const button = screen.getByRole('button', GOOGLE_BUTTON)

    await userEvent.click(button)
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
    await userEvent.click(button)

    expect(signInSocial).toHaveBeenCalledTimes(1)
  })
})
