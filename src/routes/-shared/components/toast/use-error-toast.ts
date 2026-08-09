import { Toast } from '@base-ui/react/toast'
import { useCallback } from 'react'

/** What a failure toast says, in the two shapes a failure comes in. */
export interface ErrorToast {
  /**
   * The scannable half — what happened, in three or four words.
   *
   * Worth getting right rather than fixing at "that did not save": a write the
   * sync engine has queued and will retry *has not failed*, and telling a reader
   * it did is a lie they may act on by doing the work again.
   */
  title: string
  /** The sentence under it: what it means, and what to do if anything. */
  message: string
}

/**
 * How a caller raises a failure message, without knowing anything about how
 * toasts are rendered.
 *
 * A narrow wrapper over Base UI's manager on purpose. `toastManager.add` takes a
 * title, a description, a type, a timeout, and a priority, and a caller reaching
 * for it directly would be deciding all five — which is how five call sites end
 * up with five slightly different notions of what an error looks like. The
 * caller here decides the two things only it can know; this decides the rest.
 *
 * `priority: 'high'` because these are errors: a screen reader should interrupt
 * with them rather than wait for a pause. Base UI's default is `'low'`, which is
 * right for the confirmations this site does not show.
 */
export function useErrorToast(): (toast: ErrorToast) => void {
  const manager = Toast.useToastManager()

  return useCallback(
    ({ title, message }: ErrorToast) => {
      manager.add({
        title,
        description: message,
        priority: 'high',
        type: 'error',
      })
    },
    [manager],
  )
}
