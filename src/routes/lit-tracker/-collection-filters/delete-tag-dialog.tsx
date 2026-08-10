import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Button } from '@base-ui/react/button'
import { useRef } from 'react'
import type { CollectionTag } from '~/routes/lit-tracker/-components/article-menu/article-menu'
import styles from './delete-tag-dialog.module.css'

interface DeleteTagDialogProps {
  /** The tag awaiting confirmation, or `null` when nothing is being deleted. */
  tag: CollectionTag | null
  /** How many articles currently carry it — the size of what is being lost. */
  articleCount: number
  /** Confirmed. The caller performs the delete; this component never writes. */
  onConfirm: (tag: CollectionTag) => void
  /** Dismissed, by the cancel button, the backdrop, or Escape. */
  onCancel: () => void
}

/**
 * "Delete this tag?" — the confirmation standing between a mistyped click in the
 * filter rail and a label that no longer exists.
 *
 * **Required, not offered.** A small `×` in a list of toggles is easy to hit by
 * accident, and the write is not undoable: deleting a tag removes it from every
 * article carrying it, by `ON DELETE CASCADE`. So the dialog names the tag *and*
 * says how many articles it comes off, because "delete `rlhf`?" and "delete
 * `rlhf`, which is on 34 papers?" are different questions and only the second
 * one can be answered.
 *
 * **A dialog, never a native `confirm()`** — the rule
 * research/ui-ux/pages/lit-tracker/components/article-edit.md sets for deleting
 * an article. It is deliberately *lighter* than the delete-account confirmation,
 * which makes you transcribe your own email address: that weight is proportionate
 * to destroying an account and disproportionate to a label that can be remade in
 * seconds.
 *
 * An `AlertDialog` rather than a `Dialog`: it announces as `alertdialog`, and it
 * does not close on an outside press, which is exactly the difference that
 * matters for a question that has to be answered rather than wandered away from.
 * Escape and cancel both dismiss without writing.
 */
export function DeleteTagDialog({
  tag,
  articleCount,
  onConfirm,
  onCancel,
}: DeleteTagDialogProps) {
  /**
   * Where focus lands when the dialog opens.
   *
   * Base UI focuses the first tabbable element by default, which here is the
   * button that deletes — so a reader who reflexively presses Enter after
   * mis-clicking the `×` would confirm the very thing the dialog exists to
   * question. Cancel is the safe default, and it is where the keyboard should
   * start.
   */
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog.Root
      // Controlled and mounted only while a tag is pending, so the question is
      // always about the tag that was just clicked and never about a stale one.
      open={tag !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCancel()
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Popup className={styles.popup} initialFocus={cancelRef}>
          <AlertDialog.Title className={styles.title}>
            delete “{tag?.name}”?
          </AlertDialog.Title>
          <AlertDialog.Description className={styles.description}>
            {describeLoss(articleCount)} this cannot be undone.
          </AlertDialog.Description>
          <div className={styles.buttons}>
            <Button
              className={styles.destructive}
              onClick={() => {
                if (tag) {
                  onConfirm(tag)
                }
              }}
            >
              delete tag
            </Button>
            <AlertDialog.Close className={styles.cancel} ref={cancelRef}>
              cancel
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

/**
 * What deleting the tag costs, in articles.
 *
 * Spelled out rather than rendered as a bare count so the sentence reads the
 * same at every size — including zero, where "removes it from 0 articles" would
 * be a strange way to say the tag is unused.
 */
function describeLoss(articleCount: number): string {
  if (articleCount === 0) {
    return 'no articles carry this tag.'
  }
  if (articleCount === 1) {
    return 'it will be removed from 1 article.'
  }
  return `it will be removed from ${articleCount} articles.`
}
