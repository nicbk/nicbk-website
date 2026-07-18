import { useEffect, useRef, useState } from 'react'
import styles from './search-bar.module.css'

interface SearchBarProps {
  /** The current query from the URL — the source of truth the input syncs to. */
  value: string
  /** Called (debounced) with the new query to push into the URL. */
  onQueryChange: (query: string) => void
}

/**
 * How long typing must settle before the query is pushed to the URL. Coalesces
 * rapid keystrokes into a single navigation so the history stack and the address
 * bar aren't churned on every character.
 */
const DEBOUNCE_MS = 250

/**
 * The blog search field. Filters the list live-as-you-type over post title,
 * description, and tags (the matching itself is `filterPosts`).
 *
 * The input's text is local state, not the URL directly: it must respond
 * instantly to every keystroke, whereas the URL should only change once typing
 * settles (`DEBOUNCE_MS`), and via replace-navigation (see `useBlogFilters`) so
 * keystrokes don't flood history. The URL (`value`) stays the source of truth —
 * an external change (a shared link, the back button, a reset) is adopted back
 * into the field by the sync effect below.
 */
export function SearchBar({ value, onQueryChange }: SearchBarProps) {
  const [text, setText] = useState(value)

  // Hold the latest callback in a ref so the debounce effect can fire it without
  // listing it as a dependency (which would restart the timer on every render).
  const onQueryChangeRef = useRef(onQueryChange)
  useEffect(() => {
    onQueryChangeRef.current = onQueryChange
  })

  // Adopt external query changes (shared link, back/forward, reset) — ones that
  // did not originate from this input — so the field mirrors the URL.
  useEffect(() => {
    setText(value)
  }, [value])

  // Push the settled text to the URL. Skipped when the text already equals the
  // URL (e.g. immediately after adopting an external change), so syncing never
  // triggers a redundant navigation and the two effects can't ping-pong.
  useEffect(() => {
    if (text === value) {
      return
    }
    const timer = setTimeout(() => {
      onQueryChangeRef.current(text)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value])

  return (
    <div className={styles.searchBar}>
      <label htmlFor="blog-search" className={styles.label}>
        Search posts
      </label>
      <input
        id="blog-search"
        type="search"
        className={styles.input}
        value={text}
        placeholder="Search posts…"
        autoComplete="off"
        onChange={(event) => setText(event.target.value)}
      />
    </div>
  )
}
