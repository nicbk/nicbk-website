import { useCallback, useSyncExternalStore } from 'react'
import type { ContentsEntry } from '~/lit-tracker/contents/contents'
import { contentsTree, firstVisitOpen } from './contents-tree'

/**
 * Which of a paper's contents entries are open (features/the-contents-fold).
 *
 * - `expanded` is the open entries' indices, or **`null` for a paper never
 *   folded**, which the panel shows as the first-visit view. The two are kept
 *   apart on purpose: `[]` is a reader who closed everything, a lone root
 *   included, and must stay closed; `null` opens that root.
 * - `fold` opens or closes one entry. On a paper never folded it starts from
 *   the first-visit view, so the first press changes the entry pressed and
 *   nothing else.
 *
 * **Held in memory for now**, by article, outside any component: the phone's
 * sheet unmounts every time it closes — which choosing an entry does — and the
 * rail and the sheet are separate mounts, so state inside either would forget
 * a reader's folds after every jump. Task 2 of the feature keeps them on the
 * account instead (`article_contents.expanded`), with this same shape.
 *
 * Written only from event handlers, so the server's copy of this module is
 * never written and no reader's folds can reach another's render.
 */
export interface ContentsFolds {
  expanded: readonly number[] | null
  fold: (index: number, open: boolean) => void
}

const folds = new Map<string, readonly number[]>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * The open set after one entry is opened or closed: sorted, without
 * duplicates, so opening an open entry changes nothing.
 */
export function foldsAfter(
  current: readonly number[],
  index: number,
  open: boolean,
): number[] {
  const next = new Set(current)
  if (open) {
    next.add(index)
  } else {
    next.delete(index)
  }
  return [...next].sort((a, b) => a - b)
}

export function useContentsFolds(
  articleId: string,
  entries: readonly ContentsEntry[],
): ContentsFolds {
  const expanded = useSyncExternalStore(
    subscribe,
    () => folds.get(articleId) ?? null,
    () => null,
  )

  const fold = useCallback(
    (index: number, open: boolean) => {
      const current =
        folds.get(articleId) ?? firstVisitOpen(contentsTree(entries))
      folds.set(articleId, foldsAfter(current, index, open))
      for (const listener of listeners) {
        listener()
      }
    },
    [articleId, entries],
  )

  return { expanded, fold }
}

/** Forgets every paper's folds. For tests, which share this module. */
export function forgetContentsFolds(): void {
  folds.clear()
}
