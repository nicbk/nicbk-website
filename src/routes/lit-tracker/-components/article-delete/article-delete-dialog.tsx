import { Button } from '@base-ui/react/button'
import { Dialog } from '@base-ui/react/dialog'
import { Field } from '@base-ui/react/field'
import { Input } from '@base-ui/react/input'
import { X } from 'lucide-react'
import type { RefObject } from 'react'
import { useId, useRef, useState } from 'react'
import { matchesConfirmation } from '~/routes/-shared/components/user-settings/confirmation-match'
import styles from './article-delete-dialog.module.css'

/**
 * The word a reader types to confirm.
 *
 * **Not the article's title**, which was the obvious choice and is wrong for the
 * content this app really holds: paper titles are sentences, and a survey's runs
 * past twenty words. Asking for one back would be transcription long enough that
 * every reader would paste it, which is exactly the deliberation the pattern
 * exists to buy — a pasted phrase is a click with extra steps. The decided
 * requirement is the *pattern* — an exact text match rather than a native
 * `confirm()` — and it notes that an article is lower-stakes than an account
 * (research/ui-ux/pages/lit-tracker/components/article-edit.md). A short word
 * nobody types by accident is the version of it that stays a deliberate act.
 * (User-decided 2026-09-13.)
 */
export const DELETE_CONFIRMATION = 'delete'

interface ArticleDeleteDialogProps {
  /** Named in the warning, so it is unmistakable which paper this is about. */
  articleTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Deletes the article. Fire-and-forget on purpose — see `ConfirmForm` for why
   * this dialog does not wait for the server's answer.
   */
  onDelete: () => void
  /**
   * Where focus goes when the dialog closes — the three-dot trigger, since the
   * control that opened this lived in a popover that has since closed. Same
   * reasoning as the edit dialog's.
   */
  finalFocus: RefObject<HTMLElement | null>
}

/**
 * The confirmation an article has to pass through to be deleted, and the second
 * half of the interface decided in
 * research/ui-ux/pages/lit-tracker/components/article-edit.md.
 *
 * **Deliberately not a native `confirm()`**, for the reasons `delete-account.tsx`
 * gives: that dialog is unstyleable, dismissed by reflex, and asks for a click
 * where this asks for an act of transcription. The comparison itself is
 * `matchesConfirmation`, imported rather than rewritten — a second `===` with
 * its own ideas about trimming is how the rule quietly loosens.
 *
 * **What this actually removes** is stated before it happens, because it is more
 * than the card: the annotations the reader drew on the paper, their notes, the
 * tags they applied, and the PDF itself. A warning that says only "delete this
 * article?" understates it.
 */
export function ArticleDeleteDialog({
  articleTitle,
  open,
  onOpenChange,
  onDelete,
  finalFocus,
}: ArticleDeleteDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup
          className={styles.popup}
          finalFocus={finalFocus}
          // The field, not the close button Base UI would otherwise land on:
          // typing the word is the only thing this dialog asks for.
          initialFocus={inputRef}
        >
          <div className={styles.header}>
            <Dialog.Title className={styles.title}>delete article</Dialog.Title>
            <Dialog.Close className={styles.close} aria-label="Close">
              <X className={styles.closeIcon} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <ConfirmForm
            articleTitle={articleTitle}
            inputRef={inputRef}
            onDelete={onDelete}
            onDone={() => onOpenChange(false)}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ConfirmFormProps {
  articleTitle: string
  inputRef: RefObject<HTMLInputElement | null>
  onDelete: () => void
  onDone: () => void
}

/**
 * The warning, the field, and the typed text — everything belonging to one visit.
 *
 * **Its own component because the popup unmounts when the dialog closes**, which
 * is the same lesson task 1 learned the hard way: the surface that opens this
 * sets its own `open` flag rather than going through the dialog's handler, so
 * nothing here runs on the way *in*, and state held a level up would greet the
 * next visit with a confirmation already half-typed. For a destructive control
 * that is worse than untidy — it is a delete one keystroke from ready that the
 * reader did not start.
 *
 * **It does not wait for the server.** Zero applies the delete to the local copy
 * at once, so by the time a round trip returned the card would already be gone
 * from the grid and the detail page would already be rendering an article that
 * no longer exists. Holding the modal open over that would be showing the reader
 * a decision still being made about something already undone. So the dialog
 * closes as the write is sent, and a refusal arrives as a toast from the shared
 * runner — the one case where the error belongs outside the form that caused it,
 * because that form is deliberately gone. (User-decided 2026-09-13.)
 */
function ConfirmForm({
  articleTitle,
  inputRef,
  onDelete,
  onDone,
}: ConfirmFormProps) {
  const [typed, setTyped] = useState('')
  const warningId = useId()

  const confirmed = matchesConfirmation(typed, DELETE_CONFIRMATION)

  function confirm() {
    // Belt and braces: the button is inert unless this holds, but the rule
    // guarding an irreversible action should not live only in an attribute.
    if (!confirmed) {
      return
    }
    onDelete()
    onDone()
  }

  return (
    // A real `<form>`, so Enter in the field confirms — the reader has just
    // typed a word into it, and nothing else here is submittable.
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        confirm()
      }}
    >
      <p className={styles.warning} id={warningId}>
        This permanently deletes <strong>{articleTitle}</strong> — its PDF, your
        annotations on it, your notes, and its tags. This cannot be undone. Type{' '}
        {DELETE_CONFIRMATION} below to confirm.
      </p>

      <Field.Root className={styles.field}>
        <Field.Label className={styles.label}>
          type {DELETE_CONFIRMATION}
        </Field.Label>
        <Field.Control
          render={
            <Input
              ref={inputRef}
              className={styles.input}
              value={typed}
              // Nothing a password manager or address book should offer to
              // fill, and a stored suggestion would defeat the typing.
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          }
        />
      </Field.Root>

      <div className={styles.buttons}>
        {/*
          Inert rather than natively disabled (`focusableWhenDisabled` renders
          `aria-disabled`), so it stays in the tab order: a natively disabled
          button vanishes from it, and a reader navigating by keyboard would
          never learn the action exists, let alone what unlocks it.
        */}
        <Button
          type="submit"
          className={styles.destructive}
          disabled={!confirmed}
          focusableWhenDisabled
          aria-describedby={warningId}
        >
          delete article
        </Button>
        <Dialog.Close className={styles.cancel}>cancel</Dialog.Close>
      </div>
    </form>
  )
}
