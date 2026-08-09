import type { CollectionTag } from './article-card/article-menu/article-menu'

/** One row of the join table, as it arrives from sync. */
export interface AppliedTag {
  articleId: string
  tagId: string
}

/**
 * Which tags each article carries, from the two lists that arrive by sync.
 *
 * Zero syncs `tags` and `article_tags` as flat lists, per their own queries;
 * this is the join, done on the client over rows already in memory. That is the
 * same shape as everything else on this page — the collection is fully synced,
 * so relating rows is a loop rather than a request — and it is why the two
 * queries stay simple enough to be read-authorized on their own terms.
 *
 * Tag order within an article follows `tags`, which the query already sorts by
 * name. Sorting per article instead would mean the same tag appearing in a
 * different position on each card.
 *
 * A tag id with no matching tag is skipped rather than rendered blank: the two
 * queries land independently, so there is a real moment during the first sync
 * when a join row has arrived and its tag has not.
 */
export function tagsByArticle(
  appliedTags: readonly AppliedTag[],
  tags: readonly CollectionTag[],
): ReadonlyMap<string, CollectionTag[]> {
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]))
  const order = new Map(tags.map((tag, index) => [tag.id, index]))
  const byArticle = new Map<string, CollectionTag[]>()

  for (const applied of appliedTags) {
    const tag = tagsById.get(applied.tagId)
    if (!tag) {
      continue
    }
    const existing = byArticle.get(applied.articleId)
    if (existing) {
      existing.push(tag)
    } else {
      byArticle.set(applied.articleId, [tag])
    }
  }

  for (const list of byArticle.values()) {
    list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  }

  return byArticle
}

/** The empty result, so callers can avoid allocating one per render. */
export const NO_TAGS: readonly CollectionTag[] = []
