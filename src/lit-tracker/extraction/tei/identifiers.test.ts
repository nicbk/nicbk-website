import { describe, expect, it } from 'vitest'
import type { TeiElement } from './document'
import { identifiersIn } from './identifiers'

/**
 * The identifier normalizers, driven directly.
 *
 * `tei.test.ts` covers these through realistic fixtures, which is where the
 * shapes GROBID actually emits are pinned down. This file exists for the
 * variants a fixture cannot show without becoming a catalogue: the pre-2007
 * arXiv scheme, a DOI printed as a URL, and the values that must be rejected
 * rather than passed to a lookup.
 *
 * A `<biblStruct>` is built by hand here because that is all one is — the
 * parser's element type is a plain record of attributes (`@`-prefixed), text
 * (`#text`) and children.
 */

/** One `<idno>`, as `document.ts` would have parsed it. */
function idno(type: string | null, text: string): TeiElement {
  return type === null ? { '#text': text } : { '@type': type, '#text': text }
}

/** A `<biblStruct>` carrying these `<idno>` elements directly. */
function biblStruct(...idnos: TeiElement[]): TeiElement {
  return { idno: idnos }
}

describe('arXiv ids', () => {
  it.each([
    ['a bare id', '2306.11122', '2306.11122'],
    ['the printed prefix', 'arXiv:2306.11122', '2306.11122'],
    // The exact string GROBID produced for *Attention Is All You Need*.
    ['a version and a category', 'arXiv:1706.03762v7[cs.CL]', '1706.03762'],
    ['a five-digit id', 'arXiv:2412.10001', '2412.10001'],
    // Anything published before April 2007 carries the old scheme, and plenty
    // of foundational papers are still cited by it.
    ['the pre-2007 scheme', 'arXiv:hep-th/9901001', 'hep-th/9901001'],
    ['an old id with a subclass', 'arXiv:cs.CL/0701001v1', 'cs.CL/0701001'],
  ])('reads %s', (_case, printed, expected) => {
    expect(identifiersIn(biblStruct(idno('arXiv', printed))).arxivId).toBe(
      expected,
    )
  })

  it('reports an unrecognisable value as absent', () => {
    // Better no lookup than a lookup that cannot succeed: the batch endpoint
    // answers an unresolvable id with a null, which is indistinguishable from
    // "no such paper" and costs a slot in a rate-limited request.
    expect(identifiersIn(biblStruct(idno('arXiv', 'see arXiv'))).arxivId).toBe(
      null,
    )
  })
})

describe('DOIs', () => {
  it.each([
    ['a bare DOI', '10.1145/3298765.3298771'],
    ['a labelled DOI', 'doi:10.1145/3298765.3298771'],
    ['a doi.org URL', 'https://doi.org/10.1145/3298765.3298771'],
    ['a dx.doi.org URL', 'http://dx.doi.org/10.1145/3298765.3298771'],
  ])('reads %s', (_case, printed) => {
    expect(identifiersIn(biblStruct(idno('DOI', printed))).doi).toBe(
      '10.1145/3298765.3298771',
    )
  })

  it('rejects a value that is not a DOI at all', () => {
    // Every DOI begins `10.`; anything else is GROBID having mis-labelled
    // something else in the reference.
    expect(identifiersIn(biblStruct(idno('DOI', 'in press'))).doi).toBeNull()
  })
})

describe('what is not read', () => {
  it('ignores an untyped `<idno>`', () => {
    expect(
      identifiersIn(biblStruct(idno(null, 'CoRR, abs/1409.0473'))),
    ).toEqual({ doi: null, arxivId: null, pubmedId: null })
  })

  it('ignores identifier schemes nothing looks papers up by', () => {
    // GROBID puts the document's own checksum in the header as an `<idno>`.
    expect(
      identifiersIn(
        biblStruct(idno('MD5', '18E1B007A1DAB45B30CC861BA2DFDA25')),
      ),
    ).toEqual({ doi: null, arxivId: null, pubmedId: null })
  })
})

describe('several identifiers together', () => {
  it('reads each kind independently', () => {
    expect(
      identifiersIn(
        biblStruct(
          idno('DOI', '10.18653/v1/D17-1151'),
          idno('arXiv', 'arXiv:1703.03906'),
          idno('PMID', 'PMID: 28288169'),
        ),
      ),
    ).toEqual({
      doi: '10.18653/v1/D17-1151',
      arxivId: '1703.03906',
      pubmedId: '28288169',
    })
  })

  it('lets a later value fill a slot the first one could not', () => {
    // The first `<idno type="DOI">` normalizes to nothing, so the reference is
    // not left without a DOI it demonstrably printed.
    expect(
      identifiersIn(
        biblStruct(
          idno('DOI', 'forthcoming'),
          idno('DOI', '10.1145/3298765.3298771'),
        ),
      ).doi,
    ).toBe('10.1145/3298765.3298771')
  })

  it('searches `<analytic>` and `<monogr>` as well as the structure itself', () => {
    // GROBID attaches an identifier to whichever part it belongs to, which
    // depends on what kind of thing was cited.
    expect(
      identifiersIn({
        analytic: { idno: [idno('DOI', '10.1145/3298765.3298771')] },
        monogr: { idno: [idno('arXiv', 'arXiv:2103.09912')] },
      }).doi,
    ).toBe('10.1145/3298765.3298771')
  })
})
