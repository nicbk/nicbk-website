import { Toast } from '@base-ui/react/toast'
import type { ReactNode } from 'react'
import styles from './toaster.module.css'

/**
 * The site's toast notifications: transient, dismissible messages for things
 * that went wrong where there is no form to attach the message to.
 *
 * That is the decided pattern rather than a preference —
 * research/ui-ux/design-system.md distinguishes errors *inside* a form context,
 * which belong inline beside the field, from errors outside one, which are a
 * toast. Nothing on this site had the second kind until the collection view let
 * a reader tag a paper: the write is issued from a menu that closes on its own,
 * so by the time the server refuses it there is nowhere on the page the message
 * could sensibly sit.
 *
 * **Not for success.** A toast that confirms what the reader just watched happen
 * is noise, and this site's reactive surfaces apply live updates silently by
 * decision. The only thing this reports is a failure.
 *
 * Mounted once at the document root, so any page may raise one and they all
 * stack in one viewport rather than fighting over a corner of the screen.
 */
export function Toaster({ children }: { children: ReactNode }) {
  return (
    // Base UI's default is a 5s dismissal, which is the widely-cited floor for
    // reading a short message and is kept. A failure the reader misses is
    // recoverable here: the write did not happen, so the tag they expected is
    // simply not on the card.
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport className={styles.viewport}>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

/**
 * The stack itself.
 *
 * Separate from `Toaster` because `useToastManager` has to be called *inside*
 * the provider — a component cannot read a context it is itself rendering.
 */
function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast} className={styles.toast}>
      <Toast.Content className={styles.content}>
        <div className={styles.text}>
          <Toast.Title className={styles.title} />
          <Toast.Description className={styles.description} />
        </div>
        {/* Every toast is dismissible by hand as well as by timeout, which is
            what the design system asks for: a reader who is mid-task should not
            have to wait out a message they have already read. */}
        <Toast.Close className={styles.close} aria-label="Dismiss">
          ✕
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ))
}
