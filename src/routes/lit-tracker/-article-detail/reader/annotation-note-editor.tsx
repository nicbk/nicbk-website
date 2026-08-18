import { useId } from 'react'
import { useSyncedText } from '../use-synced-text'
import styles from './annotation-note-editor.module.css'

/**
 * What the reader has to say about one mark.
 *
 * **This is `annotations.contents`**, the column that has existed since task 4's
 * migration for exactly this, and it means the reader's own words — the same
 * thing it already meant for a text box and a sticky note. The passage a
 * highlight was drawn over is a *different* string and lives in the payload,
 * which is why writing here never destroys the quote
 * (`annotation-sync/annotation-row.ts` has the history of that distinction).
 *
 * **No save button, and no separate way to remove the text**, consistent with
 * every other field on this site: it persists a beat after the reader stops
 * typing, and emptying it is how a note is deleted. That is `useSyncedText`'s
 * job — the same hook the sidebar's notes tab uses, generalized rather than
 * copied — and with it come the two properties this surface needs most: a
 * synced value never lands on a field being typed in, and a paragraph is a
 * handful of writes rather than one per keystroke. The second is this task's
 * likeliest defect and the reason nothing here is bound straight to a mutator.
 *
 * **Keyed by the mark** by its caller, so selecting a different one is a
 * different field by construction, and the unmount flush that entails writes the
 * previous mark's text through the previous mark's own `onSave`.
 */

const NOTE_PLACEHOLDER = 'what you want to remember about this…'

interface AnnotationNoteEditorProps {
  /** The stored comment, from sync. */
  contents: string | null
  onSave: (contents: string) => void
}

export function AnnotationNoteEditor({
  contents,
  onSave,
}: AnnotationNoteEditorProps) {
  const fieldId = useId()
  const { text, onTextChange } = useSyncedText({ synced: contents, onSave })

  return (
    <div className={styles.editor}>
      {/*
        A visible label, for the reason the notes panel gives: the button that
        opened this is a control, not a name for the field inside it, and a
        textarea named by nothing is announced as nothing.
      */}
      <label className={styles.label} htmlFor={fieldId}>
        note
      </label>
      <textarea
        id={fieldId}
        className={styles.field}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={NOTE_PLACEHOLDER}
        // Prose, so the browser's spellchecker is wanted — the same call the
        // notes field makes, and the opposite of the tag field's.
        spellCheck={true}
        /*
         * Opened on purpose, so the cursor starts here rather than making the
         * reader click a second time. Safe to take focus without warning
         * because this only mounts in response to pressing the button that
         * opens it.
         */
        // biome-ignore lint/a11y/noAutofocus: the editor exists only because the reader just asked for it, which is the case this rule exempts.
        autoFocus={true}
      />
    </div>
  )
}
