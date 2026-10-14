import { Collapsible } from '@base-ui/react/collapsible'
import { ChevronRight } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import type { ContentsEntry } from '~/lit-tracker/contents/contents'
import { useReadingLine } from '../reader-jump'
import type { ContentsNode } from './contents-tree'
import { contentsTree, firstVisitOpen, markedRow } from './contents-tree'
import type { ContentsView } from './contents-view'
import { keepInView } from './keep-in-view'
import { sectionInView } from './section-in-view'
import type { ContentsFolds } from './use-contents-folds'
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
 *
 * An entry with sections folds them away (features/the-contents-fold); which
 * are open is the sidebar's to supply too (`use-contents-folds.ts`).
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
const DEEPEST_INDENT = 2

interface ContentsPanelProps {
  view: ContentsView
  /** Which entries are open, and the way to open or close one. */
  folds: ContentsFolds
  /** Moves the reader to a stored 0-based page, and the point down it. */
  onJump: (pageIndex: number, top: number | null) => void
}

export function ContentsPanel({ view, folds, onJump }: ContentsPanelProps) {
  if (view.kind !== 'entries') {
    return <p className={styles.notice}>{MESSAGES[view.kind]}</p>
  }
  return <ContentsList entries={view.entries} folds={folds} onJump={onJump} />
}

/** What every row needs from the list, passed down the tree unchanged. */
interface RowContext {
  open: ReadonlySet<number>
  marked: number
  fold: ContentsFolds['fold']
  onJump: ContentsPanelProps['onJump']
}

function ContentsList({
  entries,
  folds,
  onJump,
}: {
  entries: readonly ContentsEntry[]
  folds: ContentsFolds
  onJump: ContentsPanelProps['onJump']
}) {
  const tree = useMemo(() => contentsTree(entries), [entries])
  const open = useMemo(
    () => new Set(folds.expanded ?? firstVisitOpen(tree)),
    [folds.expanded, tree],
  )
  const inView = useReadingLine((line) => sectionInView(entries, line))
  const marked = markedRow(inView, tree.parentOf, open)
  const list = useRef<HTMLOListElement>(null)
  const shown = useRef(false)

  // Read by the effect below without being one of its reasons to run.
  const markedNow = useRef(marked)
  markedNow.current = marked

  // The marked entry stays where the reader can see it. Centred when the tab
  // first shows — a textbook's list opened in chapter 9 should open there — and
  // after that moved only as far as it must, and only when it has left the
  // list's view: a list that scrolled itself while it was being read would be
  // motion nobody asked for.
  //
  // **Only when the reader moves.** The effect runs on the section in view,
  // not on the marked row: opening a chapter can change which row is marked
  // (the section inside it now shows), and a list that scrolled in answer to a
  // press on it would move the row from under the finger that pressed it.
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
  //
  // The row is found by its entry's index, not by its place among the list's
  // children: in a nested list those are different numbers.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `inView` is the trigger; see above.
  useEffect(() => {
    const element = list.current
    const item = element?.querySelector(`[data-index="${markedNow.current}"]`)
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

  const context: RowContext = { open, marked, fold: folds.fold, onJump }
  return (
    <ol ref={list} className={styles.list} aria-label="contents">
      {tree.roots.map((node) => (
        <ContentsItem key={node.index} node={node} context={context} />
      ))}
    </ol>
  )
}

/**
 * One entry, and — when it has sections — the fold that holds them.
 *
 * The fold is Base UI's Collapsible: the disclosure pattern, which the ARIA
 * authoring practices recommend over a tree for navigation (research §2). Its
 * trigger is a button of its own beside the title, so choosing a section and
 * folding one are different presses and a jump never changes what is open
 * (decided with the user, 2026-10-14).
 *
 * Keyed by the entry's index: the list is replaced whole, never edited, and
 * two sections may share a title ("Proof").
 */
function ContentsItem({
  node,
  context,
}: {
  node: ContentsNode
  context: RowContext
}) {
  const { entry, index } = node
  const row = (fold: ReactNode) => (
    <div
      className={styles.row}
      data-index={index}
      style={
        {
          '--indent': Math.min(node.level, DEEPEST_INDENT),
        } as CSSProperties
      }
    >
      {fold}
      <button
        type="button"
        className={styles.entry}
        data-top-level={node.level === 0 || undefined}
        aria-current={index === context.marked ? 'location' : undefined}
        onClick={() => context.onJump(entry.pageIndex, entry.top)}
      >
        <span className={styles.title}>{entry.title}</span>
        {/* Stored 0-based, shown 1-based, as the annotations list does. */}
        <span className={styles.page}>{entry.pageIndex + 1}</span>
      </button>
    </div>
  )

  if (node.children.length === 0) {
    return <li>{row(null)}</li>
  }

  const open = context.open.has(index)
  return (
    <Collapsible.Root
      render={<li />}
      open={open}
      onOpenChange={(next) => context.fold(index, next)}
    >
      {row(
        <Collapsible.Trigger
          className={styles.fold}
          aria-label={`sections of ${entry.title}`}
        >
          <ChevronRight className={styles.chevron} aria-hidden="true" />
        </Collapsible.Trigger>,
      )}
      <Collapsible.Panel render={<ol className={styles.sections} />}>
        {node.children.map((child) => (
          <ContentsItem key={child.index} node={child} context={context} />
        ))}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
