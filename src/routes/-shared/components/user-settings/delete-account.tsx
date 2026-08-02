import { Button } from '@base-ui/react/button'
import { Field } from '@base-ui/react/field'
import { Input } from '@base-ui/react/input'
import { useId, useState } from 'react'
import { authClient } from '~/auth/auth-client'
import { sanitizeReturnTo } from '~/auth/return-to'
import {
  deleteFailedMessage,
  isStaleSessionError,
  SIGN_IN_AGAIN_FAILED_MESSAGE,
} from './account-action-error'
import { matchesConfirmation } from './confirmation-match'
import styles from './delete-account.module.css'

/**
 * `idle` — the destructive action is one click away but nothing has been asked
 * for yet. `confirming` — the phrase is being typed. `deleting` — the request
 * is in flight and every control is inert so a second one can't be started.
 */
type Phase = 'idle' | 'confirming' | 'deleting'

interface DeleteAccountProps {
  /**
   * The signed-in account's email: both what gets deleted and the phrase that
   * has to be typed back to confirm it.
   */
  email: string
  /**
   * Called once the account is gone, so the surrounding page can leave — there
   * is nothing signed-in left to show.
   */
  onDeleted?: (() => void) | undefined
}

/**
 * The delete-account half of the settings modal: an inline "are you sure" that
 * only unlocks once the account's own email has been typed back exactly
 * (research/ui-ux/pages/site-wide/components/user-settings.md).
 *
 * Deliberately not a native `confirm()` — that dialog is unstyleable, easy to
 * dismiss by reflex, and asks for a click rather than an act of transcription.
 * Typing the address is slow on purpose: it is the last thing standing between
 * a misclick and an account that no longer exists.
 *
 * The confirm button is kept **focusable while inert** rather than natively
 * disabled (Base UI's `focusableWhenDisabled`, which renders `aria-disabled`
 * instead of `disabled`). A natively disabled button vanishes from the tab
 * order, so a screen-reader user tabbing through would never learn the action
 * exists, let alone that typing the address is what unlocks it — the button
 * stays reachable, announces itself as disabled, and points at the explanation
 * that says why.
 */
export function DeleteAccount({ email, onDeleted }: DeleteAccountProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [typed, setTyped] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  // A stale session can't be fixed by trying again, only by proving who you
  // are again — so that failure, alone, offers a way to do it.
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const explanationId = useId()

  const confirmed = matchesConfirmation(typed, email)

  function startConfirming() {
    setTyped('')
    setFailure(null)
    setNeedsSignIn(false)
    setPhase('confirming')
  }

  function cancel() {
    setTyped('')
    setFailure(null)
    setNeedsSignIn(false)
    setPhase('idle')
  }

  async function deleteAccount() {
    // Belt and braces: the button is inert unless this holds, but the rule
    // that guards an irreversible action shouldn't live only in a disabled
    // attribute.
    if (!confirmed) {
      return
    }

    setFailure(null)
    setNeedsSignIn(false)
    setPhase('deleting')

    const { error } = await authClient.deleteUser()

    if (error) {
      setFailure(deleteFailedMessage(error.code))
      setNeedsSignIn(isStaleSessionError(error.code))
      setPhase('confirming')
      return
    }

    onDeleted?.()
  }

  async function signInAgain() {
    // Back to where the modal was opened from, so the reader returns to the
    // page they were on with a session fresh enough to delete with. Sanitized
    // through the same helper the sign-in page uses, since this becomes a
    // redirect target.
    const returnTo = sanitizeReturnTo(
      `${window.location.pathname}${window.location.search}`,
    )
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: returnTo,
    })
    if (error) {
      setFailure(SIGN_IN_AGAIN_FAILED_MESSAGE)
    }
    // On success the browser is already on its way to Google.
  }

  return (
    <div className={styles.section}>
      {phase === 'idle' ? (
        <Button className={styles.destructive} onClick={startConfirming}>
          delete account
        </Button>
      ) : (
        <>
          <p className={styles.explanation} id={explanationId}>
            This permanently deletes your account and cannot be undone. Type{' '}
            {email} below to confirm.
          </p>

          <Field.Root className={styles.field}>
            <Field.Label className={styles.label}>
              your email address
            </Field.Label>
            <Input
              className={styles.input}
              value={typed}
              autoComplete="off"
              disabled={phase === 'deleting'}
              onValueChange={(next) => setTyped(next)}
            />
          </Field.Root>

          <div className={styles.buttons}>
            <Button
              className={styles.destructive}
              disabled={!confirmed || phase === 'deleting'}
              focusableWhenDisabled
              aria-describedby={explanationId}
              onClick={deleteAccount}
            >
              {phase === 'deleting' ? 'deleting…' : 'delete account'}
            </Button>
            <Button
              className={styles.cancel}
              disabled={phase === 'deleting'}
              focusableWhenDisabled
              onClick={cancel}
            >
              cancel
            </Button>
          </div>
        </>
      )}

      {failure !== null && (
        <p className={styles.error} role="alert">
          {failure}
        </p>
      )}

      {needsSignIn && (
        <Button className={styles.cancel} onClick={signInAgain}>
          sign in again
        </Button>
      )}
    </div>
  )
}
