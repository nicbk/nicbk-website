import { Moon, Sun } from 'lucide-react'
import { toggleTheme } from '~/theme'
import styles from './theme-toggle.module.css'

/**
 * Minimal accessible theme toggle. Theme state lives on <html> as
 * data-theme (never in React — see src/theme.ts), so the visible icon is
 * CSS-driven off [data-theme]: both icons are always in the markup and the
 * stylesheet shows the one for the theme you'd switch TO. This keeps the
 * server-rendered markup theme-agnostic (no hydration mismatch).
 *
 * A native <button> already provides correct semantics — no ARIA to
 * hand-roll, so no Base UI primitive is needed here.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label="Toggle theme"
      onClick={() => {
        toggleTheme()
      }}
    >
      <Sun className={styles.sun} aria-hidden="true" />
      <Moon className={styles.moon} aria-hidden="true" />
    </button>
  )
}
