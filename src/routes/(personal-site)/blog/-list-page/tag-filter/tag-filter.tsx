import { Toggle } from '@base-ui/react/toggle'
import styles from './tag-filter.module.css'

interface TagFilterProps {
  /** Every tag available across the posts (the toggle options), pre-sorted. */
  tags: string[]
  /** The currently selected tags. */
  selected: string[]
  /** Toggle a tag's selected state. */
  onToggle: (tag: string) => void
}

/**
 * The tag filter: one toggle per tag present in the list, stacked above the post
 * list at every width. Selecting tags narrows the list to posts carrying all of
 * them (AND-composed; the filtering itself is `filterPosts`).
 *
 * Each toggle is a Base UI `Toggle` — the decided component library's two-state
 * button (see research/ui-ux/design-system.md). It renders a real `<button>`,
 * exposes its state as `aria-pressed` for assistive tech, and mirrors it as the
 * `data-pressed` styling hook the stylesheet keys off (which also shows the
 * pressed state visually, not by color alone). Using the primitive rather than a
 * hand-rolled `<button aria-pressed>` keeps every interactive control in the app
 * on the same foundation instead of a mix of from-scratch and Base UI widgets.
 * Renders nothing when there are no tags.
 *
 * This is the originating implementation of the search + tag-filter style the
 * Lit Tracker's collection view later reuses.
 */
export function TagFilter({ tags, selected, onToggle }: TagFilterProps) {
  if (tags.length === 0) {
    return null
  }
  return (
    <nav className={styles.container} aria-label="Filter by tag">
      <h2 className={styles.heading}>Tags</h2>
      <ul className={styles.list}>
        {tags.map((tag) => (
          <li key={tag}>
            <Toggle
              className={styles.tag}
              pressed={selected.includes(tag)}
              onPressedChange={() => onToggle(tag)}
            >
              {tag}
            </Toggle>
          </li>
        ))}
      </ul>
    </nav>
  )
}
