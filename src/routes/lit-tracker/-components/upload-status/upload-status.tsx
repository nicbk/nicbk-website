import { Popover } from '@base-ui/react/popover'
import { Tooltip } from '@base-ui/react/tooltip'
import { AlertTriangle, Check, LoaderCircle } from 'lucide-react'
import type { UploadJobRow } from './job-list'
import { JobList } from './job-list'
import type { UploadStatusState } from './status-state'
import { uploadStatusLabel, uploadStatusState } from './status-state'
import styles from './upload-status.module.css'

interface UploadStatusProps {
  /** The signed-in user's unresolved upload jobs, live from Zero. */
  jobs: readonly UploadJobRow[]
}

/**
 * The upload-status indicator beside the "+" button, and the job list it opens
 * (research/ui-ux/pages/lit-tracker/components/upload-status.md).
 *
 * Three states, and the middle one is the reason this is not simply a button:
 * with nothing in flight and nothing failed, the checkmark is **not
 * clickable** — there is no list to show — and it carries a tooltip instead.
 * The other two open the same popup.
 *
 * Everything here is driven by live `upload_jobs` rows, so the indicator
 * changes as the pipeline works without this component polling or tracking
 * anything itself. Today nothing resolves those rows — the extract stage is
 * task 4 — so a submitted upload stays in progress, which is the intended
 * intermediate state.
 */
export function UploadStatus({ jobs }: UploadStatusProps) {
  const state = uploadStatusState(jobs)

  if (state === 'synced') {
    return <SyncedIndicator />
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        className={styles.indicator}
        aria-label={uploadStatusLabel(state)}
      >
        <StatusIcon state={state} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className={styles.popup}>
            <Popover.Title className={styles.popupTitle}>uploads</Popover.Title>
            <JobList jobs={jobs} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/**
 * The resting state: a checkmark that is deliberately not a control.
 *
 * Rendered as a `<span>` rather than a disabled button so it is not in the tab
 * order at all — a focusable control that does nothing when activated is worse
 * than no control, and there is genuinely no list to open.
 *
 * Named with `role="img"` plus a label rather than a live region: what it
 * conveys is a standing fact about the collection, not an event, and a status
 * region would both announce itself unprompted and collide with the page's real
 * one while the first sync is in flight.
 */
function SyncedIndicator() {
  const label = uploadStatusLabel('synced')

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <span className={styles.synced} role="img" aria-label={label} />
        }
      >
        <Check className={styles.icon} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className={styles.tooltip}>{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function StatusIcon({ state }: { state: UploadStatusState }) {
  if (state === 'failed') {
    return <AlertTriangle className={styles.iconFailed} aria-hidden="true" />
  }
  // Spins only when the reader has not asked for reduced motion; the CSS
  // decides, so the icon is the same element either way.
  return <LoaderCircle className={styles.iconSpinning} aria-hidden="true" />
}
