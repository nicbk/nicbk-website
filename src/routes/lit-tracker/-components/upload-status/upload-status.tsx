import { Popover } from '@base-ui/react/popover'
import { Tooltip } from '@base-ui/react/tooltip'
import { AlertTriangle, Check, LoaderCircle } from 'lucide-react'
import type { RefObject } from 'react'
import { useRef, useState } from 'react'
import { FixUploadDialog } from './fix-upload-dialog'
import type { UploadJobRow } from './job-list'
import { JobList } from './job-list'
import type { ReferenceReadRow, UploadStatusState } from './status-state'
import {
  referenceReadSummary,
  uploadStatusLabel,
  uploadStatusState,
} from './status-state'
import styles from './upload-status.module.css'

interface UploadStatusProps {
  /** The signed-in user's unresolved upload jobs, live from Zero. */
  jobs: readonly UploadJobRow[]
  /** The signed-in user's re-reads of older papers, live from Zero. */
  referenceReads?: readonly ReferenceReadRow[]
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
 * anything itself. A failed row is resolved from inside the popup as of #11's
 * third task — see `FixUploadDialog` — and the row's disappearance is what
 * changes the icon, because there is no state here to change.
 *
 * ## Why the whole thing is wrapped, and why one ref spans both branches
 *
 * Resolving the last failure does not merely shorten the list: it swaps this
 * control. The popup's trigger is a `<button>`; with nothing left to show,
 * `SyncedIndicator` replaces it with a `<span>`. So the element the reader
 * opened the modal from is **destroyed by the act of succeeding**, and a
 * `finalFocus` pointing at it would drop focus to `<body>` at the exact moment
 * a screen-reader user most needs to be told what happened.
 *
 * `indicatorRef` is attached to whichever of the two is rendered, so focus
 * returns to the same slot either way — and lands on the checkmark, whose
 * accessible name is the outcome of what the reader just did (user-decided
 * 2026-09-13). The dialog is this component's sibling rather than the popover's
 * child for the reason `ArticleMenu` records: the popover closes on the way in,
 * and a dialog inside it would unmount the instant it opened.
 *
 * The article id is kept after the dialog closes rather than cleared. Clearing
 * it would unmount the dialog in the same commit that closes it, which is what
 * makes focus restoration a race — and the cost of keeping it is one query for
 * a row the client has already synced.
 */
export function UploadStatus({ jobs, referenceReads = [] }: UploadStatusProps) {
  const reads = referenceReadSummary(referenceReads)
  const state = uploadStatusState(jobs, reads)
  const indicatorRef = useRef<HTMLElement>(null)
  const [fixingArticleId, setFixingArticleId] = useState<string | null>(null)
  const [fixing, setFixing] = useState(false)

  return (
    <>
      {state === 'synced' ? (
        <SyncedIndicator ref={indicatorRef} />
      ) : (
        <Popover.Root>
          <Popover.Trigger
            ref={indicatorRef as RefObject<HTMLButtonElement | null>}
            className={styles.indicator}
            aria-label={uploadStatusLabel(state, jobs)}
          >
            <StatusIcon state={state} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} align="end">
              <Popover.Popup className={styles.popup}>
                <Popover.Title className={styles.popupTitle}>
                  uploads
                </Popover.Title>
                <JobList
                  jobs={jobs}
                  referenceReads={reads}
                  onFix={(articleId) => {
                    setFixingArticleId(articleId)
                    setFixing(true)
                  }}
                />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}

      {fixingArticleId !== null && (
        <FixUploadDialog
          articleId={fixingArticleId}
          open={fixing}
          onOpenChange={setFixing}
          finalFocus={indicatorRef}
        />
      )}
    </>
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
 *
 * **`tabIndex={-1}` does not undo any of that.** A negative index keeps the
 * element out of the tab order exactly as before; what it adds is the ability to
 * receive focus when something *puts* it here. That something is the edit modal
 * closing after the reader resolved the last failed upload: the warning button
 * they opened it from no longer exists, and this is what stands in its place.
 * Landing here announces "All articles synced" — the result of what they just
 * did — rather than dropping focus to the document body.
 */
function SyncedIndicator({ ref }: { ref: RefObject<HTMLElement | null> }) {
  const label = uploadStatusLabel('synced')

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <span
            ref={ref as RefObject<HTMLSpanElement | null>}
            className={styles.synced}
            role="img"
            aria-label={label}
            tabIndex={-1}
          />
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
