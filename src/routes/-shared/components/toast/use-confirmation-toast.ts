import { Toast } from '@base-ui/react/toast'
import { useCallback } from 'react'

/**
 * Confirming something the reader could not see happen.
 *
 * The toaster exists for failures, and its rule against success toasts stands
 * for what it was written against: a confirmation of something the reader just
 * **watched** happen is noise. A copy is the exception that rule does not reach
 * — the clipboard is invisible, so without a word the click on a paper's link
 * looks like it did nothing at all. Decided with the user for #22, 2026-09-14.
 *
 * A title only: "link copied" is the whole message, and a description would be
 * a second sentence saying the same thing.
 *
 * `priority: 'low'`, Base UI's default, stated anyway: a confirmation waits for a
 * screen reader's pause rather than interrupting it, which is what separates it
 * from the error toast beside this file.
 */
export function useConfirmationToast(): (title: string) => void {
  const manager = Toast.useToastManager()

  return useCallback(
    (title: string) => {
      manager.add({
        title,
        priority: 'low',
        type: 'confirmation',
      })
    },
    [manager],
  )
}
