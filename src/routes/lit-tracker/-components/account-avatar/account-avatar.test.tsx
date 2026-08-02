import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AccountAvatar } from './account-avatar'

const ACCOUNT = {
  name: 'Nicolás Kennedy',
  email: 'nicbk@example.com',
  image: 'https://lh3.googleusercontent.com/a/portrait',
}

describe('AccountAvatar', () => {
  it('shows the Google profile picture when there is one', () => {
    render(<AccountAvatar account={ACCOUNT} />)

    const picture = screen.getByRole('button', {
      name: 'Account settings',
    }).firstElementChild
    expect(picture).toHaveAttribute('src', ACCOUNT.image)
    // Decorative: the button is already named, so announcing the image again
    // would just repeat it.
    expect(picture).toHaveAttribute('alt', '')
    // The current URL is not Google's business — this page only exists for
    // signed-in readers.
    expect(picture).toHaveAttribute('referrerpolicy', 'no-referrer')
  })

  it('falls back to the initial when the account has no picture', () => {
    render(<AccountAvatar account={{ ...ACCOUNT, image: null }} />)

    expect(
      screen.getByRole('button', { name: 'Account settings' }),
    ).toHaveTextContent('N')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('falls back to the initial when the picture fails to load', () => {
    // Google's CDN rate-limits, and content blockers stop googleusercontent.com
    // outright. Either way the reader must not be left with a broken-image
    // glyph where their account control should be.
    render(<AccountAvatar account={ACCOUNT} />)
    const trigger = screen.getByRole('button', { name: 'Account settings' })

    const picture = trigger.firstElementChild
    expect(picture).not.toBeNull()
    fireEvent.error(picture as Element)

    expect(trigger).toHaveTextContent('N')
    expect(trigger.querySelector('img')).toBeNull()
  })

  it('opens the shared settings modal', async () => {
    // The loop #6 left open: the modal shipped with nothing to trigger it.
    const user = userEvent.setup()
    render(<AccountAvatar account={ACCOUNT} />)

    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Account settings' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent(ACCOUNT.email)
  })
})
