import { normalizeForAlignment } from '~/lit-tracker/enrichment/reference-list'

/**
 * Bibliography rows that are two references GROBID read as one.
 *
 * GROBID sometimes fails to split two adjacent references, and the row it
 * writes reads as both: *"Understanding the difficulty of training deep
 * feedforward neural networks. The handbook of brain theory and neural
 * networks"*. Semantic Scholar's reference list then supplies each half
 * cleanly, as rows of their own, so the paper ends up holding three rows where
 * it printed two — one of them a reference nobody made
 * (features/citation-graph-traversal, research §4).
 *
 * **The rule:** a row that is unresolved (no Semantic Scholar id, not linked to
 * an article) is a merge when its title contains the whole title of a resolved
 * row of the same citing paper. Measured on every paper in the local
 * collection, it matches exactly the two rows known to be merges, and nothing
 * else.
 *
 * **Only a resolved row's title counts as evidence**, because it is Semantic
 * Scholar's record of a reference this paper made; two unresolved rows prove
 * nothing about each other. And a contained title must be long enough not to
 * be a coincidence — "Adam" is inside plenty of real titles — so the same
 * floor reference alignment uses applies here.
 */

/** Letters and digits a contained title must have before it is evidence. */
export const MIN_MERGED_TITLE_LENGTH = 20

export interface BibliographyRow {
  id: string
  title: string
  semanticScholarId: string | null
  citedArticleId: string | null
}

/** The ids of the rows that are merges, per the rule above. */
export function mergedRowIds(rows: readonly BibliographyRow[]): string[] {
  const resolvedTitles = rows.flatMap((row) => {
    const title = normalizeForAlignment(row.title)
    return row.semanticScholarId !== null &&
      title !== null &&
      title.length >= MIN_MERGED_TITLE_LENGTH
      ? [title]
      : []
  })

  return rows.flatMap((row) => {
    if (row.semanticScholarId !== null || row.citedArticleId !== null) {
      return []
    }
    const title = normalizeForAlignment(row.title)
    const isMerge =
      title !== null &&
      resolvedTitles.some(
        (resolved) =>
          title.length > resolved.length && title.includes(resolved),
      )
    return isMerge ? [row.id] : []
  })
}
