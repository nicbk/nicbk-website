import { Dialog } from '@base-ui/react/dialog'
import type { FormEvent } from 'react'
import { useId, useState } from 'react'
import styles from './new-tag-dialog.module.css'

/** The longest tag name the mutator will accept — kept in step with its schema. */
const MAX_TAG_NAME_LENGTH = 64

interface NewTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Named in the dialog's title, so it is clear which card this applies to. */
  articleTitle: string
  /** Called with a trimmed, non-empty name. Never called with anything else. */
  onSubmit: (name: string) => void
}

/**
 * Where a tag name is typed.
 *
 * A dialog rather than a field inside the menu, and that is a semantics
 * constraint rather than a layout preference: the ARIA `menu` role expects
 * `menuitem` children, and a menu that contains a textbox stops being navigable
 * the way a menu is — arrow keys and typeahead both belong to the field the
 * moment it has focus. Base UI documents opening a dialog from a menu item for
 * exactly this, and its own "creatable combobox" example resolves the same
 * tension the same way.
 *
 * The dialog earns its weight: focus moves into the field and is trapped, Escape
 * dismisses, and focus returns to the card — none of which a field wedged into
 * a popup would get for free. No `autoFocus` is needed for the first of those;
 * Base UI focuses the popup's first tabbable element, which is the field, and it
 * deliberately does not on touch, where that would throw up a keyboard over the
 * dialog the reader has not read yet.
 *
 * The reader never has to know whether the name they typed is new. `ArticleMenu`
 * decides: an existing name applies that tag, a new one creates it. This
 * component's whole job is to collect a string.
 */
export function NewTagDialog({
  open,
  onOpenChange,
  articleTitle,
  onSubmit,
}: NewTagDialogProps) {
  const [name, setName] = useState('')
  const inputId = useId()

  const trimmed = name.trim()
  const canSubmit = trimmed !== ''

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      // Cleared on close rather than on open, so a dismissed attempt does not
      // reappear half-typed the next time any card opens this.
      setName('')
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) {
      return
    }
    // Trimmed here as well as in the mutator's validator: this is what decides
    // whether the button is live, so the two must agree about what "empty"
    // means or the button offers to submit something the server refuses.
    onSubmit(trimmed)
    handleOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Title className={styles.title}>new tag</Dialog.Title>
          <Dialog.Description className={styles.description}>
            applied to “{articleTitle}”. a name you already use adds that tag
            instead of making another.
          </Dialog.Description>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor={inputId}>
              tag name
            </label>
            <input
              id={inputId}
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_TAG_NAME_LENGTH}
              autoComplete="off"
            />

            <div className={styles.actions}>
              <Dialog.Close className={styles.secondary}>cancel</Dialog.Close>
              <button
                type="submit"
                className={styles.primary}
                disabled={!canSubmit}
              >
                add
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
