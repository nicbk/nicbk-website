import { Button } from '@base-ui/react/button'
import { Dialog } from '@base-ui/react/dialog'
import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { MAX_FILES_PER_SUBMISSION } from '~/lit-tracker/upload/validation'
import type { RejectedFile } from './upload-request'
import { uploadPdfs } from './upload-request'
import styles from './upload-modal.module.css'

/**
 * The "+" button and the modal it opens: a multi-select PDF picker and nothing
 * else (research/ui-ux/pages/lit-tracker/components/upload-flow.md).
 *
 * **No metadata review.** Picking files and submitting is one action, and the
 * modal closes the moment the server accepts — extraction happens in the
 * background and is tracked by the status indicator beside this button, not
 * here. Anything GROBID gets wrong is fixed later through article-edit (#11),
 * which is what keeps this step to a single decision.
 *
 * Built on Base UI's `Dialog` for the same reasons the user-settings modal is:
 * focus trapped while open and returned to the trigger on close, Escape and
 * outside-click dismissal, scroll lock, and the popup named by its title.
 * Controlled here, unlike that one, because *this* modal closes in response to
 * a successful submission rather than only to the user.
 */
export function UploadModal() {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [rejections, setRejections] = useState<RejectedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const inputId = useId()
  const errorId = useId()

  /** Clears everything a previous attempt left behind when the modal reopens. */
  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setFiles([])
      setRejections([])
    }
  }

  async function submit() {
    setRejections([])
    setIsUploading(true)

    const outcome = await uploadPdfs(files)

    setIsUploading(false)
    if (outcome.status === 'rejected') {
      // Inline, beside the picker — not a toast. The message names a file the
      // user chose, so it belongs next to where they chose it.
      setRejections(outcome.rejected)
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className={styles.trigger} aria-label="Add articles">
        <Plus className={styles.triggerIcon} aria-hidden="true" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Close className={styles.close} aria-label="Close">
            <X className={styles.closeIcon} aria-hidden="true" />
          </Dialog.Close>

          <Dialog.Title className={styles.title}>add articles</Dialog.Title>

          <label className={styles.pickerLabel} htmlFor={inputId}>
            PDFs — up to {MAX_FILES_PER_SUBMISSION} at once
          </label>
          <input
            id={inputId}
            className={styles.picker}
            type="file"
            accept="application/pdf"
            multiple
            disabled={isUploading}
            aria-describedby={rejections.length > 0 ? errorId : undefined}
            onChange={(event) => {
              // A fresh selection supersedes the previous refusal: leaving the
              // old message up would read as a verdict on the new files.
              setRejections([])
              setFiles(Array.from(event.target.files ?? []))
            }}
          />

          {rejections.length > 0 && (
            <ul className={styles.errors} id={errorId}>
              {rejections.map((rejection) => (
                <li
                  className={styles.error}
                  // Filenames are unique enough within one picker selection,
                  // and the message distinguishes two entries of the same name.
                  key={`${rejection.filename}:${rejection.message}`}
                  role="alert"
                >
                  {rejection.filename && (
                    <span className={styles.errorFile}>
                      {rejection.filename}
                    </span>
                  )}
                  {rejection.message}
                </li>
              ))}
            </ul>
          )}

          <Button
            className={styles.submit}
            // Nothing chosen is not an error worth a message — the button
            // simply has nothing to do yet.
            disabled={files.length === 0 || isUploading}
            focusableWhenDisabled
            onClick={submit}
          >
            {isUploading ? 'uploading…' : submitLabel(files.length)}
          </Button>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function submitLabel(count: number): string {
  if (count === 0) {
    return 'upload'
  }
  return count === 1 ? 'upload 1 PDF' : `upload ${count} PDFs`
}
