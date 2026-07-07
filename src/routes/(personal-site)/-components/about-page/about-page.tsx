import { GPG_FINGERPRINT } from '~/gpg/fingerprint.generated'
import styles from './about-page.module.css'

/**
 * About page content — exactly the static layout in
 * high-level-guidance/design/about-page.png (content final per
 * research/ui-ux/pages/site-wide/pages/about.md): a heading, Résumé/CV +
 * LinkedIn links, a Communication section, and a Version Control section. No
 * dynamic data.
 *
 * The Fingerprint value is imported from the generated constant, never a
 * literal here, so a key rotation (swap public/pgp/nicbk.asc + regenerate)
 * updates the page with no edit to this component — the "derive, don't
 * hand-type" rule the gpg-key-publishing task enforces with a CI drift check.
 *
 * Mail addresses are deliberately shown as obfuscated plain text (not
 * `mailto:` links), matching the mockup.
 */
export function AboutPage() {
  return (
    <div className={styles.page}>
      {/* The page's single visible <h1> and the route-change focus-handoff
          target (src/focus-handoff.ts). */}
      <h1 className={styles.title}>about</h1>

      <p className={styles.line}>
        <a href="/nicbk_cv.pdf">Résumé/CV</a>
      </p>
      <p className={styles.line}>
        <a href="https://www.linkedin.com/in/nicbk">LinkedIn</a>
      </p>

      <hr className={styles.divider} />

      <h2 className={styles.sectionHeading}>Communication</h2>
      <dl className={styles.defList}>
        <dt className={styles.term}>Mail</dt>
        <dd className={styles.desc}>nicolas at nicbk dot com</dd>
        <dt className={styles.term}>Academic Mail</dt>
        <dd className={styles.desc}>nicbk at stanford dot edu</dd>
      </dl>
      <p className={styles.note}>
        You may sign or encrypt email messages. My currently active GnuPG key is
        listed below. The key changes periodically.
      </p>
      <dl className={styles.defList}>
        {/* The colon after "Fingerprint" (and only there) matches the
            mockup exactly. */}
        <dt className={styles.term}>Fingerprint:</dt>
        <dd className={styles.desc}>{GPG_FINGERPRINT}</dd>
        <dt className={styles.term}>Public Key</dt>
        <dd className={styles.desc}>
          <a href="/pgp/nicbk.asc">
            Nicolás Kennedy &lt;nicolas at nicbk dot com&gt;
          </a>
        </dd>
      </dl>

      <hr className={styles.divider} />

      <h2 className={styles.sectionHeading}>Version Control</h2>
      <dl className={styles.defList}>
        <dt className={styles.term}>GitHub</dt>
        <dd className={styles.desc}>
          {/* aria-label so the two identical "nicbk" links each have a
              distinct, discernible accessible name; the visible text is kept
              inside it (WCAG 2.5.3 label-in-name). */}
          <a href="https://github.com/nicbk" aria-label="GitHub profile: nicbk">
            nicbk
          </a>
        </dd>
        <dt className={styles.term}>GitLab</dt>
        <dd className={styles.desc}>
          <a href="https://gitlab.com/nicbk" aria-label="GitLab profile: nicbk">
            nicbk
          </a>
        </dd>
      </dl>
      <p className={styles.note}>I usually host projects on GitHub.</p>
    </div>
  )
}
