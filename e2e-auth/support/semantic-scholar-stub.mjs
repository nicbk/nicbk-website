import { createServer } from 'node:http'

/**
 * Stands in for Semantic Scholar's Graph API, as a small HTTP server the app
 * server is simply pointed at.
 *
 * The same mechanism as the GROBID stub next door, for the same reasons: a
 * config swap (`SEMANTIC_SCHOLAR_URL`) rather than an interception library, and
 * a process rather than the decided mock-server *container*, because the call
 * originates on the host in this tier and a container would add an image pull
 * to every run for a few hundred bytes of JSON.
 *
 * Mocking matters more here than it does for GROBID. The real API is a shared,
 * unauthenticated pool that answers a burst of twelve requests with eight 429s;
 * pointing a test suite at it would make the suite's result depend on how busy
 * the internet is.
 *
 * ## How a test chooses the response
 *
 * From the identifier, which the uploaded file chose. The GROBID stub emits
 * whatever DOI the upload's directive asked for, that DOI arrives here as a
 * `DOI:` lookup key, and the prefix decides what happens:
 *
 *  - `10.5555/known-<slug>`  → resolves to a paper, with a venue and a year
 *  - `10.5555/unavailable`   → answers 503, so the whole request fails
 *  - anything else           → resolves to nothing, which is not an error
 *
 * Encoding it in the identifier keeps this stub stateless between requests and
 * keeps a test's intent in the test, exactly as the GROBID stub's directive
 * does — and it is what lets one run contain both an enriched upload and a
 * degraded one.
 */

/** Papers the stub knows about, by the shape of their identifier. */
const KNOWN = /^(?:DOI:)?10\.5555\/known-(?<slug>[a-z0-9-]+)$/
const UNAVAILABLE = /unavailable/

/** The venue and year an enriched article gains — neither comes from GROBID. */
export const STUB_VENUE = 'Journal of Stubbed Enrichment'
export const STUB_YEAR = 2017

export function startSemanticScholarStub(port) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')

    if (url.pathname.endsWith('/paper/batch')) {
      readBody(request, (body) => answerBatch(response, body))
      return
    }
    if (url.pathname.endsWith('/paper/search/match')) {
      answerMatch(response, url.searchParams.get('query') ?? '')
      return
    }
    response.writeHead(404).end()
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '0.0.0.0', () => {
      resolve({
        close: () =>
          new Promise((done) => {
            server.close(() => done())
          }),
      })
    })
  })
}

function readBody(request, done) {
  const chunks = []
  request.on('data', (chunk) => chunks.push(chunk))
  request.on('end', () => done(Buffer.concat(chunks).toString('utf8')))
}

/**
 * The batch endpoint: a **positional** array, one entry per requested id, with
 * `null` where no paper is known.
 *
 * The positional alignment is the real API's own contract, and reproducing it
 * is most of the value of this stub — it is what maps a resolved paper back to
 * the reference it came from, and an off-by-one there would point every
 * citation edge at the wrong paper while still looking correct.
 */
function answerBatch(response, body) {
  let ids = []
  try {
    ids = JSON.parse(body).ids ?? []
  } catch {
    response.writeHead(400).end()
    return
  }

  if (ids.some((id) => UNAVAILABLE.test(id))) {
    // What a throttled or overloaded API looks like: the client retries, the
    // job retries, and the article ends up `grobid_only`.
    response.writeHead(503, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ message: 'Service Unavailable' }))
    return
  }

  json(response, ids.map(paperFor))
}

/** The title-match endpoint, whose "no such paper" answer is a 404. */
function answerMatch(response, query) {
  if (UNAVAILABLE.test(query)) {
    response.writeHead(503, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ message: 'Service Unavailable' }))
    return
  }
  // Nothing is matched by title here. The identifier path is what this tier
  // exercises; the title fallback's own rule is unit-tested, where its
  // near-miss cases can actually be enumerated.
  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: 'Title match not found' }))
}

function paperFor(id) {
  const slug = id.match(KNOWN)?.groups?.slug
  if (!slug) {
    return null
  }
  return {
    paperId: `s2-${slug}`,
    title: slug,
    abstract: null,
    year: STUB_YEAR,
    venue: STUB_VENUE,
    externalIds: { DOI: id.replace(/^DOI:/, '') },
    authors: [],
  }
}

function json(response, body) {
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}
