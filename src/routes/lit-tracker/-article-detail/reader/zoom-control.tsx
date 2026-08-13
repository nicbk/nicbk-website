import { Menu } from '@base-ui/react/menu'
import type { ZoomLevel } from '@embedpdf/plugin-zoom'
import { Check, Minus, Plus } from 'lucide-react'
import { formatZoomPercent, ZOOM_PRESETS } from './zoom-presets'
import styles from './zoom-control.module.css'

/**
 * Zoom: two steps and a menu of the levels worth naming.
 *
 * The minus and plus cover adjusting; the menu in the middle covers deciding —
 * "fit width" is one click rather than eight presses of a step button, and it is
 * the level a reader actually wants most of the time in a panel whose width
 * changes with the sidebar.
 *
 * **A menu rather than a popover**, unlike the card's three-dot control. That
 * one became a popover because it holds a filter field and three regions that
 * scroll independently — none of which a menu's one-flat-list-of-items contract
 * allows. This holds eight mutually exclusive choices and nothing else, which is
 * exactly what a menu's radio group is for, and it inherits the keyboard model
 * for free.
 */

/** What the trigger shows when there is no document to be zoomed. */
const NO_DOCUMENT = '—'

interface ZoomControlProps {
  /** The effective scale, e.g. `1.237`. What the trigger reports. */
  currentZoom: number
  /** What was asked for — a mode or a number. What the menu shows as chosen. */
  zoomLevel: ZoomLevel
  onZoomIn: () => void
  onZoomOut: () => void
  onRequestZoom: (level: ZoomLevel) => void
  /** True before a document exists: the controls stay, inert. */
  disabled: boolean
}

export function ZoomControl({
  currentZoom,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onRequestZoom,
  disabled,
}: ZoomControlProps) {
  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.button}
        onClick={onZoomOut}
        disabled={disabled}
        aria-label="zoom out"
      >
        <Minus className={styles.icon} aria-hidden="true" />
      </button>

      <Menu.Root>
        <Menu.Trigger
          className={styles.trigger}
          disabled={disabled}
          aria-label="zoom level"
        >
          {disabled ? NO_DOCUMENT : formatZoomPercent(currentZoom)}
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner
            className={styles.positioner}
            sideOffset={4}
            align="end"
          >
            <Menu.Popup className={styles.popup}>
              <Menu.RadioGroup
                // `String`, because a radio group compares values and these are
                // a mix of mode strings and numbers — `1` and `'1'` must not be
                // two different selections.
                value={String(zoomLevel)}
              >
                {ZOOM_PRESETS.map((preset) => (
                  <Menu.RadioItem
                    key={String(preset.level)}
                    value={String(preset.level)}
                    className={styles.item}
                    onClick={() => onRequestZoom(preset.level)}
                    // Base UI leaves a radio item open by default, which suits a
                    // group you might toggle several of. Picking a zoom is one
                    // decision, and leaving the menu covering the paper you just
                    // resized is exactly the wrong thing to look at.
                    closeOnClick
                  >
                    <Menu.RadioItemIndicator className={styles.indicator}>
                      <Check
                        className={styles.indicatorIcon}
                        aria-hidden="true"
                      />
                    </Menu.RadioItemIndicator>
                    {preset.label}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <button
        type="button"
        className={styles.button}
        onClick={onZoomIn}
        disabled={disabled}
        aria-label="zoom in"
      >
        <Plus className={styles.icon} aria-hidden="true" />
      </button>
    </div>
  )
}
