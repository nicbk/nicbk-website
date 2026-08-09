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

function candidate(paperId: string, title: string | null) {
  return { paperId, title, authors: null, year: null }
}

const CANDIDATES = [
  candidate(
    'p-deep-contextualized',
    'Deep Contextualized Word Representations',
  ),
  candidate('p-linear-time', 'Neural Machine Translation in Linear Time'),
  candidate(
    'p-findings',
    'Findings of the 2016 Conference on Machine Translation',
  ),
  candidate('p-attention', 'Attention is All you Need'),
  candidate(
    'p-effective',
    'Effective Approaches to Attention-based Neural Machine Translation',
  ),
]

/** The matched pairs, flattened to what the assertions below care about. */
function align(...titles: string[]) {
  return alignReferences(
    titles.map((title, index) => ({ edgeId: `e${index}`, title })),
    CANDIDATES,
  ).matched.map((entry) => ({
    edgeId: entry.edgeId,
    semanticScholarId: entry.paper.paperId,
  }))
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
          candidate('p-a', 'Neural Machine Translation in Linear Time'),
          candidate('p-b', 'Neural Machine Translation by Jointly Learning'),
        ],
      ).matched,
    ).toEqual([])
  })

  it('refuses an exact title the reference list holds twice', () => {
    expect(
      alignReferences(
        [{ edgeId: 'e0', title: 'Same Title' }],
        [candidate('p-a', 'Same Title'), candidate('p-b', 'Same Title')],
      ).matched,
    ).toEqual([])
  })

  it('ignores candidates the API could not title', () => {
    // Untitled either way: nothing to match on, and nothing worth inserting —
    // `addReferenceEdges` drops it for the same reason a titleless parsed entry
    // is dropped.
    expect(
      alignReferences(
        [{ edgeId: 'e0', title: 'Anything' }],
        [candidate('p-a', null)],
      ).matched,
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

describe('references the parsed bibliography never covered', () => {
  it('reports what the reference list holds and no edge claimed', () => {
    // The larger half of the coverage gap: GROBID drops a reference it cannot
    // segment — *Attention Is All You Need* cites *Layer Normalization* and no
    // title was emitted for it at all — while Semantic Scholar's list has it.
    const { unclaimed } = alignReferences(
      [{ edgeId: 'e0', title: 'Attention is All you Need' }],
      CANDIDATES,
    )

    expect(unclaimed.map((paper) => paper.paperId)).toEqual([
      'p-deep-contextualized',
      'p-linear-time',
      'p-findings',
      'p-effective',
    ])
  })

  it('does not report one an edge already claimed from a printed identifier', () => {
    // Those edges are not passed in for matching — they are already resolved —
    // so without being told, the alignment would offer them for insertion and
    // create a second edge to the same paper.
    const { unclaimed } = alignReferences([], CANDIDATES, ['p-attention'])

    expect(unclaimed.map((paper) => paper.paperId)).not.toContain('p-attention')
  })

  it('reports nothing when every reference was matched', () => {
    const { unclaimed } = alignReferences(
      CANDIDATES.map((paper, index) => ({
        edgeId: `e${index}`,
        title: paper.title as string,
      })),
      CANDIDATES,
    )

    expect(unclaimed).toEqual([])
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
