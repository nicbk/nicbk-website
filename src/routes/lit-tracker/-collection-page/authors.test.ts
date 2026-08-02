import { describe, expect, it } from 'vitest'
import { formatAuthors, UNKNOWN_AUTHORS } from './authors'

describe('formatAuthors', () => {
  it('lists every author when there are fewer than three', () => {
    expect(formatAuthors([{ name: 'Ada Lovelace' }])).toBe('Ada Lovelace')
    expect(
      formatAuthors([{ name: 'Ada Lovelace' }, { name: 'Alan Turing' }]),
    ).toBe('Ada Lovelace, Alan Turing')
  })

  it('collapses to the first author and "et al." at three', () => {
    expect(
      formatAuthors([
        { name: 'Ada Lovelace' },
        { name: 'Alan Turing' },
        { name: 'Grace Hopper' },
      ]),
    ).toBe('Ada Lovelace et al.')
  })

  it('says the authors are unknown rather than rendering nothing', () => {
    // Extraction is best-effort: the pipeline creates the article row even when
    // GROBID finds no authors (research/data-modeling/upload-jobs-schema.md).
    // An empty gap where a name belongs reads as a rendering bug.
    expect(formatAuthors([])).toBe(UNKNOWN_AUTHORS)
  })

  it('ignores blank names when deciding what to show', () => {
    // A whitespace-only name is what a bad parse leaves behind; counting it
    // would produce "Ada Lovelace, " or a premature "et al.".
    expect(formatAuthors([{ name: '  ' }])).toBe(UNKNOWN_AUTHORS)
    expect(
      formatAuthors([
        { name: 'Ada Lovelace' },
        { name: '' },
        { name: 'Alan Turing' },
      ]),
    ).toBe('Ada Lovelace, Alan Turing')
  })

  it('trims surrounding whitespace on the names it keeps', () => {
    expect(formatAuthors([{ name: ' Ada Lovelace ' }])).toBe('Ada Lovelace')
  })
})
