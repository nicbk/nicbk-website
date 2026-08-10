import { useId } from 'react'
import { useArticleNotes } from './use-article-notes'
import styles from './notes-panel.module.css'

interface NotesPanelProps {
  /** The stored notes, from sync. */
  notes: string | null
  onSave: (notes: string) => void
}

/** The cue in the empty field, and what the panel is for in one line. */
const NOTES_PLACEHOLDER = 'your notes on this paper…'

/**
 * The sidebar's Notes tab: one free-text field for the reader's own writing
 * about the paper.
 *
 * The decided spec keeps this **distinct from annotations** — a note is about
 * the paper as a whole, an annotation is anchored to a point inside it
 * (research/ui-ux/pages/lit-tracker/pages/article-detail.md) — which is why this
 * is a plain textarea over `articles.notes` rather than anything anchored.
 *
 * **No save button**, consistent with everything else on this site: the value
 * persists on its own a beat after the reader stops typing. When and how is
 * `use-article-notes.ts`'s problem, including the part that matters — not
 * overwriting what is being typed when a synced value arrives.
 *
 * The label is visible rather than hidden. The tab above it says "notes" too,
 * but a tab is a control and not a label for the field inside its panel, and a
 * textarea whose only name comes from a tab is a textarea a screen reader
 * announces as nothing.
 *
 * **Its caller keys it by article**, which is what makes "a different paper is a
 * different field" true by construction rather than by a reset the hook would
 * otherwise have to remember to perform.
 */
export function NotesPanel({ notes, onSave }: NotesPanelProps) {
  const fieldId = useId()
  const { notes: draft, onNotesChange } = useArticleNotes({
    synced: notes,
    onSave,
  })

  return (
    <div className={styles.panel}>
      <label className={styles.label} htmlFor={fieldId}>
        notes
      </label>
      <textarea
        id={fieldId}
        className={styles.field}
        value={draft}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder={NOTES_PLACEHOLDER}
        // Prose, unlike a tag name: the browser's spellchecker is wanted here
        // and is the reason this is not `spellCheck={false}` like the tag field.
        spellCheck={true}
      />
    </div>
  )
}
