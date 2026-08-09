import { env } from '~/env'
import { ExtractionFailedError } from './failure'

/**
 * The call to GROBID, and the classification of what comes back.
 *
 * **Server-only.** GROBID is unauthenticated and reachable on the internal
 * Compose network alone.
 *
 * ## Why the status code is not enough
 *
 * GROBID's documentation maps its outcomes onto HTTP tidily — 200 success, 204
 * nothing extractable, 500 internal error, 503 thread pool exhausted — and the
 * real service does not. Every `GrobidException` it raises, including the ones
 * that mean "this file is not a usable PDF", is caught by one handler that
 * answers **500** with the exception's message as the body. Measured against
 * `grobid/grobid:0.9.1-crf`:
 *
 * - a truncated or non-PDF file → `500 [BAD_INPUT_DATA] PDF to XML conversion
 *   failed with error code: 1`
 * - a structurally valid PDF with no text → `500 [NO_BLOCKS] PDF parsing
 *   resulted in empty content`
 *
 * Both are terminal, and both look exactly like the transient 500 a restarting
 * container produces. Classifying on the status alone would therefore retry
 * every corrupt upload until its retries ran out, which is the failure mode the
 * decided design names explicitly.
 *
 * So the body is read too: GROBID prefixes those messages with a bracketed
 * member of its own `GrobidExceptionStatus` enum, and the ones that describe
 * *the document* are terminal while the ones that describe *the service* are
 * not. A 500 naming nothing recognisable stays transient, per failure.ts.
 */

/** GROBID's full-text endpoint, on its documented port. */
const FULLTEXT_PATH = '/api/processFulltextDocument'

/**
 * Long enough for a large paper on a CPU-only node — a 15-page paper takes
 * around 15 seconds on this hardware — and short enough that a wedged request
 * becomes a retry rather than holding a worker until pg-boss expires the job at
 * its own 15-minute default.
 */
const REQUEST_TIMEOUT_MS = 240_000

/**
 * GROBID exception statuses that describe the uploaded document, mapped to the
 * reason the user sees. Anything not named here is treated as transient —
 * notably `TIMEOUT` and `GENERAL`, which describe the service or say nothing.
 */
const TERMINAL_STATUSES = new Map<string, string>([
  ['BAD_INPUT_DATA', "couldn't read this PDF"],
  ['PDFALTO_CONVERSION_FAILURE', "couldn't read this PDF"],
  ['NO_BLOCKS', 'no text found in this PDF'],
  ['TOO_MANY_BLOCKS', 'this PDF is too large to extract'],
  ['TOO_MANY_TOKENS', 'this PDF is too large to extract'],
  ['PARSING_ERROR', "couldn't make sense of this PDF"],
  ['TAGGING_ERROR', "couldn't make sense of this PDF"],
])

/** What one GROBID response means. */
export type GrobidOutcome =
  /** The document parsed; `tei` is the body. */
  | { kind: 'tei'; tei: string }
  /** This PDF will never extract. `reason` is shown to the user. */
  | { kind: 'terminal'; reason: string; detail: string }
  /** The service, not the document. pg-boss retries. */
  | { kind: 'transient'; detail: string }

/**
 * Decides what a response means, from its status and body alone.
 *
 * Pure and exported so the classification can be tested directly rather than
 * through the handler: it is the one piece of this pipeline whose bugs are
 * silent, since both mistakes produce a job that merely resolves later, or
 * never, instead of an error anyone sees.
 */
export function classifyGrobidResponse(
  status: number,
  body: string,
): GrobidOutcome {
  if (status === 200) {
    return { kind: 'tei', tei: body }
  }

  if (status === 204) {
    // Documented as "no content could be extracted and structured". In
    // practice 0.9.1 answers 500 [NO_BLOCKS] for this, but the documented
    // behaviour is still handled: it is terminal either way.
    return {
      kind: 'terminal',
      reason: 'no text found in this PDF',
      detail: 'GROBID returned 204 (nothing extractable)',
    }
  }

  if (status === 400) {
    // This app built a malformed request — the wrong field name, a missing
    // part. Terminal, because retrying an identical request cannot help, but
    // deliberately not phrased as a bad PDF: the file is very likely fine.
    return {
      kind: 'terminal',
      reason: 'extraction request was rejected',
      detail: `GROBID returned 400: ${body}`,
    }
  }

  const grobidStatus = body.match(/^\s*\[([A-Z_]+)\]/)?.[1]
  const reason = grobidStatus ? TERMINAL_STATUSES.get(grobidStatus) : undefined
  if (reason) {
    return { kind: 'terminal', reason, detail: `GROBID: ${body.trim()}` }
  }

  // Everything else, including 503 (thread pool exhausted, which GROBID's own
  // documentation says to retry after 5-10 seconds) and an unrecognised 500.
  return {
    kind: 'transient',
    detail: `GROBID returned ${status}: ${body.trim()}`,
  }
}

/**
 * Sends one PDF to GROBID and returns its TEI-XML.
 *
 * Consolidation is off on both header and citations. It is on by default for
 * headers, and it makes GROBID call **Crossref** — which
 * research/technologies/pdf-metadata-extraction.md rejected for this
 * collection, because arXiv registers its DOIs with DataCite and is a known
 * dead zone there. Enrichment is Semantic Scholar's job, in task 5.
 * `includeRawCitations` is on so a reference GROBID could not segment still
 * carries the text as it was printed.
 */
export async function requestTei(pdf: Uint8Array): Promise<string> {
  const form = new FormData()
  // `new Uint8Array(pdf)` re-wraps the bytes in a view whose buffer is known to
  // be an ArrayBuffer rather than possibly a SharedArrayBuffer, which is what
  // `BlobPart` requires. The field name is GROBID's, not ours; the filename
  // only reaches its logs.
  const file = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
  form.append('input', file, 'source.pdf')
  form.append('consolidateHeader', '0')
  form.append('consolidateCitations', '0')
  form.append('includeRawCitations', '1')

  const response = await fetch(`${env.GROBID_URL}${FULLTEXT_PATH}`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const outcome = classifyGrobidResponse(response.status, await response.text())
  switch (outcome.kind) {
    case 'tei':
      return outcome.tei
    case 'terminal':
      throw new ExtractionFailedError(outcome.reason, outcome.detail)
    case 'transient':
      // Plain Error: pg-boss retries anything that is not an
      // ExtractionFailedError (see failure.ts).
      throw new Error(outcome.detail)
  }
}
