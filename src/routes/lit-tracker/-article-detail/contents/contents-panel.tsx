import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import type { ContentsEntry } from '~/lit-tracker/contents/contents'
import { useReadingLine } from '../reader-jump'
import type { ContentsView } from './contents-view'
import { keepInView } from './keep-in-view'
import { sectionInView } from './section-in-view'
import styles from './contents-panel.module.css'

/**
 * The contents tab: the paper's sections, each a way to where it starts
 * (features/a-paper-shows-its-contents).
 *
 * Presentational, as the annotations tab beside it is: the sidebar supplies
 * what to show (`use-article-contents.ts`) and the jump (`reader-jump.tsx`).
 * The one thing it reads for itself is **where the reader is**, from the same
 * channel, to mark the section in view — selected down to an index, so the
 * list re-renders when the section changes rather than on every scroll frame.
 */

const MESSAGES = {
  loading: 'loading…',
  error: 'could not load the contents of this paper.',
  reading: 'reading the contents…',
  none: 'this paper has no outline or numbered sections.',
  failed: 'couldn’t read the contents of this paper.',
} as const

/**
 * The deepest level drawn with its own indent. Past it, entries share the last
 * indent: in a 143px rail every level costs a sixth of the width the titles
 * have, and a fifth-level heading is rare enough not to be worth that.
 */
const DEEPEST_INDENT = 3

interface ContentsPanelProps {
  view: ContentsView
  /** Moves the reader to a stored 0-based page, and the point down it. */
  onJump: (pageIndex: number, top: number | null) => void
}

export function ContentsPanel({ view, onJump }: ContentsPanelProps) {
  if (view.kind !== 'entries') {
    return <p className={styles.notice}>{MESSAGES[view.kind]}</p>
  }
  return <ContentsList entries={view.entries} onJump={onJump} />
}

function ContentsList({
  entries,
  onJump,
}: {
  entries: readonly ContentsEntry[]
  onJump: ContentsPanelProps['onJump']
}) {
  const inView = useReadingLine((line) => sectionInView(entries, line))
  const list = useRef<HTMLOListElement>(null)
  const shown = useRef(false)

  // The marked entry stays where the reader can see it. Centred when the tab
  // first shows — a textbook's list opened in chapter 9 should open there — and
  // after that moved only as far as it must, and only when it has left the
  // list's view: a list that scrolled itself while it was being read would be
  // motion nobody asked for.
  //
  // **Not while the pointer is on the list.** A jump scrolls the reader
  // through every section between, and the list followed each one: found in
  // the browser, the row under the pointer that had just been clicked was a
  // different row by the time the jump landed. The reader is reading the list
  // then, not the paper; it keeps still.
  //
  // "First" is the first entry *marked*, not the first render: the list can
  // show before the reader has said where it is, and the entry that arrives
  // then is the one to centre.
  useEffect(() => {
    const element = list.current
    const item = element?.children[inView]
    if (!element || !(item instanceof HTMLElement)) {
      return
    }
    const first = !shown.current
    shown.current = true
    if (!first && element.matches(':hover')) {
      return
    }
    keepInView(element, item, first ? 'center' : 'nearest')
  }, [inView])

  return (
    <ol ref={list} className={styles.list} aria-label="contents">
      {entries.map((entry, index) => (
        // Keyed by position: the list is replaced whole, never edited, and two
        // sections may share a title ("Proof").
        // biome-ignore lint/suspicious/noArrayIndexKey: see above.
        <li key={index}>
          <button
            type="button"
            className={styles.row}
            style={
              {
                '--indent': Math.min(entry.depth, DEEPEST_INDENT) - 1,
              } as CSSProperties
            }
            data-depth={entry.depth}
            aria-current={index === inView ? 'location' : undefined}
            onClick={() => onJump(entry.pageIndex, entry.top)}
          >
            <span className={styles.title}>{entry.title}</span>
            {/* Stored 0-based, shown 1-based, as the annotations list does. */}
            <span className={styles.page}>{entry.pageIndex + 1}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
