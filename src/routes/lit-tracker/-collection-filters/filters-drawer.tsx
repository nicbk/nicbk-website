import { Drawer } from '@base-ui/react/drawer'
import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CollectionFilters } from './collection-filters'
import styles from './filters-drawer.module.css'

/** Names the trigger and the sheet it opens, so the two read as one thing. */
const FILTERS_LABEL = 'filters'

/**
 * The width below which the filters live in this sheet rather than in the rail.
 *
 * The same 768px the stylesheets use — CSS and JS cannot share a media query, so
 * the two are kept in step by hand. `filters-drawer.module.css` shows the
 * trigger below it and `lit-tracker-sidebar.module.css` hides the rail's slot at
 * exactly the same point.
 */
const NARROW_VIEWPORT = '(max-width: 768px)'

/**
 * The filters on a narrow screen: a sheet that slides up from the bottom edge,
 * opened from the collection's control row.
 *
 * **Why not simply put the rail below the cards.** That is what the decided
 * responsive convention's first option says, and it is what this task was
 * written to do — but the same feature adds infinite scroll in its next task,
 * and filters underneath a list that never ends can never be reached. The
 * convention's own second option is a toggleable drawer, so this takes it
 * (user-decided 2026-08-09). The rail still moves below the content: what
 * remains of it there is the account control, and its filters moved in here.
 *
 * Hidden above the breakpoint by CSS rather than by a width hook, so nothing
 * about the first render depends on measuring the viewport — and the sheet's
 * contents only exist while it is open, so the filter list is never mounted
 * twice at once even though two surfaces can show it.
 *
 * A bottom sheet, not a side panel: it is opened from a control at the top of a
 * one-handed screen and dismissed by swiping down, the direction the gesture
 * already means "put this away".
 */
export function FiltersDrawer() {
  const [open, setOpen] = useState(false)

  /**
   * Close the sheet if the window grows past the breakpoint while it is open.
   *
   * Hiding the trigger in CSS stops a wide window from *opening* the sheet, but
   * it does nothing about one already open — widening the window then showed the
   * rail and the sheet at once, two copies of the same filters, with the sheet
   * stretched across the whole application. Caught by dragging the window wider
   * with the sheet open; the CSS alone looked complete.
   *
   * Only subscribed while open, so a page whose sheet is shut does no work on
   * resize at all.
   */
  useEffect(() => {
    if (!open) {
      return
    }
    const narrow = window.matchMedia(NARROW_VIEWPORT)
    const closeIfWide = () => {
      if (!narrow.matches) {
        setOpen(false)
      }
    }
    narrow.addEventListener('change', closeIfWide)
    return () => narrow.removeEventListener('change', closeIfWide)
  }, [open])

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="down">
      <Drawer.Trigger className={styles.trigger}>
        <SlidersHorizontal className={styles.triggerIcon} aria-hidden="true" />
        {FILTERS_LABEL}
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Backdrop className={styles.backdrop} />
        <Drawer.Viewport className={styles.viewport}>
          <Drawer.Popup className={styles.popup}>
            {/* The grab handle. Decorative: the sheet is dismissible by swipe,
                by Escape, and by pressing the backdrop, and this is the visual
                cue for the first of those rather than a control of its own. */}
            <div className={styles.grip} aria-hidden="true" />
            <Drawer.Content className={styles.content}>
              <Drawer.Title className={styles.title}>
                {FILTERS_LABEL}
              </Drawer.Title>
              <CollectionFilters />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
