import { TagToggle } from '~/routes/-shared/components/tag-toggle/tag-toggle'
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
 * The toggles themselves are `TagToggle`, the shared control this filter
 * originated and the Lit Tracker's collection filters now also use — including
 * the pointer-versus-keyboard focus fix, which lives there so there is one copy
 * of it. What stays here is the structure: a named navigation region, a heading,
 * and a wrapping list. Renders nothing when there are no tags.
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
            <TagToggle
              pressed={selected.includes(tag)}
              onPressedChange={() => onToggle(tag)}
              // The blog writes every tag `#name` — inline on a post and in
              // `PostTags` — so its filter does too.
              hash
            >
              {tag}
            </TagToggle>
          </li>
        ))}
      </ul>
    </nav>
  )
}
