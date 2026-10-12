/**
 * Arranging the margin notes in one margin so none overlaps another, or
 * anything else (features/a-passage-gets-a-margin-note, task 2).
 *
 * **The rules, all user-decided 2026-10-12 or decided with the spec:**
 *
 * - **Only margin notes move.** Every other annotation is a fixed obstacle.
 * - **A note stays close to its passage:** never more than {@link REACH}
 *   above or below the passage it answers.
 * - **Notes keep their order down the page**, and sit {@link GAP} apart.
 * - **Notes move only when they must.** Of every arrangement that satisfies the
 *   above, the one with the least total movement wins, so an arrangement that
 *   already works is left exactly as it is.
 * - **If no arrangement satisfies all of it, the answer is no** — and the
 *   caller changes nothing.
 *
 * **One dimension, because a margin is a column.** Notes in the same margin
 * share an x-range; packing is only ever about where each one starts down the
 * page.
 *
 * **Exact, by dynamic programming over whole points.** Each note may start at
 * any whole-point offset from where it would most like to be, within its reach.
 * That is at most 97 positions a note, and a margin holds a handful of notes,
 * so trying them all is cheap — and an exact answer is easier to reason about
 * than a heuristic that is nearly right. The search keeps, for each note and
 * each position, the cheapest way to have placed every note above it.
 */

/** How far a note may sit from its passage: about four lines of body text. */
export const REACH = 48

/** Air between two notes, so they read as two. */
export const GAP = 4

/**
 * A nudge, per point, against moving a note *up*.
 *
 * Small enough never to outweigh a real point of movement, so it only breaks
 * ties — and when two arrangements move notes equally far, the one that pushes
 * notes down the page wins. A margin is read downward like the text beside it,
 * and a note lifted above its passage starts to read as belonging to the line
 * above; one pushed below still follows the passage it answers. Without this a
 * note that grew was as likely to rise off its own passage as to push its
 * neighbour down (found by the unit tier, 2026-10-12).
 */
const UPWARD_TIEBREAK = 0.001

/** A vertical span on the page, in page points: where it starts and how tall. */
export interface Span {
  top: number
  height: number
}

/** A margin note that may be moved, as packing needs to know it. */
export interface MovableNote {
  id: string
  height: number
  /** The top of the passage it answers — the centre of its reach. */
  anchor: number
  /**
   * Where it is now, or null for the note being made. Movement is measured from
   * here, so a note already in place costs nothing to leave alone; the new note
   * is measured from its anchor, which is where it would most like to be.
   */
  current: number | null
}

export interface PackingInput {
  notes: readonly MovableNote[]
  /** Everything in the column that is not a margin note. */
  obstacles: readonly Span[]
  /** The highest a note may start, and the lowest it may end. */
  bounds: { top: number; bottom: number }
}

/** Where each note starts, by id — or null when no arrangement fits. */
export type Packing = Map<string, number> | null

/** One position a note may take, and the cheapest way to have reached it. */
interface Candidate {
  top: number
  cost: number
  /** Index of the candidate chosen for the note above, or -1 for the first. */
  previous: number
}

export function packNotes({ notes, obstacles, bounds }: PackingInput): Packing {
  // Down the page in the order of their passages; two notes on one line keep
  // the order they are already in, which is the stable order.
  const ordered = [...notes].sort(
    (a, b) =>
      a.anchor - b.anchor ||
      (a.current ?? Number.POSITIVE_INFINITY) -
        (b.current ?? Number.POSITIVE_INFINITY),
  )

  let above: Candidate[] = []
  const layers: Candidate[][] = []

  for (const [index, note] of ordered.entries()) {
    const preferred = note.current ?? note.anchor
    const candidates: Candidate[] = []

    for (const top of positionsFor(note, bounds)) {
      if (
        obstacles.some((obstacle) =>
          intersects({ top, height: note.height }, obstacle),
        )
      ) {
        continue
      }
      const shift = top - preferred
      const movement =
        Math.abs(shift) + (shift < 0 ? -shift * UPWARD_TIEBREAK : 0)

      if (index === 0) {
        candidates.push({ top, cost: movement, previous: -1 })
        continue
      }

      // The cheapest arrangement of every note above that leaves this one
      // room to start here.
      const height = ordered[index - 1]?.height ?? 0
      let best = -1
      for (const [at, candidate] of above.entries()) {
        if (candidate.top + height + GAP > top) {
          continue
        }
        if (best === -1 || candidate.cost < (above[best]?.cost ?? 0)) {
          best = at
        }
      }
      if (best !== -1) {
        candidates.push({
          top,
          cost: movement + (above[best]?.cost ?? 0),
          previous: best,
        })
      }
    }

    if (candidates.length === 0) {
      return null
    }
    layers.push(candidates)
    above = candidates
  }

  // Walk back up from the cheapest arrangement of the last note.
  const result = new Map<string, number>()
  let at = cheapest(above)
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const candidate = layers[index]?.[at]
    const note = ordered[index]
    if (!candidate || !note) {
      return null
    }
    result.set(note.id, candidate.top)
    at = candidate.previous
  }
  return result
}

/**
 * Every whole-point start within the note's reach and the page.
 *
 * Offsets are whole points *from the anchor*, so a note may always sit exactly
 * level with its passage. A note already in place also keeps its own exact
 * position as a candidate, so leaving it there costs nothing even when it sits a
 * fraction off the grid.
 */
function positionsFor(
  note: MovableNote,
  bounds: { top: number; bottom: number },
): number[] {
  const positions = new Set<number>()
  for (let offset = -REACH; offset <= REACH; offset += 1) {
    positions.add(note.anchor + offset)
  }
  if (note.current !== null && Math.abs(note.current - note.anchor) <= REACH) {
    positions.add(note.current)
  }
  return [...positions]
    .filter((top) => top >= bounds.top && top + note.height <= bounds.bottom)
    .sort((a, b) => a - b)
}

function cheapest(candidates: readonly Candidate[]): number {
  let best = 0
  for (const [at, candidate] of candidates.entries()) {
    if (candidate.cost < (candidates[best]?.cost ?? Number.POSITIVE_INFINITY)) {
      best = at
    }
  }
  return best
}

/** Whether two spans share any height. Touching does not count. */
function intersects(a: Span, b: Span): boolean {
  return a.top < b.top + b.height && b.top < a.top + a.height
}
