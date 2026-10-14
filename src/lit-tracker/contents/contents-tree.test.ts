import { describe, expect, it } from 'vitest'
import type { ContentsEntry } from './contents'
import type { ContentsNode } from './contents-tree'
import {
  contentsTree,
  firstVisitOpen,
  foldsAfter,
  markedRow,
} from './contents-tree'

function entries(...depths: number[]): ContentsEntry[] {
  return depths.map((depth, index) => ({
    title: `e${index}`,
    depth,
    pageIndex: index,
    top: null,
  }))
}

/** The tree as nested indices, which is easier to read than the nodes. */
function shape(nodes: readonly ContentsNode[]): unknown[] {
  return nodes.map((node) =>
    node.children.length === 0
      ? node.index
      : [node.index, shape(node.children)],
  )
}

describe('contentsTree', () => {
  it('nests consecutive levels', () => {
    const tree = contentsTree(entries(1, 2, 3, 2, 1, 2))
    expect(shape(tree.roots)).toEqual([
      [0, [[1, [2]], 3]],
      [4, [5]],
    ])
    expect(tree.parentOf).toEqual([-1, 0, 1, 0, -1, 4])
  })

  it('nests a skipped level under the nearest shallower entry', () => {
    const tree = contentsTree(entries(1, 3, 2, 3))
    expect(shape(tree.roots)).toEqual([[0, [1, [2, [3]]]]])
  })

  it('makes the first entries top-level when the list starts deeper than 1', () => {
    const tree = contentsTree(entries(2, 3, 2))
    expect(shape(tree.roots)).toEqual([[0, [1]], 2])
  })

  it('gives each node its level in the tree, not its depth', () => {
    const tree = contentsTree(entries(1, 3))
    expect(tree.roots[0]?.level).toBe(0)
    expect(tree.roots[0]?.children[0]?.level).toBe(1)
  })

  it('handles one entry and none', () => {
    expect(shape(contentsTree(entries(1)).roots)).toEqual([0])
    expect(contentsTree([])).toEqual({ roots: [], parentOf: [] })
  })
})

describe('firstVisitOpen', () => {
  it('opens nothing on an outline with several top-level entries', () => {
    expect(firstVisitOpen(contentsTree(entries(1, 2, 1, 2)))).toEqual([])
  })

  it('opens a lone root, so the first view is its chapters', () => {
    expect(firstVisitOpen(contentsTree(entries(1, 2, 3, 2)))).toEqual([0])
  })

  it('leaves a lone entry with nothing under it alone', () => {
    expect(firstVisitOpen(contentsTree(entries(1)))).toEqual([])
  })
})

describe('markedRow', () => {
  // 0 › 1 › 2, and 3 at the top level.
  const { parentOf } = contentsTree(entries(1, 2, 3, 1))

  it('marks the section itself when every entry above it is open', () => {
    expect(markedRow(2, parentOf, new Set([0, 1]))).toBe(2)
  })

  it('marks the outermost closed entry above a hidden section', () => {
    expect(markedRow(2, parentOf, new Set())).toBe(0)
    expect(markedRow(2, parentOf, new Set([0]))).toBe(1)
    // A closed chapter hides its open sections too.
    expect(markedRow(2, parentOf, new Set([1]))).toBe(0)
  })

  it('marks a top-level section whatever is open', () => {
    expect(markedRow(3, parentOf, new Set())).toBe(3)
  })

  it('marks nothing before the first section', () => {
    expect(markedRow(-1, parentOf, new Set())).toBe(-1)
  })
})

describe('foldsAfter', () => {
  // A lone root, 0, over a chapter, 1, with a section, 2.
  const lone = entries(1, 2, 3)

  it('opens and closes one entry, sorted and without duplicates', () => {
    expect(foldsAfter(lone, [1], 0, true)).toEqual([0, 1])
    expect(foldsAfter(lone, [0, 1], 1, true)).toEqual([0, 1])
    expect(foldsAfter(lone, [0, 1], 0, false)).toEqual([1])
    expect(foldsAfter(lone, [1], 0, false)).toEqual([1])
  })

  it('starts the first press from the first-visit view', () => {
    // The lone root is open on the first visit; opening the chapter keeps it so.
    expect(foldsAfter(lone, null, 1, true)).toEqual([0, 1])
    // Closing the root is the one press that empties the set.
    expect(foldsAfter(lone, null, 0, false)).toEqual([])
  })

  it('starts from what the reader set, not the first-visit view, once they have', () => {
    expect(foldsAfter(lone, [], 1, true)).toEqual([1])
  })
})
