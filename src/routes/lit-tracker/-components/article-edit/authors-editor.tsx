import { Field } from '@base-ui/react/field'
import { Input } from '@base-ui/react/input'
import { Plus, X } from 'lucide-react'
import type { Author } from '~/db/schema/lit-tracker'
import {
  withAuthorAdded,
  withAuthorName,
  withAuthorRemoved,
} from './article-draft'
import styles from './authors-editor.module.css'

interface AuthorsEditorProps {
  /** Every row currently in the form, including blank ones. */
  authors: readonly Author[]
  /** What is wrong with the list as a whole, if anything. */
  error?: string | undefined
  onChange: (authors: readonly Author[]) => void
}

/**
 * The author list, edited as a list.
 *
 * **A list rather than one comma-separated field**, decided with the user on
 * 2026-09-12. The repair a reader actually makes is *removing* an author the
 * extractor invented out of an affiliation line, or fixing one it split in the
 * wrong place — one row's problem here, and string surgery in a single field.
 * A comma-separated field would also mangle "Smith, Jr." and would have nowhere
 * to keep the `given`/`family` parts GROBID supplies, so it would discard them
 * on every save.
 *
 * **The list scrolls; the form does not grow.** A paper with a dozen authors is
 * the case this is built for, not a paper with two — the modal has to stay a
 * modal, with its save control still where the reader left it.
 *
 * Nothing here writes or validates. It renders rows and calls back with the new
 * list, which is what lets the list arithmetic be asserted as plain functions
 * (`article-draft.ts`) and this be asserted as markup.
 */
export function AuthorsEditor({
  authors,
  error,
  onChange,
}: AuthorsEditorProps) {
  return (
    // A fieldset because these inputs are one answer between them — "who wrote
    // this" — and a screen reader should hear that before it hears "author 1".
    <fieldset className={styles.group}>
      <legend className={styles.legend}>authors</legend>

      <ul className={styles.list}>
        {authors.map((author, index) => (
          <li
            // The index is the identity here, deliberately: a row *is* its
            // position in the list, names repeat, and a blank new row has
            // nothing else to be keyed by.
            // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity
            key={index}
            className={styles.row}
          >
            <Field.Root className={styles.field}>
              {/* Visually hidden: twelve visible "author" labels would be
                  twelve times the noise for a list whose shape is obvious by
                  sight, and a name is still needed by anyone who cannot see
                  it. */}
              <Field.Label className={styles.rowLabel}>
                Author {index + 1}
              </Field.Label>
              <Field.Control
                render={
                  <Input
                    className={styles.input}
                    value={author.name}
                    placeholder="name"
                    onChange={(event) =>
                      onChange(
                        withAuthorName(authors, index, event.target.value),
                      )
                    }
                  />
                }
              />
            </Field.Root>

            <button
              type="button"
              className={styles.remove}
              // Named for whom it removes, so a screen reader hears twelve
              // different controls rather than twelve called "Remove".
              aria-label={
                author.name.trim() === ''
                  ? `Remove author ${index + 1}`
                  : `Remove ${author.name.trim()}`
              }
              onClick={() => onChange(withAuthorRemoved(authors, index))}
            >
              <X className={styles.removeIcon} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={styles.add}
        onClick={() => onChange(withAuthorAdded(authors))}
      >
        <Plus className={styles.addIcon} aria-hidden="true" />
        add author
      </button>

      {error !== undefined && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
