import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePageField } from './use-page-field'
import styles from './page-navigation.module.css'

/**
 * Which page, and how to get to another one.
 *
 * The indicator is a field rather than a label, which is the whole difference
 * between a 40-page paper you can move around in and one you scroll. The
 * previous/next buttons stay for the common case — the next page — and the field
 * covers the case they are bad at, which is any page that is not adjacent.
 *
 * It reports the page **in view**, not the last one a button was pressed for:
 * the value comes from the scroll plugin's own current page, so scrolling
 * updates it. See `use-page-field.ts` for why that does not fight typing.
 */

/** What the indicator shows when there is no document to count pages in. */
const NO_DOCUMENT = '—'

interface PageNavigationProps {
  currentPage: number
  totalPages: number
  onGoToPage: (page: number) => void
  onPrevious: () => void
  onNext: () => void
  /** True before a document exists: the controls stay, inert. */
  disabled: boolean
}

export function PageNavigation({
  currentPage,
  totalPages,
  onGoToPage,
  onPrevious,
  onNext,
  disabled,
}: PageNavigationProps) {
  const field = usePageField({ currentPage, totalPages, onCommit: onGoToPage })

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.button}
        onClick={onPrevious}
        disabled={disabled || currentPage <= 1}
        aria-label="previous page"
      >
        <ChevronLeft className={styles.icon} aria-hidden="true" />
      </button>

      <input
        type="text"
        className={styles.pageField}
        disabled={disabled}
        value={disabled ? NO_DOCUMENT : field.value}
        onChange={(event) => field.onChange(event.target.value)}
        onFocus={field.onFocus}
        onBlur={field.onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            field.onEnter()
          }
        }}
        // Not `type="number"`: its spinners are a second, tiny pair of
        // page controls next to the real ones, and its arrow keys would fight
        // the reader's. `inputMode` still gets a phone the numeric keypad.
        inputMode="numeric"
        aria-label="page number"
        // The field is as wide as the largest page number it will ever hold, so
        // the row does not resize as the reader scrolls past page 9.
        size={Math.max(String(totalPages).length, 1)}
      />

      <span className={styles.total}>
        {/* Read as "of 12" rather than "slash 12". */}
        <span aria-hidden="true">/</span>
        <span className={styles.totalLabel}>of</span>{' '}
        {disabled ? NO_DOCUMENT : totalPages}
      </span>

      <button
        type="button"
        className={styles.button}
        onClick={onNext}
        disabled={disabled || currentPage >= totalPages}
        aria-label="next page"
      >
        <ChevronRight className={styles.icon} aria-hidden="true" />
      </button>
    </div>
  )
}
