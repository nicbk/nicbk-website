import { useQuery } from '@rocicorp/zero/react'
import { queries } from '~/zero/queries'
import { UploadModal } from '../upload-modal/upload-modal'
import { UploadStatus } from '../upload-status/upload-status'
import styles from './collection-toolbar.module.css'

/**
 * The row above the collection: the "+" button and the upload-status indicator.
 *
 * ## The empty space on the left is #8's
 *
 * The decided layout puts a search bar here, with these two controls beside it
 * (research/ui-ux/pages/lit-tracker/pages/collection-view.md, and the mockup's
 * centered search field). Search filters the synced Zero cache and belongs with
 * the full collection view, so it is #8's — and until it lands the controls sit
 * at the end of the row rather than floating in the middle of an empty one.
 *
 * **When #8 adds the search bar, these move back beside it.** Agreed with the
 * user when this row was designed: the controls belong next to the search
 * field, not pinned to the far edge. That is a change to this file's CSS, not
 * to its structure.
 *
 * ## Why the jobs query lives here
 *
 * The indicator is the only thing that reads `upload_jobs`, and this is the
 * component that owns it — so the query sits at the smallest scope that covers
 * its consumer rather than being threaded down from the page. `uploadJobs.mine`
 * is the query task 1 defined and authorized; the rows are the signed-in user's
 * unresolved uploads, oldest first, and they arrive by sync, so an upload
 * submitted in another tab shows up here too.
 */
export function CollectionToolbar() {
  const [jobs] = useQuery(queries.uploadJobs.mine())

  return (
    // Not a <nav> or a <toolbar>: two unrelated controls, one of which opens a
    // dialog. A toolbar role would promise arrow-key navigation between them.
    <div className={styles.toolbar}>
      <div className={styles.controls}>
        <UploadModal />
        <UploadStatus jobs={jobs} />
      </div>
    </div>
  )
}
