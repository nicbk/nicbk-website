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
 * The tag filter: one toggle button per tag present in the list, stacked above
 * the post list at every width. Selecting tags narrows the list to posts
 * carrying all of them (AND-composed; the filtering itself is `filterPosts`).
 *
 * Each toggle is a native `<button aria-pressed>` — the platform control for a
 * two-state toggle — so it is keyboard operable and conveys its pressed state to
 * assistive tech for free, matching the theme toggle's native-first reasoning.
 * The pressed state is also shown visually (not by color alone) in the
 * stylesheet. Renders nothing when there are no tags.
 *
 * This is the originating implementation of the search-bar + tag-filter style
 * the Lit Tracker's collection view later reuses.
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
            <button
              type="button"
              className={styles.tag}
              aria-pressed={selected.includes(tag)}
              onClick={() => onToggle(tag)}
            >
              {tag}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
