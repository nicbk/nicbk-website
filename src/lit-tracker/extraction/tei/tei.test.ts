import { describe, expect, it } from 'vitest'
import journalArticle from './fixtures/journal-article.xml?raw'
import noAuthors from './fixtures/no-authors.xml?raw'
import noTitle from './fixtures/no-title.xml?raw'
import preprint from './fixtures/preprint.xml?raw'
import truncated from './fixtures/truncated.xml?raw'
import { MalformedTeiError, parseTei } from './index'

/**
 * The TEI parser against hand-curated fixtures modelled on real GROBID 0.9.1
 * output (see the comment at the top of each one).
 *
 * The degenerate cases matter as much as the realistic one: what the extract
 * stage does with a document is decided entirely by which fields come back
 * null, so a parser that threw — or quietly returned an empty string — where it
 * should report an absence would take the failure path with it.
 */

describe('parsing a published journal article', () => {
  const parsed = parseTei(journalArticle)

  it('reads the header metadata', () => {
    expect(parsed.title).toBe('Bounded Staleness for Single-Node Sync Engines')
    expect(parsed.publicationYear).toBe(2024)
    expect(parsed.venue).toBe('Journal of Practical Replication')
    expect(parsed.identifiers.doi).toBe('10.1145/3612345.3612399')
  })

  it('reads authors with their structured name parts', () => {
    expect(parsed.authors).toEqual([
      { name: 'Marta Oliveira', given: 'Marta', family: 'Oliveira' },
      // The middle forename belongs to the given name, and `name` reads the
      // way a person would write it.
      { name: 'Rajesh K Anand', given: 'Rajesh K', family: 'Anand' },
      { name: 'Ingrid Halvorsen', given: 'Ingrid', family: 'Halvorsen' },
    ])
  })

  it('reads the whole abstract, including text around inline markup', () => {
    // Both paragraphs, and the words either side of the `<ref>` marker in the
    // first one — reading only the direct text nodes would drop them.
    expect(parsed.abstract).toContain('must choose how far behind')
    expect(parsed.abstract).toContain('ordinary read-heavy load')
    expect(parsed.abstract).toContain('a bound of one replication interval')
  })

  it('reads a reference that names both the paper and where it appeared', () => {
    expect(parsed.bibliography[0]).toEqual({
      title: 'Causal consistency without coordination',
      authors: [
        { name: 'Priya Venkataraman', given: 'Priya', family: 'Venkataraman' },
        { name: 'Tomas L Nowak', given: 'Tomas L', family: 'Nowak' },
      ],
      publicationYear: 2019,
      venue: 'Proceedings of the Symposium on Replicated Data',
      identifiers: {
        doi: '10.1145/3298765.3298771',
        arxivId: null,
        pubmedId: null,
      },
      raw: expect.stringContaining('Causal consistency without coordination'),
    })
  })

  it('reads a reference that is only a preprint, with no venue', () => {
    expect(parsed.bibliography[1]).toMatchObject({
      title: 'Local-first software revisited',
      authors: [{ name: 'Ada Fenwick', given: 'Ada', family: 'Fenwick' }],
      publicationYear: 2021,
      // `<monogr>`'s title is the reference's own here, so there is nothing
      // left to report as the containing work.
      venue: null,
      identifiers: { doi: null, arxivId: '2103.09912', pubmedId: null },
    })
  })

  it('reads a reference identified only by a PubMed id', () => {
    // Biomedical reference lists print PMIDs where computer science prints
    // arXiv ids. Reading only DOIs would leave most of a PubMed-indexed
    // bibliography unresolvable.
    expect(parsed.bibliography[3]).toMatchObject({
      title: 'Replication lag and clinical data capture',
      venue: 'Journal of Clinical Informatics',
      identifiers: { doi: null, arxivId: null, pubmedId: '28288169' },
    })
  })

  it('ignores an `<idno>` GROBID could not classify', () => {
    // "CoRR, abs/1409.0473" is a real identifier printed in a real reference,
    // but nothing says which scheme it belongs to. Guessing is how a reference
    // gets resolved to the wrong paper, so an untyped `<idno>` contributes
    // nothing — even sitting beside one that was classified.
    const identifiers = parsed.bibliography[3]?.identifiers
    expect(identifiers).toEqual({
      doi: null,
      arxivId: null,
      pubmedId: '28288169',
    })
  })

  it('reports a reference with no identifiers at all as having none', () => {
    // The majority case, measured against real output: 24 of the 40 references
    // in *Attention Is All You Need* carry nothing to look them up by.
    expect(parsed.bibliography[2]?.identifiers).toEqual({
      doi: null,
      arxivId: null,
      pubmedId: null,
    })
  })

  it('keeps a reference it could not segment, as its raw text', () => {
    // Nothing structured survived, but the printed reference did — and it is
    // the only thing that could be shown to a human.
    expect(parsed.bibliography[2]).toMatchObject({
      title: null,
      authors: [
        { name: 'Working group on synchronisation, technical report, undated' },
      ],
      publicationYear: null,
      raw: 'Working group on synchronisation, technical report, undated.',
    })
  })
})

describe('parsing a preprint', () => {
  const parsed = parseTei(preprint)

  it('reports the fields a preprint legitimately lacks as absent', () => {
    expect(parsed.title).toBe('Incremental View Maintenance on the Client')
    expect(parsed.venue).toBeNull()
    expect(parsed.identifiers.doi).toBeNull()
    expect(parsed.bibliography).toEqual([])
  })

  it('strips an arXiv id down to what a lookup will accept', () => {
    // The fixture carries `arXiv:2306.11122v2[cs.DB]`, exactly as GROBID emits
    // it from the printed stamp. This is not tidying: Semantic Scholar returns
    // **null** for `ARXIV:2306.11122v2` and resolves `ARXIV:2306.11122`, so the
    // version suffix alone decides whether a preprint enriches at all — and
    // most of this collection is preprints with no DOI to fall back on.
    expect(parsed.identifiers).toEqual({
      doi: null,
      arxivId: '2306.11122',
      pubmedId: null,
    })
  })

  it('keeps authors whose names GROBID could only partly segment', () => {
    expect(parsed.authors).toEqual([
      { name: 'Wei Zhang', given: 'Wei', family: 'Zhang' },
      // A surname with no forename: `given` is left off rather than empty.
      { name: 'Okonkwo', family: 'Okonkwo' },
      // No `<persName>` at all — the raw string is still a usable display
      // name, so it is kept with neither part filled in.
      { name: 'the Sync Working Group' },
    ])
  })
})

describe('parsing a document with fields missing', () => {
  it('reports a missing author list as empty rather than throwing', () => {
    const parsed = parseTei(noAuthors)

    expect(parsed.title).toBe('Notes Toward a Theory of Filing')
    expect(parsed.authors).toEqual([])
    expect(parsed.abstract).toBeNull()
    expect(parsed.publicationYear).toBeNull()
  })

  it('reports a missing title as null rather than throwing', () => {
    const parsed = parseTei(noTitle)

    expect(parsed.title).toBeNull()
    expect(parsed.authors).toEqual([
      { name: 'Hélène Marchand', given: 'Hélène', family: 'Marchand' },
    ])
    expect(parsed.publicationYear).toBe(2020)
  })

  it('reports an absent reference section as an empty bibliography', () => {
    // No `<back>` at all in this one — distinct from preprint.xml's empty
    // `<listBibl>`, and both have to come back the same way.
    expect(parseTei(noTitle).bibliography).toEqual([])
  })
})

describe('parsing a response that is not a usable document', () => {
  it('rejects XML that is not well formed', () => {
    expect(() => parseTei(truncated)).toThrowError(MalformedTeiError)
  })

  it('rejects a well-formed document that is not TEI', () => {
    // A proxy's HTML error page is well-formed enough to parse and contains no
    // metadata at all; treating it as an empty paper would fail the upload for
    // the wrong reason.
    expect(() =>
      parseTei('<html><body><h1>502 Bad Gateway</h1></body></html>'),
    ).toThrowError(MalformedTeiError)
  })

  it('rejects an empty response', () => {
    expect(() => parseTei('')).toThrowError(MalformedTeiError)
  })
})
