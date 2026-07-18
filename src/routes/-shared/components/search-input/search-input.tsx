import { Field } from '@base-ui/react/field'
import { Input } from '@base-ui/react/input'
import { Search } from 'lucide-react'
import styles from './search-input.module.css'

interface SearchInputProps {
  /** The current text. Controlled: the parent owns the value. */
  value: string
  /** Called with the new text on every keystroke (no debounce here). */
  onValueChange: (value: string) => void
  /**
   * Accessible name for the field, visually hidden (the placeholder carries the
   * visible cue). Required so every instance names what it searches, e.g.
   * "Search posts".
   */
  label: string
  /** Placeholder shown when empty. Defaults to the label. */
  placeholder?: string
  /** Extra class on the field root, e.g. for a consumer to cap its width. */
  className?: string
}

/**
 * The site's one search field — a rounded, filled pill with a leading magnifier
 * icon, matching research/ui-ux/sample-mockups/literature-tracker-sample.png.
 * Shared here (rather than reimplemented per surface) so the blog index and the
 * lit-tracker collection view present the identical control.
 *
 * Built on Base UI's `Field` + `Input` primitives, not a hand-rolled
 * `<label>` + `<input>`: `Field` associates the visually-hidden label with the
 * control for us, and staying on the decided component library keeps the app
 * from fragmenting into a mix of from-scratch and Base UI controls (see
 * research/ui-ux/design-system.md). `Input` is a native `<input>` under the
 * hood, so `type="search"` still gives it the `searchbox` role and native
 * clear affordances.
 *
 * The value is fully controlled and reported on every keystroke — this
 * component holds no state and does no debouncing. Any URL syncing/debouncing
 * is the caller's concern (the blog mirrors the query to its search params in
 * `use-blog-filters`), which keeps the field instantly reactive regardless of
 * how its state is persisted.
 */
export function SearchInput({
  value,
  onValueChange,
  label,
  placeholder,
  className,
}: SearchInputProps) {
  return (
    <Field.Root
      className={className ? `${styles.field} ${className}` : styles.field}
    >
      <Field.Label className={styles.label}>{label}</Field.Label>
      {/* The pill itself: border + fill + focus ring live on this wrapper so the
          icon and input read as one control. */}
      <span className={styles.control}>
        <Search className={styles.icon} aria-hidden="true" />
        <Input
          type="search"
          className={styles.input}
          value={value}
          placeholder={placeholder ?? label}
          autoComplete="off"
          onValueChange={(next) => onValueChange(next)}
        />
      </span>
    </Field.Root>
  )
}
