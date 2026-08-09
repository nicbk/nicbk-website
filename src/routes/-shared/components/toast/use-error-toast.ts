import { Toast } from '@base-ui/react/toast'
import { useCallback } from 'react'

/**
 * How a caller raises a failure message, without knowing anything about how
 * toasts are rendered.
 *
 * A narrow wrapper over Base UI's manager on purpose. `toastManager.add` takes a
 * title, a description, a type, a timeout, and a priority, and a caller
 * reaching for it directly would be deciding all five — which is how five
 * call sites end up with five slightly different notions of what an error looks
 * like. There is one kind of toast on this site and this is the only way to
 * raise it.
 *
 * `priority: 'high'` because these are errors: a screen reader should interrupt
 * with them rather than wait for a pause. Base UI's default is `'low'`, which
 * is right for the confirmations this site does not show.
 */
export function useErrorToast(): (message: string) => void {
  const manager = Toast.useToastManager()

  return useCallback(
    (message: string) => {
      manager.add({
        title: 'that did not save',
        description: message,
        priority: 'high',
        type: 'error',
      })
    },
    [manager],
  )
}
