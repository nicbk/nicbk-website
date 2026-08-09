import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Toaster } from './toaster'
import { useErrorToast } from './use-error-toast'

/**
 * The site's toast notifications.
 *
 * Worth its own tests despite being thin, because it is the only place a
 * server-refused write is reported — a toast that silently fails to render is
 * indistinguishable, to the reader, from a write that quietly did not happen.
 */

/** A page with one button that raises a failure toast when pressed. */
function Harness({
  title = 'that did not save',
  message = 'that item is not available to this account.',
}: {
  title?: string
  message?: string
} = {}) {
  return (
    <Toaster>
      <Raiser title={title} message={message} />
    </Toaster>
  )
}

function Raiser({ title, message }: { title: string; message: string }) {
  const showError = useErrorToast()
  return (
    <button type="button" onClick={() => showError({ title, message })}>
      break something
    </button>
  )
}

async function raise(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'break something' }))
}

/**
 * The toasts on screen, by their title.
 *
 * Counting toast *roots* rather than matching text, because Base UI renders each
 * toast's words twice: once in the popup and once in an `alert` live region,
 * which is how it gets announced at all. A bare text query therefore finds two
 * elements per toast, and `getByText` throws on the second copy rather than on
 * a second toast.
 *
 * `hidden: true` because the popup itself carries `aria-hidden` — the live
 * region is what speaks — so Testing Library's role query skips it by default
 * and this would otherwise always find nothing.
 */
function visibleToasts(title: string) {
  return screen
    .queryAllByRole('alertdialog', { hidden: true })
    .filter((toast) => toast.textContent?.includes(title))
}

describe('Toaster', () => {
  it('renders nothing until something goes wrong', () => {
    render(<Harness />)

    // The provider wraps every page on the site, so its resting state has to be
    // genuinely empty rather than an empty box taking up a corner.
    expect(visibleToasts('that did not save')).toHaveLength(0)
  })

  it('shows the title and the message it was given', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await raise(user)

    await waitFor(() => {
      expect(visibleToasts('that did not save')).toHaveLength(1)
    })
    expect(
      screen.getAllByText('that item is not available to this account.').length,
    ).toBeGreaterThan(0)
  })

  it('announces itself urgently, because it is an error', async () => {
    // Base UI's default priority is `low`, which waits for a pause in whatever
    // a screen reader is saying. A write that did not happen should interrupt.
    const user = userEvent.setup()
    render(<Harness />)

    await raise(user)

    const live = await screen.findByRole('alert')
    expect(live).toHaveTextContent('that did not save')
  })

  it('can be dismissed by hand rather than waited out', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await raise(user)
    await waitFor(() => {
      expect(visibleToasts('that did not save')).toHaveLength(1)
    })

    // Reached through the toast rather than by role: the control sits inside
    // the aria-hidden popup, so a name-based role query does not resolve it
    // even with `hidden: true`. A reader gets to it with a pointer, or by
    // stepping into the viewport landmark with F6.
    const [toast] = visibleToasts('that did not save')
    await user.click(within(toast as HTMLElement).getByLabelText('Dismiss'))

    await waitFor(() => {
      expect(visibleToasts('that did not save')).toHaveLength(0)
    })
  })

  it('stacks a second failure rather than replacing the first', async () => {
    // Two cards refused in quick succession is an ordinary thing to do, and
    // losing the first message would lose which article it was about.
    const user = userEvent.setup()
    render(<Harness />)

    await raise(user)
    await raise(user)

    await waitFor(() => {
      expect(visibleToasts('that did not save')).toHaveLength(2)
    })
  })
})
