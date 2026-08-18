import type { SyncedAnnotation } from './reader/annotation-sync/annotation-row'
import {
  annotationIntent,
  quotedText,
} from './reader/annotation-sync/annotation-row'
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
 * What a row says, in the order a reader would want it: **their own words about
 * the mark, the paper's words under it, and failing both, the mark's kind.**
 *
 * The two texts are different things and the row can hold both (decided
 * 2026-08-17). `contents` is the comment the reader wrote — the meaning it
 * already had for a text box, now available on any mark — and the quote is the
 * passage the engine captured when the mark was drawn, which lives in `payload`
 * because that is where EmbedPDF puts it (`annotation-row.ts` explains why the
 * two were ever confused). Showing the comment alone would strand a note reading
 * "important" with nothing to be important *about*, so when both exist the quote
 * follows as a second, quieter line.
 *
 * The kind is the last resort, not the common case it was in task 5: it is now
 * reached only by a mark that is neither commented on nor drawn over text — an
 * ink stroke, a circle round a figure. It keeps the toolbar menu's own
 * vocabulary, muted so it reads as a label rather than as content
 * (user-decided 2026-08-16).
 */
function Snippet({ annotation }: { annotation: SyncedAnnotation }) {
  // Whitespace collapsed because both strings may carry newlines — a PDF's text
  // layer is full of them mid-sentence — and a clamped snippet should spend its
  // two lines on words rather than on the paper's line breaks.
  const comment = collapse(annotation.contents)
  const quote = collapse(quotedText(annotation))

  if (!comment && !quote) {
    return (
      <span className={styles.text}>
        <span className={`${styles.snippet} ${styles.kind}`}>
          {annotationTypeLabel(annotation.type, annotationIntent(annotation))}
        </span>
      </span>
    )
  }

  return (
    <span className={styles.text}>
      {comment ? <span className={styles.snippet}>{comment}</span> : null}
      {/*
        Quoted when it accompanies a comment, bare when it is the row's whole
        content. The marks are what distinguish the paper's sentence from the
        reader's when the two sit one above the other; alone, there is nothing
        to distinguish it from.
      */}
      {quote ? (
        <span className={`${styles.snippet} ${comment ? styles.quote : ''}`}>
          {comment ? `“${quote}”` : quote}
        </span>
      ) : null}
    </span>
  )
}

/** One line's worth of a string that may not be one, or null if it is blank. */
function collapse(text: string | null | undefined): string | null {
  const collapsed = text?.replace(/\s+/g, ' ').trim()
  return collapsed ? collapsed : null
}
