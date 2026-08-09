import type { Author } from '~/db/schema'

/**
 * When two records describe the same paper.
 *
 * This is the whole of the graduation rule from
 * research/data-modeling/citation-graph-schema.md, kept pure and in one place
 * because it runs from three directions — a new edge looking for an article, a
 * new article looking for edges, and (later, in #11) a manual correction
 * re-running the check — and three implementations of it would be three
 * subtly different graphs.
 *
 * ## The rule
 *
 * 1. **Both sides have a Semantic Scholar id** → they match if and only if the
 *    ids are equal. Identical titles do not override a disagreement: the id is
 *    the canonical answer, and two papers that share a title are usually a
 *    proceedings version and a journal version, which really are different rows.
 * 2. **Only one side has an id** → no match. The other side's silence is not
 *    evidence, and falling back here is how a resolved paper gets glued to an
 *    unrelated placeholder.
 * 3. **Neither side has an id** → exact agreement on `lower(trim(title))` *and*
 *    on the first author's family name. This case exists on purpose: two
 *    GROBID-only records would otherwise never graduate even when they are
 *    obviously the same paper. It is the one place this rule accepts a small
 *    false-positive risk, which is why it needs the author too.
 */

/** The minimum needed to decide identity — an article or an edge, either way. */
export interface Work {
  semanticScholarId: string | null
  title: string | null
  authors: Author[]
}

export function isSameWork(left: Work, right: Work): boolean {
  if (left.semanticScholarId !== null && right.semanticScholarId !== null) {
    return left.semanticScholarId === right.semanticScholarId
  }
  if (left.semanticScholarId !== null || right.semanticScholarId !== null) {
    return false
  }
  return matchesOnTitleAndAuthor(left, right)
}

function matchesOnTitleAndAuthor(left: Work, right: Work): boolean {
  const leftTitle = normalizeTitle(left.title)
  const rightTitle = normalizeTitle(right.title)
  if (leftTitle === null || leftTitle !== rightTitle) {
    return false
  }

  const leftAuthor = firstAuthorKey(left.authors)
  const rightAuthor = firstAuthorKey(right.authors)
  // A record with no authors cannot be confirmed by this rule, and a title
  // alone is not enough to claim two papers are the same one.
  return leftAuthor !== null && leftAuthor === rightAuthor
}

/**
 * A title reduced to what two records must agree on: `lower(trim(...))`, the
 * decided normalization, and nothing more.
 *
 * Deliberately not a fuzzy comparison. The decision this implements is
 * explicitly "exact match after normalizing", not a scoring algorithm — a
 * similarity threshold is a knob nobody can tune without a corpus, and getting
 * it wrong silently merges two papers.
 */
export function normalizeTitle(title: string | null): string | null {
  if (title === null) {
    return null
  }
  const normalized = title.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

/**
 * The first author's surname.
 *
 * The surname is the stable half: the same person appears as "Ashish Vaswani"
 * in one reference list and "A. Vaswani" in the next, and only the family name
 * survives that.
 *
 * `family` is used when GROBID managed to split the name; otherwise the last
 * word of the whole name stands in for it. That fallback is not a nicety — the
 * two sides of a comparison rarely come from the same place. Semantic Scholar
 * returns authors as `{"name": "Ashish Vaswani"}` and never splits them at all,
 * so comparing its record against a GROBID `family` of "Vaswani" would fail on
 * every paper ever written. Reducing both sides the same way is what makes the
 * comparison symmetric.
 *
 * It costs something: a compound surname ("van der Berg") reduces to its last
 * word. That is a match this refuses rather than a wrong one it accepts, and
 * the title still has to agree exactly for either to matter.
 */
export function firstAuthorKey(authors: Author[]): string | null {
  const first = authors[0]
  if (!first) {
    return null
  }
  const words = (first.family ?? first.name).trim().toLowerCase().split(/\s+/)
  const surname = words[words.length - 1]
  return surname && surname.length > 0 ? surname : null
}
