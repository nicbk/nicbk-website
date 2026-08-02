import { useState } from 'react'
import { UserSettings } from '~/routes/-shared/components/user-settings/user-settings'
import { avatarInitial } from './initial'
import styles from './account-avatar.module.css'

export interface AvatarAccount {
  name: string
  email: string
  /** The Google profile picture URL, as Better Auth stored it. Often absent. */
  image?: string | null | undefined
}

interface AccountAvatarProps {
  account: AvatarAccount
  /** Called once the session ends, so the guarded page can leave. */
  onSignedOut?: (() => void) | undefined
  /** Called once the account is deleted. */
  onDeleted?: (() => void) | undefined
}

/**
 * The account control at the foot of the Lit Tracker's sidebar, and the only
 * trigger for the shared user-settings modal anywhere on the site
 * (research/ui-ux/pages/lit-tracker/components/header.md, and the bottom-left
 * avatar in research/ui-ux/sample-mockups/literature-tracker-sample.png).
 *
 * It shows the signed-in Google account's own picture. Two things make that
 * safe to rely on rather than fragile:
 *
 *  - `image` is nullable — Better Auth stores whatever Google sent, and Google
 *    does not always send one.
 *  - Even when present it is a third-party URL that can fail: the CDN
 *    rate-limits, and content blockers routinely stop `googleusercontent.com`
 *    outright.
 *
 * So the letter is not a lesser fallback bolted on afterwards; it is the
 * component's resting state, with the picture layered over it when one loads.
 * A failed load switches back rather than leaving a broken-image glyph.
 *
 * `referrerPolicy="no-referrer"` keeps the current URL from travelling to
 * Google with the request — this is a page that only exists for signed-in
 * readers, and which article they are looking at is not Google's business.
 */
export function AccountAvatar({
  account,
  onSignedOut,
  onDeleted,
}: AccountAvatarProps) {
  const [pictureFailed, setPictureFailed] = useState(false)
  const picture = pictureFailed ? null : (account.image ?? null)

  return (
    <UserSettings
      email={account.email}
      triggerLabel="Account settings"
      triggerClassName={styles.avatar}
      onSignedOut={onSignedOut}
      onDeleted={onDeleted}
    >
      {picture === null ? (
        // Decoration: the trigger is already named by `triggerLabel`, and
        // announcing "N" after it would say nothing.
        <span aria-hidden="true">{avatarInitial(account)}</span>
      ) : (
        <img
          className={styles.picture}
          src={picture}
          alt=""
          width={32}
          height={32}
          referrerPolicy="no-referrer"
          onError={() => {
            setPictureFailed(true)
          }}
        />
      )}
    </UserSettings>
  )
}
