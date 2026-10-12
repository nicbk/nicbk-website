import { describe, expect, it } from 'vitest'
import { parseTeiDocument } from './document'
import { parseSections } from './sections'

/**
 * Synthetic TEI, shaped after GROBID 0.9.1's real output for a two-column
 * PLDI paper (`features/a-paper-shows-its-contents/research.md` §3) — the
 * element and attribute layout, the noise — and never its text.
 */
function tei(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader><fileDesc><titleStmt><title>A paper</title></titleStmt></fileDesc></teiHeader>
  <text><body>${body}</body></text>
</TEI>`
}

function sections(body: string) {
  return parseSections(parseTeiDocument(tei(body)))
}

describe('parseSections', () => {
  it('reads numbered headings, nested by their numbering, placed by their box', () => {
    expect(
      sections(`
        <div><head n="1." coords="1,54.00,569.32,78.65,9.85">Introduction</head><p>…</p></div>
        <div><head n="3" coords="4,54.00,248.95,73.65,9.85">Method</head></div>
        <div><head n="3.1" coords="4,54.00,314.88,45.41,8.06">Details</head></div>
      `),
    ).toEqual([
      { title: '1 Introduction', depth: 1, pageIndex: 0, top: 569.32 },
      { title: '3 Method', depth: 1, pageIndex: 3, top: 248.95 },
      { title: '3.1 Details', depth: 2, pageIndex: 3, top: 314.88 },
    ])
  })

  // The noise measured on the real paper: diagram labels, run-in heads.
  it('leaves out headings without a section number', () => {
    expect(
      sections(`
        <div><head coords="2,405.40,212.33,20.97,4.97">Monitor</head></div>
        <div><head coords="4,328.97,312.89,75.06,8.06">Type specialization.</head></div>
        <div><head n="2" coords="2,317.01,532.68,173.70,9.85">Overview</head></div>
      `),
    ).toEqual([{ title: '2 Overview', depth: 1, pageIndex: 1, top: 532.68 }])
  })

  it('leaves out a heading GROBID could not place', () => {
    expect(sections(`<div><head n="1">Introduction</head></div>`)).toEqual([])
  })

  it('leaves out a number that is not a section number', () => {
    expect(
      sections(
        `<div><head n="A" coords="1,54,100,50,10">Appendix</head></div>`,
      ),
    ).toEqual([])
  })

  it('finds nothing in a paper with no body', () => {
    expect(
      parseSections(
        parseTeiDocument(
          `<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader/></TEI>`,
        ),
      ),
    ).toEqual([])
  })
})
