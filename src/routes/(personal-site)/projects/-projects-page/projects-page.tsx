import styles from './projects-page.module.css'

interface ProjectEntry {
  /** The sub-application's name, in the page's primary text color. */
  name: string
  /**
   * One line saying what it is, rendered beside the name in the muted
   * secondary color — the same emphasis-by-color convention the blog list
   * uses for dates and descriptions.
   */
  description: string
}

/**
 * The sub-applications hosted on this site. One today; kept as data so adding
 * the next one is a new entry rather than new markup.
 */
const PROJECTS: ProjectEntry[] = [
  {
    name: 'Academic Literature Tracker',
    description:
      'upload papers, read and annotate them, and track reading progress',
  },
]

/**
 * Projects page content — the simple list of sub-applications specified in
 * research/ui-ux/pages/site-wide/pages/projects.md: a name plus a one-line
 * description per entry, the description set apart by its dimmer color.
 * Deliberately no cards, tech-stack badges, or status tags. Entirely static.
 *
 * Each entry is meant to be a single link to its sub-application. Nothing is
 * linked yet: the Literature Tracker is Phase 3 work, has no route, and has no
 * decided URL, so a link here would point at a page that does not exist. The
 * feature that builds the tracker turns these entries into links — see
 * features/projects-page/research.md. Until then the entry carries no
 * interactive affordance at all, so it never looks clickable while it isn't.
 */
export function ProjectsPage() {
  return (
    <div className={styles.page}>
      {/* The page's single visible <h1> and the route-change focus-handoff
          target (src/focus-handoff.ts). */}
      <h1 className={styles.title}>projects</h1>

      <ul className={styles.list} aria-label="Projects">
        {PROJECTS.map(({ name, description }) => (
          <li key={name} className={styles.entry}>
            {/* The name carries no class of its own: it keeps the page's
                primary text color and weight, and its position in the row
                comes from the grid column it lands in (see the stylesheet). */}
            <span>{name}</span>
            <span className={styles.description}>{description}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
