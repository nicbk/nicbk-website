import { describe, expect, it } from 'vitest'
import { chooseContents } from './choose'

const entry = (title: string) => ({ title, depth: 1, pageIndex: 0, top: null })
const OUTLINE = [entry('1 Introduction'), entry('2 Method')]
const HEADINGS = [entry('1 Introduction')]

describe('chooseContents', () => {
  it('prefers the PDF’s own outline', () => {
    expect(chooseContents(OUTLINE, HEADINGS)).toEqual({
      source: 'outline',
      entries: OUTLINE,
    })
  })

  it('falls back to the headings when the outline is junk', () => {
    expect(chooseContents([entry('htmldoc797.html')], HEADINGS)).toEqual({
      source: 'headings',
      entries: HEADINGS,
    })
  })

  it('falls back to the headings when the PDF could not be read for one', () => {
    expect(chooseContents(null, HEADINGS).source).toBe('headings')
  })

  it('says there are none when neither source has any', () => {
    expect(chooseContents([], [])).toEqual({ source: 'none', entries: [] })
  })
})
