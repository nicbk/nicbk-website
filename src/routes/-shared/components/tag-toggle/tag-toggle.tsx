import { Toggle } from '@base-ui/react/toggle'
import type { MouseEvent, ReactNode } from 'react'
import styles from './tag-toggle.module.css'

/**
 * Drop focus from a toggle when it was activated by pointer or touch, but keep
 * it for keyboard activation.
 *
 * A tapped toggle retains focus, and on mobile the browser paints a
 * `:focus-visible` ring for that retained focus. The ring is the accent color,
 * identical to a selected tag, so it lingers on a *deselected* tag and reads as
 * "still selected," which is confusing. Removing focus after a tap removes the
 * ring entirely, regardless of the browser's focus-visible heuristic.
 *
 * Keyboard activation (Enter/Space) must NOT be blurred: those users need focus
 * to stay put, with its visible ring, to keep moving through the tags. A
 * keyboard-synthesized click reports `detail === 0`; a pointer/touch tap reports
 * `detail >= 1` — the standard signal for telling the two apart.
 *
 * This came out of real use on the blog's filters, and it is the main reason
 * this component is shared rather than reimplemented per surface: it is a fix
 * nobody would think to write a second time.
 */
function dropFocusAfterPointerActivation(event: MouseEvent<HTMLButtonElement>) {
  if (event.detail > 0) {
    event.currentTarget.blur()
  }
}

interface TagToggleProps {
  /** The label. Rendered verbatim; the `#` is drawn by CSS, not added here. */
  children: ReactNode
  /** Whether this tag is currently selected. */
  pressed: boolean
  /** Called with the state the toggle is moving to. */
  onPressedChange: (pressed: boolean) => void
  /**
   * Overrides the accessible name. The visible label is enough for a plain tag;
   * a surface where the same word means something more specific ("only articles
   * you are reading") says so here.
   */
  label?: string | undefined
  /**
   * Draw a `#` before the label.
   *
   * Opt-in rather than always, because it is a house style of the *blog*, where
   * every tag is written `#name` — inline on a post, in the post's tag list, and
   * so in its filter too. The Lit Tracker writes tags plainly on its cards and
   * its reading statuses are not tags at all, so a hash in its filter rail
   * labelled the same list two different ways depending on where you read it.
   */
  hash?: boolean | undefined
}

/**
 * One tag, as a two-state filter button — the site's single tag-toggle style,
 * used by the blog's tag filter and the Lit Tracker's collection filters.
 *
 * A Base UI `Toggle` — the decided component library's two-state button (see
 * research/ui-ux/design-system.md). It renders a real `<button>`, exposes its
 * state as `aria-pressed` for assistive tech, and mirrors it as the
 * `data-pressed` styling hook the stylesheet keys off (which also shows the
 * pressed state visually, not by color alone). Using the primitive rather than a
 * hand-rolled `<button aria-pressed>` keeps every interactive control in the app
 * on the same foundation instead of a mix of from-scratch and Base UI widgets.
 *
 * Deliberately not a list item, a `<nav>`, or a heading: what a group of these
 * *means* differs per surface — the tracker has two groups with different
 * selection rules — so the surrounding structure belongs to the caller and only
 * the control itself is shared.
 */
export function TagToggle({
  children,
  pressed,
  onPressedChange,
  label,
  hash = false,
}: TagToggleProps) {
  return (
    <Toggle
      className={styles.toggle}
      pressed={pressed}
      onPressedChange={onPressedChange}
      onClick={dropFocusAfterPointerActivation}
      aria-label={label}
      // A styling hook rather than a character in the markup: the `#` is
      // decoration, and putting it in the DOM would put it in the accessible
      // name and in anything that copies the text out.
      data-hash={hash ? '' : undefined}
    >
      {children}
    </Toggle>
  )
}
