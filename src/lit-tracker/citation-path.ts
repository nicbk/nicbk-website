/**
 * The way back: the chain of papers from where a reading session started to the
 * one open now (features/citation-graph-traversal, task 5).
 *
 * **A path, not a log** (user-decided 2026-09-14). Only the chain that leads to
 * the open paper is kept, so returning to a paper already on it *shortens* the
 * path rather than adding a fourth name to a trail nobody can read. A growing
 * trail was tried on paper first and rejected: after a few hops it says where
 * you have been, which is not the question the header is answering.
 *
 * Every rule lives here, with no React and no Zero, because all of them are
 * statements about a list of ids: what the next path is when a citation is
 * followed, what a path link carries, which papers show and which fold away.
 * The component renders what these functions return.
 *
 * It is shared rather than kept beside the component: `src/zero/queries.ts`
 * needs the cap to bound the query that resolves a path, and a second copy of
 * that number on the other side of the authorization boundary is exactly the
 * kind of thing that drifts.
 */

/**
 * How many papers may precede the open one. Twenty is far past the point the
 * fold takes over, so this is a bound on the URL rather than a display rule:
 * beyond it the oldest steps are dropped, and the path stays a path.
 */
export const PATH_MAX = 20

/** The open paper plus everything before it — what one query has to resolve. */
export const PATH_ARTICLES_MAX = PATH_MAX + 1

/** How a paper was reached from the one before it on the path. */
export type StepLabel = 'cites' | 'cited by'

/**
 * Where a step sits, which is what decides whether a given width shows it.
 *
 * Named positions rather than indices because that is what the stylesheet
 * queries: the widest row shows `first`, `previous` and `current` and folds
 * `middle` away, a middling one drops `first` too, and the narrowest keeps only
 * `current` (measured: the header has ~101 characters at 1512px, 63 at 1024px
 * and 30 at 600px, against paper titles of 25–80).
 */
export type StepRole = 'first' | 'middle' | 'previous' | 'current'

/**
 * A paper on the path, as sync gives it: its title, and the edges from it that
 * point at another paper on the same path.
 *
 * The edges are what the labels are read from, so a step says how it was
 * actually reached rather than what the URL claimed — a deleted paper or a
 * re-read bibliography leaves the step unlabelled instead of lying about it.
 */
export interface PathArticle {
  id: string
  title: string
  /**
   * Optional, because a row can arrive before the edges related to it do — and
   * an unlabelled step is exactly what a paper with no known edge should give.
   */
  references?: readonly { citedArticleId: string | null }[]
}

/** One paper in the rendered path. */
export interface PathStep {
  id: string
  title: string
  /** How it was reached from the step before; `null` for the first, and for a
   *  pair with no edge between them any more. */
  label: StepLabel | null
  role: StepRole
  /** The `via` a link to this step carries: every id before it on the path. */
  via: string[]
}

/**
 * Replays a journey and returns the papers it ends up on, current one last.
 *
 * **Revisiting cuts back.** Every id is applied in turn, and one already on the
 * path truncates it to that paper instead of extending it — so A → B → A is
 * `A`, and a cycle of any length collapses to its own beginning rather than
 * looping forever (user-raised 2026-09-15).
 *
 * Applied to whatever arrives in the URL as well as to a followed citation,
 * because a hand-edited `?via=` is a claim about a journey like any other and
 * one rule for both is one behaviour to understand. `[A, B, A, C]` with `X`
 * open replays to `A › C › X`: the visit to A cut B away, and C and X went on
 * from there.
 */
export function walkedPath(
  via: readonly string[],
  currentId: string,
): string[] {
  const path: string[] = []
  for (const id of [...via, currentId]) {
    const seen = path.indexOf(id)
    if (seen === -1) {
      path.push(id)
    } else {
      // Back on a paper already behind us: the path is the way to *here*.
      path.length = seen + 1
    }
  }
  // Past the cap the oldest steps go, never the newest: the near end is the one
  // a reader is actually using to get back.
  return path.slice(-PATH_ARTICLES_MAX)
}

/**
 * The `via` for opening `toId` from `fromId` — following a citation.
 *
 * The paper being left is what joins the path, which is why this takes it
 * explicitly: the citations view is showing `fromId`, and the step being
 * recorded is the one out of it.
 *
 * `via` holds the papers *before* the open one, so the walked path drops its own
 * last entry: the paper being opened is named by the route, and carrying it in
 * the parameter as well would put it on the path twice the moment it was read
 * back.
 */
export function nextVia(
  via: readonly string[],
  fromId: string,
  toId: string,
): string[] {
  return walkedPath([...via, fromId], toId).slice(0, -1)
}

/**
 * Turns a journey and the papers sync knows about into the steps to draw.
 *
 * **An id with no paper behind it is dropped, not drawn.** It means a paper
 * that was deleted, or one that was never this reader's — the ids are validated
 * as UUIDs and resolved through owner-scoped queries, so an id from someone
 * else's collection arrives here exactly like a deleted one. A placeholder
 * would put a stranger's row in the header as a gap in the reader's own path.
 *
 * Returns nothing at all when the open paper has not arrived (the first render
 * after a hop) or when it is alone: a path of one is just a title, and
 * `ArticleTitle` already draws that.
 */
export function citationPath(
  via: readonly string[],
  currentId: string,
  articles: readonly PathArticle[],
): PathStep[] {
  const byId = new Map(articles.map((article) => [article.id, article]))
  const ids = walkedPath(via, currentId).filter((id) => byId.has(id))

  if (ids.length < 2 || ids[ids.length - 1] !== currentId) {
    return []
  }

  return ids.map((id, index) => ({
    id,
    // Non-null by construction: `ids` is what `byId` answered to.
    title: byId.get(id)?.title ?? '',
    label: index === 0 ? null : labelBetween(ids[index - 1], id, byId),
    role: roleOf(index, ids.length),
    via: ids.slice(0, index),
  }))
}

/**
 * Which way the edge between two neighbours runs, from the edges themselves.
 *
 * Unlabelled when there is no edge either way. That is a real state, not a
 * failure: a re-read bibliography can drop the reference the hop was made
 * through, and the honest answer is then that these two papers are on the path
 * without saying why.
 */
function labelBetween(
  fromId: string | undefined,
  toId: string,
  byId: Map<string, PathArticle>,
): StepLabel | null {
  if (fromId === undefined) {
    return null
  }
  if (cites(byId.get(fromId), toId)) {
    return 'cites'
  }
  if (cites(byId.get(toId), fromId)) {
    return 'cited by'
  }
  return null
}

function cites(article: PathArticle | undefined, otherId: string): boolean {
  return (
    article?.references?.some((edge) => edge.citedArticleId === otherId) ??
    false
  )
}

function roleOf(index: number, count: number): StepRole {
  if (index === count - 1) {
    return 'current'
  }
  if (index === count - 2) {
    return 'previous'
  }
  return index === 0 ? 'first' : 'middle'
}
