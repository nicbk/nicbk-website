import { useQuery } from '@rocicorp/zero/react'
import { useMemo, useState } from 'react'
import type { CollectionTag } from '~/routes/lit-tracker/-components/article-menu/article-menu'
import { useArticleMutations } from '~/routes/lit-tracker/-hooks/use-article-mutations'
import { queries } from '~/zero/queries'
import { DeleteTagDialog } from './delete-tag-dialog'
import { FilterGroups } from './filter-groups'
import { tagArticleCounts } from './tag-article-counts'
import { useCollectionFilters } from './use-collection-filters'

/**
 * The collection's filters, wired: the reader's tags, the state in the URL, and
 * the one write this surface can make.
 *
 * Mounted twice on the same page — once in the rail beside the collection, once
 * inside the drawer that replaces the rail on a narrow screen — and that is
 * safe by construction rather than by luck. The tag list comes from Zero, which
 * keys its materialized views by query hash, so both copies read one view; the
 * selection comes from the URL, so both copies read one value and neither holds
 * state the other could contradict. Only the confirmation is local, and only one
 * of the two is ever on screen.
 *
 * The tag list is *not* passed down from `CollectionPage` even though that page
 * also queries it: the rail renders in the layout's sidebar, outside the page
 * entirely, so there is no prop path between them. Asking for the same query is
 * what two components in different subtrees do here.
 */
export function CollectionFilters() {
  const [tags] = useQuery(queries.tags.mine())
  // The join rows, for one purpose: telling the reader how many articles a tag
  // is about to come off. The same query the collection already syncs.
  const [appliedTags] = useQuery(queries.articleTags.mine())

  const filters = useCollectionFilters()
  const { deleteTag } = useArticleMutations()

  /** The tag whose deletion has been asked for but not yet confirmed. */
  const [pendingDelete, setPendingDelete] = useState<CollectionTag | null>(null)

  const counts = useMemo(() => tagArticleCounts(appliedTags), [appliedTags])

  return (
    <>
      <FilterGroups
        tags={tags}
        selectedTags={filters.tags}
        selectedStatus={filters.status}
        onToggleTag={filters.toggleTag}
        onToggleStatus={filters.toggleStatus}
        onRequestDelete={setPendingDelete}
      />

      <DeleteTagDialog
        tag={pendingDelete}
        articleCount={pendingDelete ? (counts.get(pendingDelete.id) ?? 0) : 0}
        onConfirm={(tag) => {
          // Closed before the write rather than after it. The mutation is
          // optimistic — the tag leaves the list immediately — so holding the
          // dialog open until the server answers would leave it asking about a
          // tag that is already gone from the page behind it.
          setPendingDelete(null)
          // And dropped from the filters, if it was one of them. Otherwise its
          // name stays in the URL, still narrowing the collection — usually to
          // nothing — with no toggle left in the rail to switch it off. Found by
          // deleting a selected tag in the browser; the page was not broken so
          // much as inescapable.
          filters.dropTag(tag.name)
          void deleteTag(tag.id)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
