import type { ContentsEntry } from '~/lit-tracker/contents/contents'

/**
 * The contents as a tree, so an entry's sections can fold under it
 * (features/the-contents-fold).
 *
 * The stored list stays flat with a depth per entry (`contents.ts` says why);
 * the nesting is read off it here, when it is shown. Everything about folding
 * that can be decided without a DOM is decided in this file, so each rule is a
 * unit test: which entries nest under which, what the first visit opens, and
 * which row stands for the section in view when that section is folded away.
 *
 * Entries are named by their **index in the stored list** throughout: the
 * list is only ever replaced whole, never edited, so an index means the same
 * entry for as long as the list exists — which is what lets the open set be a
 * list of indices.
 */

export interface ContentsNode {
  /** The entry's index in the stored list. */
  index: number
  entry: ContentsEntry
  /** 0 for a top-level entry, 1 for one nested under it, and so on. */
  level: number
  children: ContentsNode[]
}

export interface ContentsTree {
  roots: ContentsNode[]
  /** Each entry's parent index, by entry index; `-1` for a top-level entry. */
  parentOf: number[]
}

/**
 * Nests the flat list. An entry's sections are the entries after it with a
 * greater depth, up to the next entry at its depth or shallower.
 *
 * Nesting is by **comparison of depths, not by depth exactly one more**, so a
 * skipped level (a chapter whose first heading is depth 3) nests under the
 * nearest shallower entry rather than being dropped or floated to the top; and
 * a list that starts deeper than 1 still has top-level entries.
 */
export function contentsTree(entries: readonly ContentsEntry[]): ContentsTree {
  const roots: ContentsNode[] = []
  const parentOf: number[] = []
  // The chain of entries the next one could nest under, shallowest first.
  const open: ContentsNode[] = []

  entries.forEach((entry, index) => {
    let parent = open.at(-1)
    while (parent && parent.entry.depth >= entry.depth) {
      open.pop()
      parent = open.at(-1)
    }
    const node: ContentsNode = {
      index,
      entry,
      level: open.length,
      children: [],
    }
    parentOf.push(parent?.index ?? -1)
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
    open.push(node)
  })

  return { roots, parentOf }
}

/**
 * What is open on a paper never folded: nothing — the user asked for the
 * contents "fully collapsed when accessed for the first time" — **except a lone
 * root**. Some PDFs nest the whole outline under one entry, the book's or
 * paper's own title, and folded that is one row: not an outline at all. That
 * root is opened, so the first view is its chapters (decided with the user,
 * 2026-10-14).
 */
export function firstVisitOpen(tree: ContentsTree): number[] {
  const [only, ...others] = tree.roots
  if (only && others.length === 0 && only.children.length > 0) {
    return [only.index]
  }
  return []
}

/**
 * The row that stands for the section in view: the section itself when it is
 * showing, otherwise **the outermost closed entry above it** — the folded
 * chapter it is inside, which is the row the reader can see. Nothing is opened
 * to show the section: the folds are the reader's to set (decided with the
 * user, 2026-10-14).
 *
 * `-1` stays `-1`: before the first section, nothing is marked.
 */
export function markedRow(
  inView: number,
  parentOf: readonly number[],
  open: ReadonlySet<number>,
): number {
  if (inView < 0) {
    return -1
  }
  // The section's ancestors, outermost first.
  const ancestors: number[] = []
  for (let at = parentOf[inView] ?? -1; at !== -1; at = parentOf[at] ?? -1) {
    ancestors.unshift(at)
  }
  return ancestors.find((ancestor) => !open.has(ancestor)) ?? inView
}
