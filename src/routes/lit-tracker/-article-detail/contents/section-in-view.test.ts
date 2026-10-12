import { describe, expect, it } from 'vitest'
import { LINE_TOLERANCE_PT, sectionInView } from './section-in-view'

const entry = (pageIndex: number, top: number | null) => ({
  title: `${pageIndex}:${top}`,
  depth: 1,
  pageIndex,
  top,
})
const ENTRIES = [entry(0, 90), entry(0, 400), entry(2, null), entry(2, 300)]

describe('sectionInView', () => {
  it('marks nothing without a reader', () => {
    expect(sectionInView(ENTRIES, null)).toBe(-1)
  })

  it('marks nothing before the first section starts', () => {
    expect(sectionInView(ENTRIES, { pageIndex: 0, top: 50 })).toBe(-1)
  })

  it('marks the last section whose start the line has reached', () => {
    expect(sectionInView(ENTRIES, { pageIndex: 0, top: 200 })).toBe(0)
    expect(sectionInView(ENTRIES, { pageIndex: 1, top: 10 })).toBe(1)
    expect(sectionInView(ENTRIES, { pageIndex: 5, top: 0 })).toBe(3)
  })

  it('starts an entry with no point at its page’s top', () => {
    expect(sectionInView(ENTRIES, { pageIndex: 2, top: 0 })).toBe(2)
  })

  // A jump puts the heading on the line; a scroll that stops a hair short must
  // still mark the entry chosen.
  it('counts a heading just below the line as reached', () => {
    expect(
      sectionInView(ENTRIES, { pageIndex: 0, top: 400 - LINE_TOLERANCE_PT }),
    ).toBe(1)
    expect(
      sectionInView(ENTRIES, {
        pageIndex: 0,
        top: 400 - LINE_TOLERANCE_PT - 1,
      }),
    ).toBe(0)
  })
})
