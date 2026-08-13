import { FileText, FileWarning } from 'lucide-react'
import type { ReaderState } from './reader-state'
import styles from './reader-notice.module.css'

/**
 * What the reader's panel says while there is no paper on it.
 *
 * Three of the four states are visible here, and the one that matters is
 * `failed`: a document that cannot be fetched must never read as a slow
 * connection, or an article whose PDF is missing looks like a network problem
 * forever. So failing changes the icon, the words, and the color — three
 * signals rather than one, as
 * research/accessibility/color-contrast-and-focus-visibility.md requires.
 *
 * The two waits are named separately because they are separate: the engine is a
 * WebAssembly binary that downloads once per session, and the paper is a fetch
 * that happens per article. Saying which one is happening is the difference
 * between a wait that makes sense and an unexplained pause.
 *
 * Nothing here animates, matching `TrackerLoading`'s reasoning — the motion
 * convention makes animation opt-in, and a spinner in a panel this size would
 * be the loudest thing on the page.
 */

const MESSAGES: Record<Exclude<ReaderState, 'ready'>, string> = {
  starting: 'starting the reader…',
  loading: 'loading the paper…',
  failed: 'this paper could not be loaded.',
}

interface ReaderNoticeProps {
  state: ReaderState
}

export function ReaderNotice({ state }: ReaderNoticeProps) {
  // A reader with the paper on screen has nothing to say. Taking the full state
  // and answering `ready` with nothing keeps every call site free of a branch
  // for a case it cannot produce.
  if (state === 'ready') {
    return null
  }

  const failed = state === 'failed'

  return (
    <div
      className={failed ? `${styles.notice} ${styles.failed}` : styles.notice}
      // Waiting is announced politely; failing interrupts, because a reader who
      // has moved on to the sidebar still needs to know the paper is not coming.
      role={failed ? 'alert' : 'status'}
    >
      {failed ? (
        <FileWarning className={styles.icon} aria-hidden="true" />
      ) : (
        <FileText className={styles.icon} aria-hidden="true" />
      )}
      <p className={styles.message}>{MESSAGES[state]}</p>
    </div>
  )
}
