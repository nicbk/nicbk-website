import { describe, expect, it } from 'vitest'
import type { BibliographyRow } from './merged-rows'
import { mergedRowIds } from './merged-rows'

/**
 * Recognising two references GROBID read as one. The titles in the first test
 * are the two merges found in the local collection, with the resolved rows
 * Semantic Scholar supplied beside them.
 */

let next = 0
function row(
  title: string,
  resolved: { semanticScholarId?: string; citedArticleId?: string } = {},
): BibliographyRow {
  next += 1
  return {
    id: `row-${next}`,
    title,
    semanticScholarId: resolved.semanticScholarId ?? null,
    citedArticleId: resolved.citedArticleId ?? null,
  }
}

describe('mergedRowIds', () => {
  it('finds the merges measured on real papers', () => {
    const glorot = row(
      'Understanding the difficulty of training deep feedforward neural networks. The handbook of brain theory and neural networks',
    )
    const lecun = row(
      'Convolutional networks for images, speech, and time series. The handbook of brain theory and neural networks',
    )
    const rows = [
      glorot,
      lecun,
      row(
        'Understanding the difficulty of training deep feedforward neural networks',
        { semanticScholarId: 's2-glorot' },
      ),
      row('Convolutional networks for images, speech, and time series', {
        semanticScholarId: 's2-lecun',
      }),
      row('The handbook of brain theory and neural networks /', {
        semanticScholarId: 's2-handbook',
      }),
      row('Layer Normalization', { semanticScholarId: 's2-layernorm' }),
      row('Neural machine translation of rare words with subword units'),
    ]

    expect(mergedRowIds(rows)).toEqual([glorot.id, lecun.id])
  })

  it('does not take a short resolved title as evidence', () => {
    // "Adam" is inside real titles that have nothing to do with the optimizer.
    const rows = [
      row('Adam: A method for stochastic optimization', {
        semanticScholarId: 's2-adam',
      }),
      row('Adam', { semanticScholarId: 's2-short' }),
      row('Adam Smith and the theory of moral sentiments revisited'),
    ]

    expect(mergedRowIds(rows)).toEqual([])
  })

  it('never drops a resolved row, or one linked to an article', () => {
    const rows = [
      row('Deep residual learning for image recognition', {
        semanticScholarId: 's2-resnet',
      }),
      row('Deep residual learning for image recognition. Proceedings of CVPR', {
        semanticScholarId: 's2-resnet-proceedings',
      }),
      row('Deep residual learning for image recognition. CVPR 2016', {
        citedArticleId: 'article-resnet',
      }),
    ]

    expect(mergedRowIds(rows)).toEqual([])
  })

  it('takes nothing from another unresolved row', () => {
    // Two unresolved rows prove nothing about each other.
    const rows = [
      row('Sequence to sequence learning with neural networks'),
      row(
        'Sequence to sequence learning with neural networks. Advances in NIPS',
      ),
    ]

    expect(mergedRowIds(rows)).toEqual([])
  })

  it('does not treat a row as containing its own resolved twin', () => {
    // The same title twice — a preprint and its published version — is not a
    // merge: containment has to add something.
    const rows = [
      row('Attention is all you need', { semanticScholarId: 's2-attention' }),
      row('Attention Is All You Need'),
    ]

    expect(mergedRowIds(rows)).toEqual([])
  })
})
