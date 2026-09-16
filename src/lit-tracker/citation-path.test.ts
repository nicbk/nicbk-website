import { describe, expect, it } from 'vitest'
import type { PathArticle } from './citation-path'
import {
  citationPath,
  nextVia,
  PATH_ARTICLES_MAX,
  PATH_MAX,
  walkedPath,
} from './citation-path'

/**
 * The path rules, which are the whole of the way back's behaviour: the
 * component below them only renders what these return.
 */

const A = 'aaaaaaaa-0000-4000-8000-000000000001'
const B = 'bbbbbbbb-0000-4000-8000-000000000002'
const C = 'cccccccc-0000-4000-8000-000000000003'
const D = 'dddddddd-0000-4000-8000-000000000004'

function paper(id: string, title: string, cites: string[] = []): PathArticle {
  return {
    id,
    title,
    references: cites.map((citedArticleId) => ({ citedArticleId })),
  }
}

describe('walkedPath', () => {
  it('ends at the open paper, with the journey before it', () => {
    expect(walkedPath([A, B], C)).toEqual([A, B, C])
  })

  it('is just the paper itself when nothing came before', () => {
    expect(walkedPath([], A)).toEqual([A])
  })

  it('cuts back to a paper that is opened again', () => {
    expect(walkedPath([A, B], A)).toEqual([A])
  })

  it('collapses a cycle to where it began', () => {
    // A → B → C → B: the return to B is the way back to B, not a fourth step.
    expect(walkedPath([A, B, C], B)).toEqual([A, B])
  })

  it('replays a revisit in the middle of a hand-edited path', () => {
    // A → B → A → C → D: B was left behind when A was opened again.
    expect(walkedPath([A, B, A, C], D)).toEqual([A, C, D])
  })

  it('drops the oldest steps past the cap, keeping the open paper', () => {
    const many = Array.from(
      { length: PATH_MAX + 5 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    )

    const path = walkedPath(many, A)

    expect(path).toHaveLength(PATH_ARTICLES_MAX)
    expect(path[path.length - 1]).toBe(A)
    expect(path[0]).toBe(many[many.length - PATH_MAX])
    expect(path).not.toContain(many[0])
  })
})

describe('nextVia', () => {
  it('records the paper being left, and not the one being opened', () => {
    // `via` is what comes *before* the open paper, which the route already
    // names: carrying B here too would put it on the path twice.
    expect(nextVia([], A, B)).toEqual([A])
  })

  it('extends a path that is already going', () => {
    expect(nextVia([A], B, C)).toEqual([A, B])
  })

  it('leaves nothing before a paper opened again from further along', () => {
    // On C with A › B › C behind you, opening A puts you back at the start,
    // where nothing came before.
    expect(nextVia([A, B], C, A)).toEqual([])
  })
})

describe('citationPath', () => {
  const attention = paper(A, 'Attention Is All You Need')
  const bert = paper(
    B,
    'BERT: Pre-training of Deep Bidirectional Transformers',
    [A],
  )
  const roberta = paper(C, 'RoBERTa: A Robustly Optimized BERT Pretraining', [
    B,
  ])

  it('labels a step through the edge that joins it', () => {
    // Forwards through the graph: BERT cites Attention and RoBERTa cites BERT,
    // so each paper was found in the previous one's "cited by" list.
    const steps = citationPath([A, B], C, [attention, bert, roberta])

    expect(steps.map((step) => [step.title, step.label])).toEqual([
      ['Attention Is All You Need', null],
      ['BERT: Pre-training of Deep Bidirectional Transformers', 'cited by'],
      ['RoBERTa: A Robustly Optimized BERT Pretraining', 'cited by'],
    ])
  })

  it('labels the other direction from the same edges', () => {
    // Backwards: from RoBERTa, BERT is in its bibliography, and Attention is in
    // BERT's — each step was taken out of the previous paper's "cites" list.
    const steps = citationPath([C, B], A, [attention, bert, roberta])

    expect(steps.map((step) => step.label)).toEqual([null, 'cites', 'cites'])
  })

  it('leaves a step unlabelled when no edge joins the pair any more', () => {
    const steps = citationPath([A], C, [attention, paper(C, 'Unrelated')])

    expect(steps.map((step) => step.label)).toEqual([null, null])
  })

  it('gives each step the path up to it, for its link', () => {
    const steps = citationPath([A, B], C, [attention, bert, roberta])

    expect(steps.map((step) => step.via)).toEqual([[], [A], [A, B]])
  })

  it('marks where each step sits, so the row can fold the middle', () => {
    const steps = citationPath([A, B, C], D, [
      attention,
      bert,
      roberta,
      paper(D, 'A fourth paper'),
    ])

    expect(steps.map((step) => step.role)).toEqual([
      'first',
      'middle',
      'previous',
      'current',
    ])
  })

  it('drops a paper that is not this reader’s, rather than showing a gap', () => {
    const steps = citationPath([A, D, B], C, [attention, bert, roberta])

    expect(steps.map((step) => step.id)).toEqual([A, B, C])
  })

  it('has no path for a paper opened on its own', () => {
    expect(citationPath([], A, [attention])).toEqual([])
  })

  it('has no path until the open paper has arrived', () => {
    expect(citationPath([A], B, [attention])).toEqual([])
  })
})
