import type { SyncedAnnotation } from './reader/annotation-sync/annotation-row'
import { annotationTypeLabel } from './reader/annotation-tools'
import type { ArticleAnnotationsState } from './use-article-annotations'
import styles from './annotations-panel.module.css'

/**
 * The Annotations tab: every mark on this paper, and the way back to each.
 *
 * A presentational component — the sidebar supplies the rows (from
 * `use-article-annotations.ts`) and the jump (from `reader-jump.tsx`), so what
 * is decided here is only what a row *says* and that activating one is a page
 * jump, both assertable without Zero or an engine.
 *
 * **Selecting this tab does not swap the main content area** — the decided
 * contrast with the Citations tab #10 adds beside it. Nothing here has to do
 * anything to uphold that: the sidebar and the reader are separate panels, and
 * this component's only reach into the reader is `onJumpToPage`. It is stated
 * because it is the invariant most likely to erode when the tab that *does*
 * swap arrives next door.
 */

const SYNCING_MESSAGE = 'loading…'
const ERROR_MESSAGE = 'could not load the marks on this paper.'
const EMPTY_MESSAGE = 'no marks on this paper yet.'

interface AnnotationsPanelProps {
  state: ArticleAnnotationsState
  annotations: readonly SyncedAnnotation[]
  /** Moves the reader to a stored 0-based page index. */
  onJumpToPage: (pageIndex: number) => void
}

export function AnnotationsPanel({
  state,
  annotations,
  onJumpToPage,
}: AnnotationsPanelProps) {
  // Distinct sentences for "not answered yet" and "answered: none" — an empty
  // list before the first round trip completes is not evidence of anything,
  // exactly as the page itself treats a missing article.
  if (state === 'syncing') {
    return <p className={styles.notice}>{SYNCING_MESSAGE}</p>
  }
  if (state === 'error') {
    return <p className={styles.notice}>{ERROR_MESSAGE}</p>
  }
  if (annotations.length === 0) {
    return <p className={styles.notice}>{EMPTY_MESSAGE}</p>
  }

  return (
    <ul className={styles.list} aria-label="marks on this paper">
      {annotations.map((annotation) => (
        <li key={annotation.id}>
          {/*
            A real button, so a row is in the tab order and Enter/Space
            activate it with nothing added. What activation does is *navigate
            the reader*, not open an editor — the mark is editable where it
            lives, on the paper.
          */}
          <button
            type="button"
            className={styles.row}
            onClick={() => onJumpToPage(annotation.pageIndex)}
          >
            <Snippet annotation={annotation} />
            {/* Stored 0-based, shown 1-based — the reader's own indicator
                counts from 1, and the two must agree after a jump. */}
            <span className={styles.page}>p. {annotation.pageIndex + 1}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * What a row says: the mark's own words, or failing that its kind.
 *
 * The fallback is the common case for now, not the edge — EmbedPDF never
 * captures selected text, so highlights are as textless as ink until task 6
 * associates text with marks (see that task's spec). It uses the toolbar
 * menu's own vocabulary, muted so it reads as a label rather than as content
 * (user-decided 2026-08-16).
 */
function Snippet({ annotation }: { annotation: SyncedAnnotation }) {
  // Whitespace collapsed because `contents` may carry newlines, and a clamped
  // multi-line snippet should spend its lines on words.
  const contents = annotation.contents?.replace(/\s+/g, ' ').trim()

  if (!contents) {
    return (
      <span className={`${styles.snippet} ${styles.kind}`}>
        {annotationTypeLabel(annotation.type)}
      </span>
    )
  }
  return <span className={styles.snippet}>{contents}</span>
}
