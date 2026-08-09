import { describe, expect, it } from 'vitest'
import type { Work } from './matching'
import { firstAuthorKey, isSameWork, normalizeTitle } from './matching'

/**
 * The graduation rule, one case at a time.
 *
 * This is the highest-value test in the citation graph, because the rule is
 * specific, the failure is silent, and the failure is *permanent*: a wrong
 * match points a citation at a paper the author never cited, and nothing in the
 * pipeline ever revisits it.
 */

function work(overrides: Partial<Work> = {}): Work {
  return {
    semanticScholarId: null,
    title: 'Bounded Staleness for Single-Node Sync Engines',
    authors: [{ name: 'Marta Oliveira', given: 'Marta', family: 'Oliveira' }],
    ...overrides,
  }
}

describe('when both sides have a Semantic Scholar id', () => {
  it('matches on equal ids', () => {
    expect(
      isSameWork(
        work({ semanticScholarId: 'abc123' }),
        work({ semanticScholarId: 'abc123' }),
      ),
    ).toBe(true)
  })

  it('does not match on different ids, however identical everything else is', () => {
    // The case the rule exists to get right. Two papers with the same title and
    // the same first author, and different canonical ids, are usually the
    // conference version and the journal version — genuinely two rows. The id
    // is the answer and the title must not be consulted.
    expect(
      isSameWork(
        work({ semanticScholarId: 'abc123' }),
        work({ semanticScholarId: 'def456' }),
      ),
    ).toBe(false)
  })
})

describe('when only one side has a Semantic Scholar id', () => {
  it('does not fall back to title and author', () => {
    // Silence on one side is not evidence. Falling back here is how a resolved
    // paper gets glued to an unrelated placeholder that happens to read alike.
    expect(isSameWork(work({ semanticScholarId: 'abc123' }), work())).toBe(
      false,
    )
    expect(isSameWork(work(), work({ semanticScholarId: 'abc123' }))).toBe(
      false,
    )
  })
})

describe('when neither side has a Semantic Scholar id', () => {
  it('matches on the same title and first author', () => {
    // Two GROBID-only records that are obviously the same paper. Without this
    // they would never graduate, however many times the user uploaded both.
    expect(isSameWork(work(), work())).toBe(true)
  })

  it('ignores case and surrounding whitespace in the title', () => {
    expect(
      isSameWork(
        work({ title: '  BOUNDED STALENESS FOR SINGLE-NODE SYNC ENGINES ' }),
        work(),
      ),
    ).toBe(true)
  })

  it('does not match genuinely different papers', () => {
    expect(
      isSameWork(work({ title: 'A Completely Different Paper' }), work()),
    ).toBe(false)
  })

  it('does not match the same title by a different author', () => {
    // The author is what keeps a generic title — "Introduction", "Related
    // Work" — from collapsing two unrelated references into one.
    expect(
      isSameWork(
        work({ authors: [{ name: 'Someone Else', family: 'Else' }] }),
        work(),
      ),
    ).toBe(false)
  })

  it('compares surnames rather than whole names', () => {
    // The same person is printed "Marta Oliveira" in one reference list and
    // "M. Oliveira" in the next; only the surname survives that.
    expect(
      isSameWork(
        work({
          authors: [{ name: 'M. Oliveira', given: 'M.', family: 'Oliveira' }],
        }),
        work(),
      ),
    ).toBe(true)
  })

  it('refuses to match when a side has no authors', () => {
    // A title alone is not enough to claim two papers are the same one, and
    // this fallback is the only place a false positive is possible at all.
    expect(isSameWork(work({ authors: [] }), work())).toBe(false)
  })

  it('refuses to match when a side has no title', () => {
    expect(isSameWork(work({ title: null }), work({ title: null }))).toBe(false)
  })
})

describe('the normalizers', () => {
  it('treats a whitespace-only title as no title', () => {
    expect(normalizeTitle('   ')).toBeNull()
  })

  it('takes the last word when there is no split-out family name', () => {
    // Not a nicety: Semantic Scholar returns authors as `{"name": "Ashish
    // Vaswani"}` and never splits them, so comparing its record against a
    // GROBID `family` of "Vaswani" would fail on every paper ever written.
    expect(firstAuthorKey([{ name: 'Ashish Vaswani' }])).toBe('vaswani')
  })

  it('reduces both spellings of the same author to the same key', () => {
    expect(firstAuthorKey([{ name: 'A. Vaswani' }])).toBe(
      firstAuthorKey([{ name: 'Ashish Vaswani', family: 'Vaswani' }]),
    )
  })

  it('has no key for an empty author list', () => {
    expect(firstAuthorKey([])).toBeNull()
  })
})
