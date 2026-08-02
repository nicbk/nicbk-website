import styles from './tracker-loading.module.css'

/** Announced while a tracker surface has nothing to show yet. */
export const TRACKER_LOADING_MESSAGE = 'loading your collection…'

/**
 * The cold-load placeholder every Lit Tracker surface shows before its data
 * exists: a skeleton, not a spinner, per the design system's reactive-feedback
 * default (research/ui-ux/design-system.md).
 *
 * It covers two moments that look identical to a reader and are worth keeping
 * identical on screen:
 *
 *  1. Before hydration. Zero has no SSR support, so everything under the client
 *     provider renders nothing on the server (see `zero-client-provider.tsx`).
 *  2. After hydration, while the first sync is still in flight — Zero reports
 *     this as a query whose result type is not yet `complete`.
 *
 * The bars are decoration and hidden from assistive tech; the status line is
 * what actually says something is happening, and it is clipped rather than
 * `display: none` so screen readers still reach it. Three bars is a shape, not
 * a guess at how many articles there are.
 */
export function TrackerLoading() {
  return (
    <>
      <p className={styles.status} role="status">
        {TRACKER_LOADING_MESSAGE}
      </p>
      <div className={styles.skeleton} aria-hidden="true">
        <span className={styles.skeletonRow} />
        <span className={styles.skeletonRow} />
        <span className={styles.skeletonRow} />
      </div>
    </>
  )
}
