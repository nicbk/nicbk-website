import type { BibliographyEntry } from './bibliography'
import { parseBibliography } from './bibliography'
import { parseTeiDocument } from './document'
import type { HeaderMetadata } from './header'
import { parseHeader } from './header'

/**
 * GROBID's TEI-XML to the metadata this app stores.
 *
 * Pure, and the largest surface in the extraction pipeline — which is why it is
 * a folder of small files rather than one parser: `document.ts` knows XML,
 * `authors.ts`/`fields.ts` know the elements TEI shares between a paper and a
 * reference to one, and `header.ts`/`bibliography.ts` know where in a document
 * each of them lives.
 *
 * It reports what a document contained, and never decides whether that is
 * enough. An absent title is `null` here; whether a `null` title means "fall
 * back to the filename" or "fail this upload" is the extract stage's call.
 */

export type { BibliographyEntry } from './bibliography'
export { MalformedTeiError } from './document'
export type { HeaderMetadata } from './header'

/** Everything one TEI document yields. */
export interface ExtractedMetadata extends HeaderMetadata {
  bibliography: BibliographyEntry[]
}

/**
 * Parses one TEI document.
 *
 * Throws `MalformedTeiError` when the response is not well-formed XML — the
 * one failure this parser raises, since every other absence is reported as a
 * missing field rather than an error.
 */
export function parseTei(xml: string): ExtractedMetadata {
  const root = parseTeiDocument(xml)
  return {
    ...parseHeader(root),
    bibliography: parseBibliography(root),
  }
}
