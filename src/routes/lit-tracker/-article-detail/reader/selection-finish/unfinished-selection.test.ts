import { describe, expect, it } from 'vitest'
import { isUnfinished } from './unfinished-selection'

/**
 * The whole decision of this task, in four cases.
 *
 * Small, and worth its own file: acting on the wrong one of these is invisible
 * in a browser until it is catastrophic — finishing an ordinary drag early
 * would end every selection the moment it started.
 */

const RANGE = {
  start: { page: 0, index: 0 },
  end: { page: 1, index: 6 },
}

describe('isUnfinished', () => {
  it('is true for a selection the library still believes it is making', () => {
    // The defect: a drag released over the next page leaves the plugin's
    // `selecting` flag set forever, with a perfectly good selection under it.
    expect(isUnfinished({ selecting: true, selection: RANGE })).toBe(true)
  })

  it('is false once the library has finished it', () => {
    // The common case by far — a drag that began and ended on one page.
    expect(isUnfinished({ selecting: false, selection: RANGE })).toBe(false)
  })

  it('is false while a drag is genuinely in progress with nothing yet selected', () => {
    expect(isUnfinished({ selecting: true, selection: null })).toBe(false)
  })

  it('is false when nothing is selected at all', () => {
    expect(isUnfinished({ selecting: false, selection: null })).toBe(false)
  })
})
