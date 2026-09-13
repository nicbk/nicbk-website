import { Button } from '@base-ui/react/button'
import { Dialog } from '@base-ui/react/dialog'
import { Field } from '@base-ui/react/field'
import { Input } from '@base-ui/react/input'
import { X } from 'lucide-react'
import type { RefObject } from 'react'
import { useRef, useState } from 'react'
import type { MutationFailure } from '~/routes/lit-tracker/-hooks/use-mutation-runner'
import type {
  ArticleDetails,
  ArticleDraft,
  DraftErrors,
  EditableArticle,
} from './article-draft'
import {
  detailsFrom,
  draftErrors,
  draftFrom,
  isSaveable,
} from './article-draft'
import { AuthorsEditor } from './authors-editor'
import styles from './article-edit-dialog.module.css'

interface ArticleEditDialogProps {
  /** The row being corrected, read once when the dialog opens. */
  article: EditableArticle
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Saves the correction, answering with what to tell the reader if it did not
   * land — `null` when it did.
   *
   * A failure comes back rather than being shown, because the decided rule is
   * that an error inside a form is shown inside that form
   * (research/ui-ux/design-system.md). Returning it is also what tells this
   * dialog to stay open, which a toast could not.
   */
  onSave: (details: ArticleDetails) => Promise<MutationFailure | null>
  /**
   * Where focus goes when the dialog closes — the three-dot trigger that opened
   * the menu this was launched from.
   *
   * Needed explicitly because the button that opened this lives inside a
   * popover that closes on the way in, so by the time the dialog is dismissed
   * the element focus would naturally return to no longer exists.
   */
  finalFocus: RefObject<HTMLElement | null>
}

/**
 * The interface decided on 2026-07-02 in
 * research/ui-ux/pages/lit-tracker/components/article-edit.md: a centered modal
 * that lets a reader correct what the extractor wrote.
 *
 * Every article in this collection was catalogued by a machine reading a PDF,
 * and GROBID is good rather than right. This is the surface that makes the
 * reader the authority it was standing in for — and its first real user is
 * usually the worst case, an article whose extraction failed outright and which
 * therefore opens with a filename for a title and no authors at all.
 *
 * **Opening takes a snapshot** (`draftFrom`), which is this form's whole
 * implementation of the decided editing/non-editing rule: while the reader is
 * typing, what arrives from sync must not land in the fields under their
 * cursor. What that costs is stated on `draftFrom` rather than discovered.
 *
 * **Validation is shown on save, not on arrival.** A failed extraction opens
 * this form already invalid, and a modal that greets a reader with two errors
 * before they have touched anything is scolding them for someone else's
 * mistake. The mutator refuses a bad save regardless — the messages here are
 * the kind half of a rule that is enforced elsewhere.
 */
export function ArticleEditDialog({
  article,
  open,
  onOpenChange,
  onSave,
  finalFocus,
}: ArticleEditDialogProps) {
  const titleRef = useRef<HTMLInputElement>(null)

  /**
   * Focuses the title, showing its **beginning**.
   *
   * Focusing an input leaves the caret at the end, which for a paper title —
   * they are sentences — scrolls the field to the last few words and shows the
   * reader the tail of something they came here to read. Collapsing the
   * selection to the start before handing the element over is what puts the
   * caret at 0, and this runs before Base UI focuses rather than racing it
   * afterwards.
   */
  function focusTitleStart(): HTMLElement | null {
    titleRef.current?.setSelectionRange(0, 0)
    return titleRef.current
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup
          className={styles.popup}
          finalFocus={finalFocus}
          // The title is where a correction almost always starts, and for a
          // failed extraction it is the field holding a filename.
          initialFocus={focusTitleStart}
        >
          <div className={styles.header}>
            <Dialog.Title className={styles.title}>edit article</Dialog.Title>
            <Dialog.Close className={styles.close} aria-label="Close">
              <X className={styles.closeIcon} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <EditForm
            article={article}
            onSave={onSave}
            onSaved={() => onOpenChange(false)}
            titleRef={titleRef}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface EditFormProps {
  article: EditableArticle
  onSave: (details: ArticleDetails) => Promise<MutationFailure | null>
  onSaved: () => void
  titleRef: RefObject<HTMLInputElement | null>
}

/**
 * The form, and every piece of state that belongs to one visit to it.
 *
 * **Its own component because the popup unmounts when the dialog closes**, so
 * the draft, the validation messages and any refusal live exactly as long as the
 * form the reader is looking at. That is not a detail: holding this state one
 * level up looked identical and was wrong, because the surface that opens this
 * sets its own `open` flag rather than going through the dialog's handler — so
 * nothing here would run on the way *in*, and a second visit showed the draft
 * abandoned on the first, complete with its error message.
 *
 * The snapshot itself is `useState`'s initializer, which is the shortest way to
 * say "once per mount, from the row as it is now" — see `draftFrom` for what
 * taking one costs.
 */
function EditForm({ article, onSave, onSaved, titleRef }: EditFormProps) {
  const [draft, setDraft] = useState<ArticleDraft>(() => draftFrom(article))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [failure, setFailure] = useState<MutationFailure | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    const found = draftErrors(draft)
    setErrors(found)
    if (!isSaveable(found)) {
      return
    }

    setFailure(null)
    setSaving(true)
    const refused = await onSave(detailsFrom(draft))
    setSaving(false)

    if (refused) {
      setFailure(refused)
      return
    }
    onSaved()
  }

  // A real `<form>`, so Enter in a text field submits the way a reader expects
  // rather than doing nothing.
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      {/*
        The fields scroll; the buttons below them do not. Letting the whole
        modal scroll instead put "save" below the fold of a 1440x900 desktop
        window on a paper with fourteen authors — a primary action a reader had
        to go looking for.
      */}
      <div className={styles.fields}>
        <Field.Root
          className={styles.field}
          invalid={errors.title !== undefined}
        >
          <Field.Label className={styles.label}>title</Field.Label>
          <Field.Control
            render={
              <Input
                ref={titleRef}
                className={styles.input}
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            }
          />
          {errors.title !== undefined && (
            <Field.Error className={styles.error} match>
              {errors.title}
            </Field.Error>
          )}
        </Field.Root>

        <AuthorsEditor
          authors={draft.authors}
          error={errors.authors}
          onChange={(authors) => setDraft({ ...draft, authors })}
        />

        <Field.Root
          className={styles.field}
          invalid={errors.publicationYear !== undefined}
        >
          <Field.Label className={styles.label}>publication year</Field.Label>
          <Field.Control
            render={
              <Input
                className={styles.input}
                // A numeric keypad on a phone, without `type="number"`'s
                // spinners and scroll-wheel surprises on a desktop.
                inputMode="numeric"
                value={draft.publicationYear}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    publicationYear: event.target.value,
                  })
                }
              />
            }
          />
          {errors.publicationYear !== undefined && (
            <Field.Error className={styles.error} match>
              {errors.publicationYear}
            </Field.Error>
          )}
        </Field.Root>

        <Field.Root className={styles.field}>
          <Field.Label className={styles.label}>venue</Field.Label>
          <Field.Control
            render={
              <Input
                className={styles.input}
                value={draft.venue}
                onChange={(event) =>
                  setDraft({ ...draft, venue: event.target.value })
                }
              />
            }
          />
        </Field.Root>

        <Field.Root className={styles.field}>
          <Field.Label className={styles.label}>DOI</Field.Label>
          <Field.Control
            render={
              <Input
                className={styles.input}
                value={draft.doi}
                onChange={(event) =>
                  setDraft({ ...draft, doi: event.target.value })
                }
              />
            }
          />
        </Field.Root>

        {failure !== null && (
          <p className={styles.error} role="alert">
            {failure.message}
          </p>
        )}
      </div>

      <div className={styles.buttons}>
        <Button
          type="submit"
          className={styles.save}
          disabled={saving}
          focusableWhenDisabled
        >
          {saving ? 'saving…' : 'save'}
        </Button>
        <Dialog.Close className={styles.cancel}>cancel</Dialog.Close>
      </div>
    </form>
  )
}
