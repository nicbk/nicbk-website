import { describe, expect, it } from 'vitest'
import { GAP, packNotes, REACH } from './packing'

const BOUNDS = { top: 4, bottom: 788 }

function note(id: string, anchor: number, current: number | null, height = 40) {
  return { id, anchor, current, height }
}

describe('packNotes', () => {
  it('leaves a note that fits exactly where it is', () => {
    const packing = packNotes({
      notes: [note('a', 300, 300)],
      obstacles: [],
      bounds: BOUNDS,
    })
    expect(packing?.get('a')).toBe(300)
  })

  it('puts a new note level with its passage when it can', () => {
    const packing = packNotes({
      notes: [note('new', 300, null)],
      obstacles: [],
      bounds: BOUNDS,
    })
    expect(packing?.get('new')).toBe(300)
  })

  // Of every arrangement that fits, the one that moves least.
  it('makes room with the least total movement', () => {
    const packing = packNotes({
      notes: [note('a', 300, 300), note('new', 310, null)],
      obstacles: [],
      bounds: BOUNDS,
    })
    const a = packing?.get('a') ?? 0
    const added = packing?.get('new') ?? 0
    expect(added).toBeGreaterThanOrEqual(a + 40 + GAP)
    // 34pt is the least: 310 → 344, or 300 → 266 — and a tie goes downward.
    expect(Math.abs(a - 300) + Math.abs(added - 310)).toBe(34)
    expect(a).toBe(300)
  })

  it('keeps notes in the order of their passages', () => {
    const packing = packNotes({
      notes: [note('low', 330, null), note('high', 300, 300)],
      obstacles: [],
      bounds: BOUNDS,
    })
    expect(packing?.get('high') ?? 0).toBeLessThan(packing?.get('low') ?? 0)
  })

  it('never moves a note further than its reach', () => {
    const packing = packNotes({
      notes: [note('a', 300, 300), note('b', 300, null), note('c', 300, null)],
      obstacles: [],
      bounds: BOUNDS,
    })
    for (const top of packing?.values() ?? []) {
      expect(Math.abs(top - 300)).toBeLessThanOrEqual(REACH)
    }
  })

  // Three 40pt notes and two gaps need 128pt; ±48pt of one line gives 136.
  it('refuses when no arrangement keeps every note within reach', () => {
    expect(
      packNotes({
        notes: [
          note('a', 300, 300),
          note('b', 300, null),
          note('c', 300, null),
          note('d', 300, null),
        ],
        obstacles: [],
        bounds: BOUNDS,
      }),
    ).toBeNull()
  })

  // The decided reach, pinned as a number rather than read from the constant,
  // so changing it is a decision a test notices.
  it('lets a note sit exactly 48pt from its passage', () => {
    const packing = packNotes({
      notes: [note('new', 300, null)],
      obstacles: [{ top: 292, height: 400 }],
      bounds: BOUNDS,
    })
    expect(packing?.get('new')).toBe(252)
  })

  it('does not let a note sit 49pt from its passage', () => {
    expect(
      packNotes({
        notes: [note('new', 300, null)],
        obstacles: [{ top: 291, height: 400 }],
        bounds: BOUNDS,
      }),
    ).toBeNull()
  })

  it('steps a note round something fixed in its way', () => {
    const packing = packNotes({
      notes: [note('new', 300, null)],
      obstacles: [{ top: 320, height: 10 }],
      bounds: BOUNDS,
    })
    expect(packing?.get('new')).toBe(280)
  })

  it('refuses when what is fixed covers the whole reach', () => {
    expect(
      packNotes({
        notes: [note('new', 300, null)],
        obstacles: [{ top: 240, height: 120 }],
        bounds: BOUNDS,
      }),
    ).toBeNull()
  })

  it('keeps every note on the page', () => {
    const packing = packNotes({
      notes: [note('new', 780, null)],
      obstacles: [],
      bounds: BOUNDS,
    })
    expect(packing?.get('new')).toBe(BOUNDS.bottom - 40)
  })

  it('keeps a note in place even when it sits off the whole-point grid', () => {
    const packing = packNotes({
      notes: [note('a', 300, 300.5)],
      obstacles: [],
      bounds: BOUNDS,
    })
    expect(packing?.get('a')).toBe(300.5)
  })

  it('packs nothing into nothing', () => {
    expect(packNotes({ notes: [], obstacles: [], bounds: BOUNDS })?.size).toBe(
      0,
    )
  })
})
