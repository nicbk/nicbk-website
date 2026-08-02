import type { Author } from '~/db/schema/lit-tracker'

/**
 * How an article's authors read in the collection.
 *
 * The rule comes from the collection view's card spec: fewer than three, show
 * all of them; three or more, show the first followed by "et al."
 * (research/ui-ux/pages/lit-tracker/pages/collection-view.md). The plain list
 * this task renders is the surface #8 upgrades into that card, so it uses the
 * same rule rather than inventing a temporary one that would then change.
 *
 * Extraction is best-effort by design — the pipeline creates the article row
 * even when GROBID finds nothing (upload-jobs-schema.md), leaving `authors`
 * empty. That case has to read as *unknown*, not as a stray separator or an
 * empty gap where a name should be, so it gets its own wording.
 */

/** Shown when extraction produced no authors at all. */
export const UNKNOWN_AUTHORS = 'unknown author'

/** Below this many authors, every name is listed. */
const ET_AL_THRESHOLD = 3

export function formatAuthors(authors: readonly Author[]): string {
  const names = authors
    .map((author) => author.name.trim())
    .filter((name) => name !== '')

  const [first] = names
  if (first === undefined) {
    return UNKNOWN_AUTHORS
  }
  if (names.length >= ET_AL_THRESHOLD) {
    return `${first} et al.`
  }
  return names.join(', ')
}
