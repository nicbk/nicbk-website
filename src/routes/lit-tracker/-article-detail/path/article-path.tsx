import { Menu } from '@base-ui/react/menu'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Fragment } from 'react'
import type { PathStep } from '~/lit-tracker/citation-path'
import { viaParam } from '~/lit-tracker/citation-path'
import { ArticleTitle } from '../article-title'
import { useCitationPath } from './use-citation-path'
import styles from './article-path.module.css'

/**
 * The way back, in the tracker header's title slot: the papers followed to reach
 * the one open now, ending on it (features/citation-graph-traversal, task 5).
 *
 * **It replaces the title only when there is a path.** A paper opened from the
 * collection, or from a pasted link, has none, and then this is exactly
 * `ArticleTitle` — one title, as before. The path is the record of a journey,
 * not a permanent second row of chrome.
 *
 * **How much of it shows is a question of width, and the row answers it in CSS**
 * (user-decided 2026-09-15, against measurements). The slot holds ~101
 * characters at 1512px, 63 at 1024px and 30 at 600px, while paper titles here
 * run 25–80 characters on their own — so a trail of three cannot be drawn below
 * about 1100px without cutting every title past recognition. Rather than
 * squeeze, the row drops steps as it narrows: three papers, then the previous
 * one and this one, then this one alone. `data-steps` and the steps' roles are
 * what the stylesheet queries, so nothing here measures anything.
 *
 * **What the width hides, the "⋯" menu holds** — always the whole path, every
 * step, in order. That is what makes dropping steps safe: no paper is ever only
 * reachable through a width. The menu shows whenever anything is folded away,
 * which at a given width is a question about how many papers there are, so CSS
 * decides that too.
 *
 * Each step says how it was reached — *cites* or *cited by* — read from the
 * edges themselves rather than from the URL, so a step whose edge is gone is
 * shown plainly instead of claiming a relationship that no longer exists.
 */

/** What the fold's trigger shows and announces. */
const FOLD_GLYPH = '⋯'
const FOLD_LABEL = 'the way back'

interface ArticlePathProps {
  articleId: string
  /** The papers visited before this one, oldest first (`?via=`). */
  via: readonly string[]
}

export function ArticlePath({ articleId, via }: ArticlePathProps) {
  const steps = useCitationPath(articleId, via)

  // No journey to show: one paper, named the way it always was. This is also
  // the first render after a hop, before the rows arrive.
  if (steps.length < 2) {
    return <ArticleTitle articleId={articleId} />
  }

  return (
    <nav
      className={styles.path}
      aria-label={FOLD_LABEL}
      // Capped, because the stylesheet only asks whether there are more papers
      // than a width can show, and every count past four answers the same.
      data-steps={steps.length > 3 ? 'many' : String(steps.length)}
    >
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <Fragment key={step.id}>
            <li className={styles.step} data-role={step.role}>
              {/* Where the journey starts there is nothing to separate it
                  from — but every later step keeps its own chevron even when
                  the step before it is hidden, because then it follows the
                  "⋯" that stands in for it. */}
              {index > 0 && <Hop label={step.label} />}
              <StepName step={step} />
            </li>
            {/* The fold stands where the papers it holds would be: after the
                first one, or at the head of the row when there is no first
                step to keep (a path of two). */}
            {index === 0 && (
              <li className={styles.foldItem}>
                <Fold steps={steps} />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

/**
 * The separator, carrying how this step was reached.
 *
 * The chevron is decoration and is hidden from assistive tech; the word is not,
 * because "cited by" is the difference between two papers that happen to be
 * next to each other and one that answers the other.
 */
function Hop({ label }: { label: PathStep['label'] }) {
  return (
    <span className={styles.hop}>
      <span aria-hidden="true">›</span>
      {label !== null && <span className={styles.hopLabel}>{label}</span>}
    </span>
  )
}

/**
 * A step's name: a link back for the papers behind, and the page's own name for
 * the one open.
 *
 * The link carries the path **up to that paper**, which is what makes going
 * back a shortening rather than another hop, and it drops `view` so the paper
 * opens on its reader.
 */
function StepName({ step }: { step: PathStep }) {
  if (step.role === 'current') {
    return (
      <span className={styles.name} aria-current="page" title={step.title}>
        {step.title}
      </span>
    )
  }
  return (
    <Link
      className={`${styles.name} ${styles.link}`}
      to="/lit-tracker/$articleId"
      params={{ articleId: step.id }}
      search={(previous) => ({
        ...previous,
        view: undefined,
        via: viaParam(step.via),
      })}
      title={step.title}
    >
      {step.title}
    </Link>
  )
}

/**
 * The whole path, for the steps a width has folded away.
 *
 * A menu rather than a popover, like the reader's zoom control: a flat list of
 * places to go is exactly what a menu's keyboard model is for. The open paper is
 * listed too, inert — the point of the menu is the journey, and leaving out
 * where it ends would make the last hop's label belong to nothing.
 */
function Fold({ steps }: { steps: PathStep[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger className={styles.foldTrigger} aria-label={FOLD_LABEL}>
        <span aria-hidden="true">{FOLD_GLYPH}</span>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          className={styles.positioner}
          sideOffset={4}
          align="start"
        >
          <Menu.Popup className={styles.popup}>
            {steps.map((step) =>
              step.role === 'current' ? (
                <Menu.Item key={step.id} className={styles.menuItem} disabled>
                  <MenuEntry step={step} suffix="you are here" />
                </Menu.Item>
              ) : (
                <Menu.Item
                  key={step.id}
                  className={styles.menuItem}
                  render={
                    <Link
                      to="/lit-tracker/$articleId"
                      params={{ articleId: step.id }}
                      search={(previous) => ({
                        ...previous,
                        view: undefined,
                        via: viaParam(step.via),
                      })}
                    />
                  }
                >
                  <MenuEntry step={step} />
                </Menu.Item>
              ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/**
 * One paper in the menu, under the hop that led to it. The label sits above the
 * title because that is where it belongs in the journey — between this paper and
 * the one before it.
 */
function MenuEntry({
  step,
  suffix,
}: {
  step: PathStep
  suffix?: string
}): ReactNode {
  return (
    <span className={styles.menuEntry}>
      {step.label !== null && (
        <span className={styles.menuHop}>↓ {step.label}</span>
      )}
      <span className={styles.menuTitle}>{step.title}</span>
      {suffix !== undefined && (
        <span className={styles.menuSuffix}>{suffix}</span>
      )}
    </span>
  )
}
