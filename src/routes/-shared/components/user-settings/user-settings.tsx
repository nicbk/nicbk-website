import { Button } from '@base-ui/react/button'
import { Dialog } from '@base-ui/react/dialog'
import { Separator } from '@base-ui/react/separator'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { authClient } from '~/auth/auth-client'
import { SIGN_OUT_FAILED_MESSAGE } from './account-action-error'
import { DeleteAccount } from './delete-account'
import styles from './user-settings.module.css'

interface UserSettingsProps {
  /** The signed-in account's email — the modal's only content. */
  email: string
  /**
   * The trigger's contents: an avatar in the Lit-Tracker header (#7), plain
   * text wherever a label reads better. Rendered inside the dialog's trigger
   * button, which Base UI wires to the popup.
   */
  children: ReactNode
  /** Accessible name for the trigger button. */
  triggerLabel?: string
  /**
   * Extra class on the trigger, for the caller to style its own affordance —
   * the modal only strips the browser's default button chrome.
   */
  triggerClassName?: string
  /** Called once the session has ended, so the surrounding page can react. */
  onSignedOut?: (() => void) | undefined
  /** Called once the account has been deleted. */
  onDeleted?: (() => void) | undefined
}

/**
 * The site-wide account surface: a centered modal showing which Google account
 * is signed in, with log-out and delete-account actions
 * (research/ui-ux/pages/site-wide/components/user-settings.md, shaped after
 * research/ui-ux/sample-mockups/popup.png).
 *
 * Account settings are a site concept, not a sub-application's, so this lives
 * with the shared components and every sub-app opens the same one rather than
 * growing its own. It is display-only apart from the two actions — the
 * mockup's "S3 Bucket URL" field was a placeholder from an earlier idea and is
 * deliberately not here, which is also why nothing in this modal has an
 * editing state to reconcile with live reactive data.
 *
 * Built on Base UI's `Dialog`, which supplies the behavior a modal has to get
 * right and which is easy to get subtly wrong by hand: focus trapped inside
 * while open, focus returned to the trigger on close, Escape and outside-click
 * dismissal, page scroll locked, and the popup named by its `Dialog.Title`.
 *
 * The trigger is supplied by the caller. Nothing mounts this yet — the avatar
 * that opens it lives in the Lit-Tracker header and arrives with #7 — so this
 * ships reusable and is exercised in isolation until then.
 */
export function UserSettings({
  email,
  children,
  triggerLabel,
  triggerClassName,
  onSignedOut,
  onDeleted,
}: UserSettingsProps) {
  const [signOutFailure, setSignOutFailure] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function signOut() {
    setSignOutFailure(null)
    setIsSigningOut(true)

    const { error } = await authClient.signOut()

    setIsSigningOut(false)
    if (error) {
      setSignOutFailure(SIGN_OUT_FAILED_MESSAGE)
      return
    }

    onSignedOut?.()
  }

  return (
    // Uncontrolled: the dialog owns its own open state, and the popup is
    // unmounted while closed — which is also what resets the delete
    // confirmation, so a half-typed one is never waiting on reopen.
    <Dialog.Root>
      <Dialog.Trigger
        className={
          triggerClassName === undefined
            ? styles.trigger
            : `${styles.trigger} ${triggerClassName}`
        }
        aria-label={triggerLabel}
      >
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup}>
          {/* Inside the popup, as Base UI requires for modal dialogs, so touch
              screen readers have a way out that isn't the Escape key. */}
          <Dialog.Close className={styles.close} aria-label="Close settings">
            <X className={styles.closeIcon} aria-hidden="true" />
          </Dialog.Close>

          {/* Names the dialog for assistive tech, and is its visible heading. */}
          <Dialog.Title className={styles.title}>account</Dialog.Title>

          <p className={styles.identity}>
            <span className={styles.identityLabel}>signed in as</span>
            <span className={styles.email}>{email}</span>
          </p>

          <Button
            className={styles.action}
            disabled={isSigningOut}
            focusableWhenDisabled
            onClick={signOut}
          >
            {isSigningOut ? 'logging out…' : 'log out'}
          </Button>

          {signOutFailure !== null && (
            <p className={styles.error} role="alert">
              {signOutFailure}
            </p>
          )}

          {/* Separates the everyday action above from the irreversible one
              below, so the two are never one stray click apart. */}
          <Separator className={styles.separator} />

          <DeleteAccount email={email} onDeleted={onDeleted} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
