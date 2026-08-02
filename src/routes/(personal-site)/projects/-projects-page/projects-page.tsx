import type { LinkProps } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
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
  /**
   * Where the sub-application lives. Typed as a router path rather than a
   * string, so an entry pointing at a route that doesn't exist fails the
   * typecheck instead of shipping a dead link.
   */
  to: LinkProps['to']
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
    to: '/lit-tracker',
  },
]

/**
 * Projects page content — the simple list of sub-applications specified in
 * research/ui-ux/pages/site-wide/pages/projects.md: a name plus a one-line
 * description per entry, the description set apart by its dimmer color.
 * Deliberately no cards, tech-stack badges, or status tags. Entirely static.
 *
 * Each entry is a single link to its sub-application — the name is the link,
 * the description stays plain text beside it. This page shipped with the names
 * unlinked because the Literature Tracker had no route and no decided URL yet;
 * `article-upload-and-extraction` built both, which is the point
 * features/projects-page/research.md deferred this to.
 *
 * The tracker is behind authentication, and the link deliberately says nothing
 * about that: a signed-out visitor who follows it is taken to sign in and
 * returned here afterwards by the route guard, which is a better answer than a
 * badge warning them off in advance.
 */
export function ProjectsPage() {
  return (
    <div className={styles.page}>
      {/* The page's single visible <h1> and the route-change focus-handoff
          target (src/focus-handoff.ts). */}
      <h1 className={styles.title}>projects</h1>

      <ul className={styles.list} aria-label="Projects">
        {PROJECTS.map(({ name, description, to }) => (
          <li key={name} className={styles.entry}>
            {/* The link keeps the page's primary text color and weight rather
                than the global link color: on a page that is a list of names,
                colouring them all would make the accent meaningless. Its
                position in the row comes from the grid column it lands in (see
                the stylesheet). */}
            <Link to={to} className={styles.projectLink}>
              {name}
            </Link>
            <span className={styles.description}>{description}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
