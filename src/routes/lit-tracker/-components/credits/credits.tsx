import { Popover } from '@base-ui/react/popover'
import { ExternalLink, Info } from 'lucide-react'
import styles from './credits.module.css'

const SEMANTIC_SCHOLAR_HOME = 'https://www.semanticscholar.org'

/**
 * The tracker's credits: an information button in the header that opens who the
 * tracker's data comes from.
 *
 * **Semantic Scholar's licence asks for attribution "on its website"** — not on
 * each page that shows its data (research/licensing/
 * third-party-attribution-requirements.md, re-read 2026-09-15). The credit
 * first sat at the foot of the citations view, where it cost a row of the
 * reader's panel on every visit to say something needed once. Here it is
 * reachable from every tracker page and costs one icon (user-decided
 * 2026-09-15).
 *
 * Tracker-only: the personal site shows no Semantic Scholar data.
 */
export function Credits() {
  return (
    <Popover.Root>
      <Popover.Trigger className={styles.trigger} aria-label="credits">
        <Info className={styles.icon} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className={styles.popup}>
            <Popover.Title className={styles.title}>credits</Popover.Title>
            <p className={styles.line}>
              paper metadata and citations from{' '}
              <a
                href={SEMANTIC_SCHOLAR_HOME}
                target="_blank"
                rel="noopener noreferrer"
              >
                Semantic Scholar
                <ExternalLink className={styles.external} aria-hidden="true" />
                <span className={styles.visuallyHidden}>
                  {' '}
                  (opens in a new tab)
                </span>
              </a>
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
