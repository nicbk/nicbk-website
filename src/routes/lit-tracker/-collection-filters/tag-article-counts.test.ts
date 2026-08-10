import { describe, expect, it } from 'vitest'
import { tagArticleCounts } from './tag-article-counts'

describe('tagArticleCounts', () => {
  it('counts the articles carrying each tag', () => {
    const counts = tagArticleCounts([
      { tagId: 't1' },
      { tagId: 't2' },
      { tagId: 't1' },
    ])

    expect(counts.get('t1')).toBe(2)
    expect(counts.get('t2')).toBe(1)
  })

  it('leaves an unused tag out, for the caller to read as zero', () => {
    const counts = tagArticleCounts([])

    expect(counts.get('t1')).toBeUndefined()
  })
})
