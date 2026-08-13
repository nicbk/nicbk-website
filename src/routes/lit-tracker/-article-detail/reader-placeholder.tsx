import { FileText } from 'lucide-react'
import styles from './reader-placeholder.module.css'

/** What the empty main area says. Present tense about a real, scheduled thing. */
const PLACEHOLDER_MESSAGE = 'the reader arrives with the next tasks.'

/**
 * The main content area, before there is a reader in it.
 *
 * The decided layout gives this space to the PDF; tasks 2 and 3 fill it. Until
 * then it is **stated rather than hidden**, the same way #7's toolbar reserved
 * the search slot instead of collapsing it — so the page's proportions are the
 * ones it will keep, and task 3 drops a reader into a space that already exists
 * rather than rearranging the page around it.
 *
 * Deliberately not a spinner and not a skeleton: both say "wait", and waiting is
 * not what is happening. Nothing is loading.
 */
export function ReaderPlaceholder() {
  return (
    <div className={styles.placeholder}>
      <FileText className={styles.icon} aria-hidden="true" />
      <p className={styles.message}>{PLACEHOLDER_MESSAGE}</p>
    </div>
  )
}
