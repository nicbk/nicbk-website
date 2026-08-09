// @vitest-environment node
//
// Server module: it posts JSON and reads a response, neither of which jsdom
// models the way Node does.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSemanticScholarClient, lookupKeyFor } from './client'
import { SemanticScholarUnavailableError } from './failure'
import { createThrottle } from './throttle'

/**
 * The Semantic Scholar client, with `fetch` replaced — the same way the GROBID
 * client is tested, rather than introducing a second HTTP-stubbing mechanism
 * into adjacent files.
 *
 * Two behaviours here are load-bearing and would fail silently:
 *
 * - **The batch response is positional.** Its alignment with the ids that were
 *   sent is the only thing mapping a paper back to the reference it came from.
 *   Off by one and every citation edge points at the wrong paper — and each one
 *   still looks like a perfectly good match.
 * - **Nothing throws terminally.** A paper the API has never heard of is a
 *   *successful* lookup that resolved nothing; only the API being unreachable
 *   is an error, and only ever a retryable one.
 */

/** A throttle that never waits, so these tests are about the client. */
function instantThrottle() {
  return createThrottle({ sleep: async () => {}, random: () => 0 })
}

function client() {
  return createSemanticScholarClient(instantThrottle())
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('choosing a lookup key', () => {
  it.each([
    [
      'a DOI',
      { doi: '10.1/x', arxivId: '1706.03762', pubmedId: '1' },
      'DOI:10.1/x',
    ],
    [
      'an arXiv id when there is no DOI',
      { doi: null, arxivId: '1706.03762', pubmedId: '1' },
      'ARXIV:1706.03762',
    ],
    [
      'a PubMed id last',
      { doi: null, arxivId: null, pubmedId: '28288169' },
      'PMID:28288169',
    ],
  ])('prefers %s', (_case, identifiers, expected) => {
    expect(lookupKeyFor(identifiers)).toBe(expected)
  })

  it('has no key for a reference carrying no identifier', () => {
    // The majority case in a real bibliography, and the reason this returns
    // null rather than inventing a title query per reference: that would be one
    // request each against an API that throttles a burst of twelve.
    expect(
      lookupKeyFor({ doi: null, arxivId: null, pubmedId: null }),
    ).toBeNull()
  })
})

describe('resolving a batch of papers', () => {
  it('keys the results by the id that found each one', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse([
        { paperId: 'aaa', title: 'First' },
        // The API's answer for an id it does not recognise. Positional, so this
        // null is what keeps every later entry aligned with its own key.
        null,
        { paperId: 'ccc', title: 'Third' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const found = await client().lookupPapers([
      'DOI:10.1/a',
      'DOI:10.1/unknown',
      'ARXIV:1706.03762',
    ])

    expect([...found.keys()]).toEqual(['DOI:10.1/a', 'ARXIV:1706.03762'])
    expect(found.get('ARXIV:1706.03762')?.paperId).toBe('ccc')
  })

  it('sends the whole bibliography in one request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await client().lookupPapers(
      Array.from({ length: 40 }, (_entry, index) => `DOI:10.1/${index}`),
    )

    // Forty references resolved one at a time is forty times the requests. The
    // endpoint takes 500 ids, so a personal collection's bibliography always
    // fits in one.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("splits a list past the API's own cap", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await client().lookupPapers(
      Array.from({ length: 501 }, (_entry, index) => `DOI:10.1/${index}`),
    )

    // 500 ids per request is documented, and exceeding it is an error rather
    // than a truncation.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('asks for each key once', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse([{ paperId: 'aaa' }]),
    )
    vi.stubGlobal('fetch', fetchMock)

    // A bibliography listing a paper's preprint and its published version twice
    // should not spend two slots on it.
    const found = await client().lookupPapers(['DOI:10.1/a', 'DOI:10.1/a'])

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1].body)) as {
      ids: string[]
    }
    expect(body.ids).toEqual(['DOI:10.1/a'])
    expect(found.size).toBe(1)
  })

  it('reports an unreachable API as unavailable, never as a bad document', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED')
      }),
    )

    await expect(client().lookupPapers(['DOI:10.1/a'])).rejects.toBeInstanceOf(
      SemanticScholarUnavailableError,
    )
  })

  it('reports a throttle that outlasted the backoff as unavailable', async () => {
    // The stage above turns this into a retry minutes later, and eventually
    // into an article that stays `grobid_only`. It can never fail an upload.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Too Many Requests' }, 429)),
    )

    await expect(client().lookupPapers(['DOI:10.1/a'])).rejects.toBeInstanceOf(
      SemanticScholarUnavailableError,
    )
  })
})

describe('matching a paper by title', () => {
  it('returns the single closest match', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          data: [{ paperId: 'aaa', title: 'Attention is All you Need' }],
        }),
      ),
    )

    expect(
      (await client().matchByTitle('Attention Is All You Need'))?.paperId,
    ).toBe('aaa')
  })

  it('treats the API 404 as "no such paper", not as a failure', async () => {
    // Verified against the live API: an unmatchable title returns 404 with
    // `{"error":"Title match not found"}`. Not every uploaded PDF is a paper
    // Semantic Scholar indexes, and that is an ordinary outcome.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'Title match not found' }, 404)),
    )

    await expect(
      client().matchByTitle('a paper nobody wrote'),
    ).resolves.toBeNull()
  })
})

describe('reading a paper own reference list', () => {
  it('unwraps the cited papers, dropping ones the API could not resolve', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          data: [
            { citedPaper: { paperId: 'p-a', title: 'First Reference' } },
            // The API could not resolve this one either — which is exactly the
            // gap this call exists to fill, so it contributes nothing.
            { citedPaper: null },
            { citedPaper: { paperId: 'p-b', title: 'Second Reference' } },
          ],
        }),
      ),
    )

    expect(await client().fetchReferences('paper-1')).toEqual([
      { paperId: 'p-a', title: 'First Reference' },
      { paperId: 'p-b', title: 'Second Reference' },
    ])
  })

  it('asks for the whole list in one request', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ data: [] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await client().fetchReferences('paper-1')

    // 1000 is the API's own page cap and far past any real bibliography, so
    // nothing here ever pages.
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('limit=1000')
  })

  it('treats an unknown paper as having no reference list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'Paper not found' }, 404)),
    )

    await expect(client().fetchReferences('nope')).resolves.toEqual([])
  })
})

describe('the API key', () => {
  it('is omitted when none is configured', async () => {
    // The site runs unauthenticated by default, and the variable is optional
    // precisely so a third party cannot be a prerequisite for starting.
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse([]),
    )
    vi.stubGlobal('fetch', fetchMock)

    await client().lookupPapers(['DOI:10.1/a'])

    expect(fetchMock.mock.calls[0]?.[1].headers).not.toHaveProperty('x-api-key')
  })
})
