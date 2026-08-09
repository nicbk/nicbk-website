// @vitest-environment node
//
// Server module: it builds a multipart request and reads a response, neither of
// which jsdom models the way Node does.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExtractionFailedError } from './failure'
import { classifyGrobidResponse, requestTei } from './grobid'

/**
 * Failure classification, tested directly rather than through the handler.
 *
 * This is the one piece of the pipeline whose bugs are silent: both mistakes
 * produce a job that merely resolves late, or never, instead of an error
 * anyone sees. A terminal outcome read as transient retries a corrupt PDF until
 * its retries run out; a transient one read as terminal writes a permanent
 * failure over a container that was restarting.
 *
 * The cases below are not hypothetical — the 500-with-a-status-prefix responses
 * are what `grobid/grobid:0.9.1-crf` actually returns for a truncated PDF and
 * for a PDF with no text, both of which the documented status codes suggest
 * would arrive as 204.
 */

describe('classifying a GROBID response', () => {
  it('takes 200 as the document', () => {
    expect(classifyGrobidResponse(200, '<TEI/>')).toEqual({
      kind: 'tei',
      tei: '<TEI/>',
    })
  })

  it.each([
    [
      'a file that is not a usable PDF',
      '[BAD_INPUT_DATA] PDF to XML conversion failed with error code: 1',
    ],
    [
      'a PDF with no text in it',
      '[NO_BLOCKS] PDF parsing resulted in empty content',
    ],
    ['a PDF too large for the models', '[TOO_MANY_TOKENS] too many tokens'],
    ['a document the models could not label', '[TAGGING_ERROR] tagging failed'],
  ])('treats a 500 describing %s as terminal', (_case, body) => {
    const outcome = classifyGrobidResponse(500, body)

    expect(outcome.kind).toBe('terminal')
    // Whatever the wording, it must be short enough to sit in a job row.
    expect(outcome.kind === 'terminal' && outcome.reason.length).toBeLessThan(
      60,
    )
  })

  it.each([
    ['the service is overloaded', 503, 'no engine available'],
    ['GROBID timed out internally', 500, '[TIMEOUT] processing timed out'],
    [
      'the error names nothing recognisable',
      500,
      '[GENERAL] something went wrong',
    ],
    ['the body is not a GROBID error at all', 502, '<html>Bad Gateway</html>'],
  ])('treats %s as transient', (_case, status, body) => {
    expect(classifyGrobidResponse(status, body).kind).toBe('transient')
  })

  it('treats a documented 204 as terminal', () => {
    // 0.9.1 answers 500 [NO_BLOCKS] in practice, but the documented behaviour
    // is handled too — a later version restoring it must not start retrying.
    expect(classifyGrobidResponse(204, '').kind).toBe('terminal')
  })

  it('treats a rejected request as terminal, without blaming the file', () => {
    const outcome = classifyGrobidResponse(400, 'missing parameter')

    expect(outcome.kind).toBe('terminal')
    // A 400 means this app built a bad request; the PDF is very likely fine,
    // and telling the user it was not would send them to fix the wrong thing.
    expect(outcome.kind === 'terminal' && outcome.reason).not.toMatch(/PDF/i)
  })
})

describe('requesting extraction', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** Captures the request and answers with a canned response. */
  function stubGrobid(status: number, body: string) {
    const fetchMock = vi.fn(async () => new Response(body, { status }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  const pdf = new TextEncoder().encode('%PDF-1.7\n')

  it('posts the PDF to the full-text endpoint with consolidation off', async () => {
    const fetchMock = stubGrobid(200, '<TEI/>')

    await requestTei(pdf)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { method: string; body: FormData },
    ]
    expect(url).toMatch(/\/api\/processFulltextDocument$/)
    expect(init.method).toBe('POST')
    // The field name is GROBID's own; the wrong one is a 500 that looks like a
    // service failure.
    expect(init.body.get('input')).toBeInstanceOf(Blob)
    // Consolidation would make GROBID call Crossref, which
    // research/technologies/pdf-metadata-extraction.md rejected for this
    // collection — and it is ON by default for headers.
    expect(init.body.get('consolidateHeader')).toBe('0')
    expect(init.body.get('consolidateCitations')).toBe('0')
    expect(init.body.get('includeRawCitations')).toBe('1')
  })

  it('returns the TEI on success', async () => {
    stubGrobid(200, '<TEI>ok</TEI>')

    await expect(requestTei(pdf)).resolves.toBe('<TEI>ok</TEI>')
  })

  it('raises a terminal failure for a document GROBID cannot read', async () => {
    stubGrobid(500, '[BAD_INPUT_DATA] PDF to XML conversion failed')

    await expect(requestTei(pdf)).rejects.toBeInstanceOf(ExtractionFailedError)
  })

  it('raises a plain error for a service failure, so pg-boss retries', async () => {
    stubGrobid(503, 'no engine available')

    const failure = await requestTei(pdf).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(Error)
    // Not an ExtractionFailedError: that is the signal that stops the retries.
    expect(failure).not.toBeInstanceOf(ExtractionFailedError)
  })
})
