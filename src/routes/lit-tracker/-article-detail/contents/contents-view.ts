import type {
  ContentsEntry,
  ContentsSource,
} from '~/lit-tracker/contents/contents'

/**
 * What the contents tab shows, decided from what sync has and what the article
 * says about its own reading (features/a-paper-shows-its-contents).
 *
 * A pure function so every state is a unit test rather than a fixture in a
 * database: each one is a different sentence for the reader, and the
 * distinctions between them are the ones that are easy to collapse by accident.
 */
export type ContentsView =
  /** Sync has not answered yet; an empty answer now means nothing. */
  | { kind: 'loading' }
  /** Sync could not answer. */
  | { kind: 'error' }
  /** Answered, with no row: the paper has not been read for contents yet. */
  | { kind: 'reading' }
  /** Read, and neither the outline nor GROBID found sections. */
  | { kind: 'none' }
  /** Reading the contents went wrong. */
  | { kind: 'failed' }
  | { kind: 'entries'; entries: readonly ContentsEntry[] }

export interface ContentsRow {
  source: ContentsSource
  entries: readonly ContentsEntry[]
}

export function contentsView(
  query: 'syncing' | 'ready' | 'error',
  row: ContentsRow | undefined,
  /** The article's own `extraction_status`. */
  extractionStatus: string | null | undefined,
): ContentsView {
  if (query === 'syncing') {
    return { kind: 'loading' }
  }
  if (query === 'error') {
    return { kind: 'error' }
  }
  if (row === undefined) {
    // A paper whose extraction failed is never read for contents — neither the
    // upload nor the backfill reads one — so "reading…" would be a promise
    // nothing keeps. It is told the truth instead.
    return extractionStatus === 'failed'
      ? { kind: 'failed' }
      : { kind: 'reading' }
  }
  if (row.source === 'failed') {
    return { kind: 'failed' }
  }
  if (row.source === 'none' || row.entries.length === 0) {
    return { kind: 'none' }
  }
  return { kind: 'entries', entries: row.entries }
}
