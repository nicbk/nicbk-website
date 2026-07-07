import { Link } from '@tanstack/react-router'
import styles from './error-page.module.css'

interface ErrorPageProps {
  /**
   * The error caught by the root errorComponent. Its `message` and `stack`
   * are treated as possibly empty/undefined — a bare `new Error()` carries
   * neither, and the page must still render validly (the feature's
   * defensive-rendering requirement).
   */
  error: Error
}

/**
 * The site-wide generic error page, rendered inside SiteShell by the root
 * route's errorComponent (__root.tsx) whenever a descendant render or loader
 * throws. Plain-text and lowercase to match the 404 page and the minimalist
 * home style; the <h1> doubles as the focus-handoff target
 * (src/focus-handoff.ts) and skip-link landing heading.
 *
 * Deliberately inert: it reads only the error's message/stack strings and
 * renders static markup — no data access, no router work beyond the typed
 * home <Link> — so rendering the fallback cannot itself throw inside the
 * error boundary.
 *
 * The underlying message (and stack, when present) is available but hidden by
 * default behind a collapsed native <details> disclosure. A native <details>
 * is chosen over a JS disclosure primitive precisely because it needs no
 * JavaScript, is keyboard-operable and conveys its expanded/collapsed state
 * to assistive tech out of the box, and cannot throw while rendering.
 */
export function ErrorPage({ error }: ErrorPageProps) {
  // Both may be absent on a bare `new Error()`; normalise to empty strings and
  // render only the parts that carry text, so an empty detail region never
  // appears (and never breaks layout).
  const message = error.message ?? ''
  const stack = error.stack ?? ''
  const hasDetail = message.length > 0 || stack.length > 0

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>something went wrong</h1>
      <p className={styles.line}>
        <Link to="/">back to home</Link>
      </p>

      {hasDetail ? (
        <details className={styles.detail}>
          <summary className={styles.summary}>technical detail</summary>
          {message.length > 0 ? (
            <p className={styles.message}>{message}</p>
          ) : null}
          {stack.length > 0 ? (
            <pre className={styles.trace}>{stack}</pre>
          ) : null}
        </details>
      ) : null}
    </div>
  )
}
