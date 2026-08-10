import { useQuery } from '@rocicorp/zero/react'
import { SearchInput } from '~/routes/-shared/components/search-input/search-input'
import { queries } from '~/zero/queries'
import { FiltersDrawer } from '../../-collection-filters/filters-drawer'
import { UploadModal } from '../upload-modal/upload-modal'
import { UploadStatus } from '../upload-status/upload-status'
import styles from './collection-toolbar.module.css'

/**
 * The search field's accessible name. Exported because the e2e and unit tiers
 * both find the input by it, and a label a test hard-codes is a label that
 * changes without the test noticing.
 */
export const SEARCH_LABEL = 'Search articles'

interface CollectionToolbarProps {
  /** The live search text. Controlled: `CollectionPage` owns it. */
  query: string
  /** Called with the new text on every keystroke — no debounce here. */
  onQueryChange: (query: string) => void
}

/**
 * The row above the collection: the search bar, and the controls beside it.
 *
 * ## The search bar is the row
 *
 * The decided layout opens the main panel with a search row and hangs the "+"
 * off its trailing edge (research/ui-ux/pages/lit-tracker/pages/collection-view.md,
 * and the mockup). #7 reserved the slot rather than collapsing it, so the
 * controls have been sitting where they belong since before there was anything
 * to sit beside; this task fills it, which moves nothing.
 *
 * The input is **`SearchInput`, the same component the blog list uses**. The
 * decided specs describe the two search bars in terms of each other — the blog's
 * cites the tracker's style and the tracker's cites the blog's sidebar — which
 * is a long way of saying they are one control, and reimplementing it here would
 * be where the two drift apart.
 *
 * Controlled from above rather than holding the text itself: the page filters
 * the grid from the same value, and the moment two components each keep a copy
 * is the moment the grid can show something the input does not say.
 *
 * ## Why the jobs query lives here
 *
 * The indicator is the only thing that reads `upload_jobs`, and this is the
 * component that owns it — so the query sits at the smallest scope that covers
 * its consumer rather than being threaded down from the page. `uploadJobs.mine`
 * is the query task 1 defined and authorized; the rows are the signed-in user's
 * unresolved uploads, oldest first, and they arrive by sync, so an upload
 * submitted in another tab shows up here too.
 */
export function CollectionToolbar({
  query,
  onQueryChange,
}: CollectionToolbarProps) {
  const [jobs] = useQuery(queries.uploadJobs.mine())

  return (
    // Not a <nav> or a <toolbar>: a handful of unrelated controls, two of which
    // open a dialog. A toolbar role would promise arrow-key navigation between
    // them.
    <div className={styles.toolbar}>
      <SearchInput
        className={styles.search}
        value={query}
        onValueChange={onQueryChange}
        label={SEARCH_LABEL}
        // Lowercase where the label is not: the accessible name is read as a
        // sentence, while the placeholder sits among "filters" and the rail's
        // "find a tag" and would be the one capitalized string on the page.
        placeholder="search articles…"
      />
      <div className={styles.controls}>
        {/*
          Only rendered as a control below the responsive breakpoint — above it
          the rail is showing the same filters permanently, and the sheet would
          be a second way to reach one thing. It sits leftmost of the three so
          the "+" stays where it has always been, at the row's trailing edge.
        */}
        <FiltersDrawer />
        <UploadModal />
        <UploadStatus jobs={jobs} />
      </div>
    </div>
  )
}
