import { Toggle } from '@base-ui/react/toggle'
import type { MouseEvent } from 'react'
import styles from './tag-filter.module.css'

/**
 * Drop focus from a toggle when it was activated by pointer or touch, but keep
 * it for keyboard activation.
 *
 * Since the blog's filters no longer hand focus off to the page heading (that
 * fix is what keeps keyboard users on the control they just used), a tapped
 * toggle now retains focus — and on mobile the browser paints a `:focus-visible`
 * ring for that retained focus. The ring is the accent color, identical to a
 * selected tag, so it lingers on a *deselected* tag and reads as "still
 * selected," which is confusing. Removing focus after a tap removes the ring
 * entirely, regardless of the browser's focus-visible heuristic.
 *
 * Keyboard activation (Enter/Space) must NOT be blurred: those users need focus
 * to stay put, with its visible ring, to keep moving through the tags. A
 * keyboard-synthesized click reports `detail === 0`; a pointer/touch tap reports
 * `detail >= 1` — the standard signal for telling the two apart.
 */
function dropFocusAfterPointerActivation(event: MouseEvent<HTMLButtonElement>) {
  if (event.detail > 0) {
    event.currentTarget.blur()
  }
}

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
              onClick={dropFocusAfterPointerActivation}
            >
              {tag}
            </Toggle>
          </li>
        ))}
      </ul>
    </nav>
  )
}
