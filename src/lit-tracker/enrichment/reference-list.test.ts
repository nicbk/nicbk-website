import { describe, expect, it } from 'vitest'
import { alignReferences, normalizeForAlignment } from './reference-list'

/**
 * Aligning GROBID's parsed bibliography with Semantic Scholar's own reference
 * list for the same paper.
 *
 * This is what makes the citation graph usable for machine-learning papers,
 * whose bibliographies cite proceedings by name and carry no identifiers: on
 * four real papers it took coverage from 13%/38%/28%/95% to 96%/97%/93%/100%.
 * So the cases below are mostly the *specific* ways GROBID mangles a printed
 * title, each one observed in real output.
 *
 * The tolerance here is only sound because the candidate set is closed — the
 * papers this exact paper cited. The strict, collection-wide rule lives in
 * `citations/matching.ts` and is tested separately; the two must not converge.
 */

const CANDIDATES = [
  {
    paperId: 'p-deep-contextualized',
    title: 'Deep Contextualized Word Representations',
  },
  {
    paperId: 'p-linear-time',
    title: 'Neural Machine Translation in Linear Time',
  },
  {
    paperId: 'p-findings',
    title: 'Findings of the 2016 Conference on Machine Translation',
  },
  { paperId: 'p-attention', title: 'Attention is All you Need' },
  {
    paperId: 'p-effective',
    title: 'Effective Approaches to Attention-based Neural Machine Translation',
  },
]

function align(...titles: string[]) {
  return alignReferences(
    titles.map((title, index) => ({ edgeId: `e${index}`, title })),
    CANDIDATES,
  )
}

describe('matching a parsed reference to the paper it names', () => {
  it('matches a title that agrees exactly', () => {
    expect(align('Attention is All you Need')).toEqual([
      { edgeId: 'e0', semanticScholarId: 'p-attention' },
    ])
  })

  it('ignores case, punctuation and spacing', () => {
    // GROBID loses the hyphen in "Attention-based" and prints "attentionbased".
    // Comparing letters and digits only is what survives that.
    expect(
      align(
        'effective approaches to attentionbased neural machine translation',
      ),
    ).toEqual([{ edgeId: 'e0', semanticScholarId: 'p-effective' }])
  })

  it.each([
    [
      'a year prefix GROBID kept',
      '2018a. Deep contextualized word representations',
      'p-deep-contextualized',
    ],
    [
      'a trailing archive name',
      'Neural Machine Translation in Linear Time. arXiv',
      'p-linear-time',
    ],
    [
      'an author fragment in front',
      'Marcos. Findings of the 2016 conference on machine translation',
      'p-findings',
    ],
    ['a trailing venue', 'Attention is All you Need. In NIPS', 'p-attention'],
  ])('recovers a title with %s', (_case, printed, expected) => {
    // Every one of these came out of real GROBID output. They are the reason
    // containment is allowed at all.
    expect(align(printed)).toEqual([
      { edgeId: 'e0', semanticScholarId: expected },
    ])
  })

  it('matches a title GROBID truncated', () => {
    expect(align('Effective Approaches to Attention-based Neural')).toEqual([
      { edgeId: 'e0', semanticScholarId: 'p-effective' },
    ])
  })
})

describe('what it refuses to match', () => {
  it('leaves a reference the paper never cited alone', () => {
    expect(align('A Paper That Is Not In This Bibliography At All')).toEqual([])
  })

  it('refuses a containment short enough to be a coincidence', () => {
    // "attention" is inside two of the candidates and inside half the papers
    // ever written. A short overlap is not evidence.
    expect(align('Attention')).toEqual([])
  })

  it('refuses when two of the paper own references would both fit', () => {
    // A bibliography can list a preprint and its published version. With no way
    // to tell which was meant, attaching either would invent a citation.
    expect(
      alignReferences(
        [{ edgeId: 'e0', title: 'Neural Machine Translation' }],
        [
          {
            paperId: 'p-a',
            title: 'Neural Machine Translation in Linear Time',
          },
          {
            paperId: 'p-b',
            title: 'Neural Machine Translation by Jointly Learning',
          },
        ],
      ),
    ).toEqual([])
  })

  it('refuses an exact title the reference list holds twice', () => {
    expect(
      alignReferences(
        [{ edgeId: 'e0', title: 'Same Title' }],
        [
          { paperId: 'p-a', title: 'Same Title' },
          { paperId: 'p-b', title: 'Same Title' },
        ],
      ),
    ).toEqual([])
  })

  it('ignores candidates the API could not title', () => {
    expect(
      alignReferences(
        [{ edgeId: 'e0', title: 'Anything' }],
        [{ paperId: 'p-a', title: null }],
      ),
    ).toEqual([])
  })

  it('ignores an edge with an empty title', () => {
    expect(align('   ')).toEqual([])
  })
})

describe('several references at once', () => {
  it('resolves each independently, and skips the ones it cannot', () => {
    const aligned = align(
      '2018a. Deep contextualized word representations',
      'Something Nobody Cited',
      'Attention is all you need',
    )

    expect(aligned).toEqual([
      { edgeId: 'e0', semanticScholarId: 'p-deep-contextualized' },
      { edgeId: 'e2', semanticScholarId: 'p-attention' },
    ])
  })
})

describe('normalization', () => {
  it('reduces a title to its letters and digits', () => {
    expect(normalizeForAlignment('Attention-based, 2017!')).toBe(
      'attentionbased2017',
    )
  })

  it('has nothing to compare for a title of pure punctuation', () => {
    expect(normalizeForAlignment('—')).toBeNull()
  })
})
