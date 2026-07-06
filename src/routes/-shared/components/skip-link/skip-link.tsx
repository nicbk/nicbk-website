import styles from './skip-link.module.css'

/**
 * Site-wide skip-to-main-content link: the first focusable element on
 * every page (rendered first in <body> by __root.tsx), visually hidden
 * until keyboard focus reaches it. Targets the <main id="main-content">
 * landmark each layout provides (which carries tabIndex={-1}, so browsers
 * move focus, not just scroll, on activation).
 */
export function SkipLink() {
  return (
    <a href="#main-content" className={styles.skipLink}>
      Skip to main content
    </a>
  )
}
