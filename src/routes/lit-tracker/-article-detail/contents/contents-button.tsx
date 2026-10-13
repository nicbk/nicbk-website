import { ListTree } from 'lucide-react'
import styles from './contents-button.module.css'

/**
 * The reader toolbar's way to the paper's contents
 * (features/a-paper-shows-its-contents, task `the-toolbar-opens-the-contents`).
 *
 * **One list, two ways to reach it.** This opens the sidebar's contents tab —
 * the rail's, or the sheet's on a narrow screen — and is not a second outline
 * of its own. What opening means is the page's to decide (`onOpen`), because
 * the sidebar is the page's and the reader knows nothing of it.
 *
 * A glyph and a word, like the *annotate* trigger beside it, and like it the
 * word gives way to the glyph at the toolbar's narrow breakpoint; the name stays
 * the word either way.
 */
export function ContentsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.button}
        onClick={onOpen}
        aria-label="contents"
        title="contents"
      >
        <ListTree className={styles.icon} aria-hidden="true" />
        <span className={styles.label}>contents</span>
      </button>
    </div>
  )
}
