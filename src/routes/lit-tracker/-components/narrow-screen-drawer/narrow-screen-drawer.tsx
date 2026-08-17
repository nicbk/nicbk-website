import { Drawer } from '@base-ui/react/drawer'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import styles from './narrow-screen-drawer.module.css'

/**
 * The width below which a side panel lives in a sheet rather than beside the
 * content.
 *
 * The same 768px the stylesheets use — CSS and JS cannot share a media query, so
 * the two are kept in step by hand. This module's stylesheet shows the trigger
 * below it, and whichever rail the sheet stands in for hides itself at exactly
 * the same point.
 */
const NARROW_VIEWPORT = '(max-width: 768px)'

interface NarrowScreenDrawerProps {
  /**
   * Names the trigger and titles the sheet, so the two read as one thing. Also
   * what a screen reader announces for both.
   */
  label: string
  /** The trigger's icon. Decorative — `label` carries the meaning. */
  icon: LucideIcon
  /** What the sheet holds. Mounted only while it is open. */
  children: ReactNode
}

/**
 * A side panel's narrow-screen form: a sheet that slides up from the bottom
 * edge, opened from a control in the page's own header row.
 *
 * **Why a sheet rather than moving the panel below the content.** That is what
 * the decided responsive convention's first option says, and it is what #8 was
 * written to do — but a panel underneath a list that never ends can never be
 * reached, and the same is true of one underneath a PDF. The convention's own
 * second option is a toggleable drawer, so both pages take it (user-decided
 * 2026-08-09).
 *
 * **Why this is shared rather than one per page.** #8 built this for the
 * collection's filters and #9 needs the identical behaviour for the detail
 * page's sidebar. Copying it would copy the resize effect below — the one piece
 * of logic here that was found by hand rather than by reading — into a second
 * place where nobody would think to fix it.
 *
 * Hidden above the breakpoint by CSS rather than by a width hook, so nothing
 * about the first render depends on measuring the viewport. The sheet's contents
 * only exist while it is open, so a panel is never mounted twice at once even
 * though two surfaces can show it.
 *
 * A bottom sheet, not a side panel: it is opened from a control at the top of a
 * one-handed screen and dismissed by swiping down, the direction the gesture
 * already means "put this away".
 */
export function NarrowScreenDrawer({
  label,
  icon: Icon,
  children,
}: NarrowScreenDrawerProps) {
  const [open, setOpen] = useState(false)

  /**
   * Close the sheet if the window grows past the breakpoint while it is open.
   *
   * Hiding the trigger in CSS stops a wide window from *opening* the sheet, but
   * it does nothing about one already open — widening the window then showed the
   * rail and the sheet at once, two copies of the same panel, with the sheet
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
      {/* The name is on the button rather than left to its text, because the
          text goes away on the narrowest screens — see the stylesheet. */}
      <Drawer.Trigger className={styles.trigger} aria-label={label}>
        <Icon className={styles.triggerIcon} aria-hidden="true" />
        <span className={styles.triggerLabel}>{label}</span>
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
              <Drawer.Title className={styles.title}>{label}</Drawer.Title>
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
