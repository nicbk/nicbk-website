import { CollectionFilters } from './collection-filters'
import styles from './filter-rail.module.css'

interface FilterRailProps {
  /**
   * Names the region. Passed in rather than fixed here because the rail is what
   * a reader navigating by landmark lands on, and what it should be called is a
   * property of the page it filters.
   */
  label: string
}

/**
 * The filters as they sit in the sidebar rail, beside the collection.
 *
 * **This is where the rail becomes a landmark.** #7 built it deliberately
 * un-named — a navigation region with nothing in it announces a promise it does
 * not keep — and this is the task that gives it contents, so the `<nav>` arrives
 * with them rather than as an afterthought.
 *
 * Below the responsive breakpoint the sidebar hides this slot outright and
 * `FiltersDrawer` shows the same list in a sheet instead. `display: none` rather
 * than visual hiding: the list must leave the accessibility tree too, or a
 * screen-reader user would meet both copies and have no way to tell which one
 * the sighted layout is using.
 */
export function FilterRail({ label }: FilterRailProps) {
  return (
    <nav className={styles.rail} aria-label={label}>
      <CollectionFilters />
    </nav>
  )
}
