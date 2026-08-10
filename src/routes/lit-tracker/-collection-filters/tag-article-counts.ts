/** The one field counting needs from a join row. */
interface AppliedTag {
  tagId: string
}

/**
 * How many articles carry each tag, keyed by tag id.
 *
 * Counted from the synced join rows rather than asked of the database, because
 * the rows are already here: `queries.articleTags.mine` syncs the reader's whole
 * join table for the card chips, so a count is a walk over data in memory rather
 * than a query with a `group by` — which is also why the schema deliberately has
 * no per-tag counting support (research/data-modeling/tags-and-reading-status.md
 * checked that no decided surface needed one).
 *
 * Its only consumer is the delete confirmation, which has to say how many
 * articles a tag is about to come off. A tag with no articles is absent from the
 * map rather than present with zero; callers read it as `?? 0`.
 */
export function tagArticleCounts(
  appliedTags: readonly AppliedTag[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>()
  for (const applied of appliedTags) {
    counts.set(applied.tagId, (counts.get(applied.tagId) ?? 0) + 1)
  }
  return counts
}
