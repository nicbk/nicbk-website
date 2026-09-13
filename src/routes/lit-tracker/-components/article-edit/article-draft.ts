import type { Author } from '~/db/schema/lit-tracker'

/**
 * An article's details as a form holds them, and the pure functions that move a
 * row into that shape and back out again.
 *
 * Separated from the dialog because none of it needs React: turning a row into
 * fields, deciding whether those fields are good enough to save, and turning
 * them back into a mutation are three questions with exact answers, and they are
 * the ones most worth asserting directly.
 */

/** The fields #11 edits — the article as this feature sees it. */
export interface EditableArticle {
  id: string
  title: string
  authors: readonly Author[]
  publicationYear: number | null
  venue: string | null
  doi: string | null
}

/** What the mutator takes: the same fields, typed as the database holds them. */
export interface ArticleDetails {
  title: string
  authors: readonly Author[]
  publicationYear: number | null
  venue: string | null
  doi: string | null
}

/**
 * The same fields as a form really holds them — every one a string, because an
 * `<input>` has nothing else to give.
 *
 * The year is the field where that matters: "2o17" and "" are both things a
 * reader can leave in it, and neither is a number. Keeping the typed text as
 * typed is what lets the form say *which* of those two happened instead of
 * silently turning both into no year at all.
 */
export interface ArticleDraft {
  title: string
  authors: readonly Author[]
  publicationYear: string
  venue: string
  doi: string
}

/** What is wrong with a draft, by field. An empty object means nothing is. */
export interface DraftErrors {
  title?: string
  authors?: string
  publicationYear?: string
}

export const TITLE_REQUIRED = 'a title is required.'
export const AUTHORS_REQUIRED = 'at least one author is required.'
export const YEAR_NOT_A_YEAR = 'enter a four-digit year, or leave this empty.'

/**
 * A row, as fields.
 *
 * Taken once when the form opens and not again — the decided editing state
 * (research/ui-ux/design-system.md): while the reader is typing, what arrives
 * from sync must not land in the fields under their cursor. A snapshot is the
 * whole of that rule here, because this form saves every field at once; the
 * cost, stated rather than discovered, is that a change made elsewhere between
 * opening and saving is overwritten by what the reader had on screen. For a
 * personal collection with one writer that is the right trade, and it is the
 * one the reader would expect from a form with a save button.
 */
export function draftFrom(article: EditableArticle): ArticleDraft {
  return {
    title: article.title,
    // Always at least one row, so a failed extraction — which stores no authors
    // at all — opens on an empty field to type in rather than on nothing.
    authors: article.authors.length === 0 ? [{ name: '' }] : article.authors,
    publicationYear:
      article.publicationYear === null ? '' : String(article.publicationYear),
    venue: article.venue ?? '',
    doi: article.doi ?? '',
  }
}

/**
 * Fields, as a mutation.
 *
 * Blank author rows are dropped rather than refused. Adding a row and then
 * thinking better of it is an ordinary thing to do, and an empty one left behind
 * is not a mistake worth stopping a save for — it is a row that says nothing.
 */
export function detailsFrom(draft: ArticleDraft): ArticleDetails {
  return {
    title: draft.title.trim(),
    authors: namedAuthors(draft.authors),
    publicationYear: yearFrom(draft.publicationYear),
    venue: blankToNull(draft.venue),
    doi: blankToNull(draft.doi),
  }
}

/**
 * What the reader has to fix before this can be saved.
 *
 * Deliberately only the three that can fail. Venue and DOI have no wrong value —
 * an empty one is absent, and this app does not know what a real venue is.
 */
export function draftErrors(draft: ArticleDraft): DraftErrors {
  const errors: DraftErrors = {}

  if (draft.title.trim() === '') {
    errors.title = TITLE_REQUIRED
  }
  if (namedAuthors(draft.authors).length === 0) {
    errors.authors = AUTHORS_REQUIRED
  }
  if (
    draft.publicationYear.trim() !== '' &&
    yearFrom(draft.publicationYear) === null
  ) {
    errors.publicationYear = YEAR_NOT_A_YEAR
  }

  return errors
}

/** True when nothing is wrong — the shape a caller actually asks about. */
export function isSaveable(errors: DraftErrors): boolean {
  return Object.keys(errors).length === 0
}

/**
 * Renames one author, leaving every other row exactly as it was — including the
 * `given`/`family` parts of the one being renamed.
 *
 * Those two are not editable here and are not discarded either. GROBID supplies
 * them when its TEI output had structured names, nothing in this project
 * displays them yet, and a form that dropped them would quietly destroy data on
 * every save made to fix a typo in a different author's name.
 */
export function withAuthorName(
  authors: readonly Author[],
  index: number,
  name: string,
): readonly Author[] {
  return authors.map((author, at) =>
    at === index ? { ...author, name } : author,
  )
}

/** Adds an empty row at the end, for a name the extractor missed. */
export function withAuthorAdded(authors: readonly Author[]): readonly Author[] {
  return [...authors, { name: '' }]
}

/**
 * Removes one row — the common repair, since the usual extraction fault is an
 * author invented out of an affiliation line.
 *
 * Removing the last row leaves an empty one rather than none, so the field a
 * reader needs in order to fix their mistake is still there.
 */
export function withAuthorRemoved(
  authors: readonly Author[],
  index: number,
): readonly Author[] {
  const remaining = authors.filter((_, at) => at !== index)
  return remaining.length === 0 ? [{ name: '' }] : remaining
}

/** The rows that actually name somebody, trimmed. */
function namedAuthors(authors: readonly Author[]): readonly Author[] {
  return authors
    .map((author) => ({ ...author, name: author.name.trim() }))
    .filter((author) => author.name !== '')
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * A typed year as a number, or `null` for both "left empty" and "not a year".
 *
 * Digits only: `Number('2017 ')` is 2017 and `Number('2e3')` is 2000, and
 * neither is something a reader meant to type into a year field.
 */
function yearFrom(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d{1,4}$/.test(trimmed)) {
    return null
  }
  const year = Number(trimmed)
  return year === 0 ? null : year
}
