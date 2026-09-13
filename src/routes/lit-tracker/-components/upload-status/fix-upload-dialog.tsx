import { useQuery } from '@rocicorp/zero/react'
import type { RefObject } from 'react'
import { ArticleEditDialog } from '~/routes/lit-tracker/-components/article-edit/article-edit-dialog'
import { useArticleMutations } from '~/routes/lit-tracker/-hooks/use-article-mutations'
import { queries } from '~/zero/queries'

interface FixUploadDialogProps {
  /** The article behind the failed upload the reader chose to fix. */
  articleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where focus goes when the dialog closes — see `UploadStatus`. */
  finalFocus: RefObject<HTMLElement | null>
}

/**
 * Task 1's edit modal, opened from a failed row in the upload popup.
 *
 * **It is a signpost, not a special case.** A failed article is an ordinary
 * article that happens to have a filename for a title and no authors, so this
 * points at the same dialog, the same mutator and the same validation the card
 * menu uses. Everything particular about arriving from a warning is *where the
 * reader came from*, which this file is, and that is the whole of it — there is
 * no "fix" mode inside the form.
 *
 * The two pieces the popup does not have are fetched here rather than threaded
 * down from `CollectionPage`, following the precedent `CollectionToolbar`
 * records for its own jobs query: the query sits at the smallest scope that
 * covers its consumer. Nothing above this needs to know the upload popup can
 * open a modal.
 *
 * **Retiring the job row is not done here.** It happens inside
 * `articles.updateDetails`, in the transaction that saves the metadata — see
 * `retireResolvedUpload` in `~/zero/mutators.ts` for why it has to be the same
 * write and not a second one this component makes afterwards. So there is
 * nothing to do on success: the row retires, the query above loses it, and the
 * indicator this was opened from re-derives itself.
 */
export function FixUploadDialog({
  articleId,
  open,
  onOpenChange,
  finalFocus,
}: FixUploadDialogProps) {
  const [articles] = useQuery(queries.articles.byId(articleId))
  const { updateDetails } = useArticleMutations()
  const article = articles[0]

  // Absent while the row syncs, and permanently if it was deleted from another
  // tab between opening the popup and pressing "fix". Rendering nothing is the
  // honest answer to both: there is no article to correct, and the failed row
  // it was reached from has gone with it through the same cascade.
  if (!article) {
    return null
  }

  return (
    <ArticleEditDialog
      article={{
        id: article.id,
        title: article.title,
        authors: article.authors,
        publicationYear: article.publicationYear,
        venue: article.venue,
        doi: article.doi,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onSave={(details) => updateDetails(articleId, details)}
      finalFocus={finalFocus}
    />
  )
}
