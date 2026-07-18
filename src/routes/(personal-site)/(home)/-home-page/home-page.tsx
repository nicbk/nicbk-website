import styles from './home-page.module.css'

/**
 * Home page content — exactly the two static lines from
 * high-level-guidance/design/home-page.png. Content is final per
 * research/ui-ux/pages/site-wide/pages/home.md: no dynamic data, no layout
 * elements beyond the shared header shell.
 */
export function HomePage() {
  return (
    <div className={styles.page}>
      {/* The design shows no visible heading, but the document still needs
          a main heading — for structure and as the route-change
          focus-handoff target (src/focus-handoff.ts) — so it is visually
          hidden rather than omitted. */}
      <h1 className={styles.visuallyHidden}>home</h1>
      <p className={styles.line}>who: 22 yr old dude from SF Bay Area</p>
      <p className={styles.line}>
        doing: MLE intern @ Pinterest Labs in SF, MSCS AI @ Stanford
      </p>
    </div>
  )
}
