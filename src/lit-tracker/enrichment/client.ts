import { env } from '~/env'
import type { PaperIdentifiers } from '~/lit-tracker/extraction/tei'
import { SemanticScholarUnavailableError } from './failure'
import type { Throttle } from './throttle'
import { createThrottle } from './throttle'

/**
 * The Semantic Scholar Graph API client.
 *
 * Two calls make up an upload's enrichment, and the split is deliberate:
 *
 * - **`lookupPapers`** resolves everything at once. The uploaded paper *and*
 *   every reference whose identifier GROBID read go into a single
 *   `POST /paper/batch` — 500 ids and 10 MB per request, far past anything one
 *   bibliography needs. Resolving forty references one at a time is the obvious
 *   implementation and the wrong one: it is forty times the requests against an
 *   API that throttles a burst of twelve.
 * - **`matchByTitle`** is the fallback for a paper carrying no identifier at
 *   all, and runs at most once per upload.
 *
 * So an upload costs one request, or two. Everything goes through the shared
 * throttle in `throttle.ts`.
 *
 * ## Failure is always transient here
 *
 * Nothing in this file throws a terminal error, because there is no such thing
 * for enrichment: a paper Semantic Scholar has never heard of is a *successful*
 * lookup that resolved nothing, and everything else — a 429 that outlasted the
 * backoff, a timeout, a 5xx, a socket error — is the API being unavailable
 * right now. The stage above turns "unavailable" into a retry and, eventually,
 * into an article that stays `grobid_only`. It never becomes a failed upload.
 */

/** One paper, as much of it as this app asks for. */
export interface SemanticScholarPaper {
  paperId: string
  title: string | null
  abstract: string | null
  year: number | null
  venue: string | null
  externalIds: Record<string, unknown> | null
  authors: { name?: string }[] | null
}

/** The fields worth asking for; every one of them fills a column. */
const FIELDS = 'paperId,title,abstract,year,venue,externalIds,authors'

/** The API's own cap on one batch request. */
const MAX_BATCH_IDS = 500

/**
 * How long one request may take.
 *
 * Generous because the throttle already handles "busy" — a request still open
 * after half a minute is a network problem, not a slow answer.
 */
const REQUEST_TIMEOUT_MS = 30_000

export interface SemanticScholarClient {
  /**
   * Resolves lookup keys to papers, in one request per 500 keys.
   *
   * Keyed by the lookup key that found each paper, so a caller can map results
   * back to the edges they came from. A key the API did not recognise is simply
   * absent — the batch endpoint returns a positional `null` for it.
   */
  lookupPapers: (keys: string[]) => Promise<Map<string, SemanticScholarPaper>>
  /** The closest title match, or `null` when the API reports none. */
  matchByTitle: (title: string) => Promise<SemanticScholarPaper | null>
}

/**
 * The lookup key Semantic Scholar resolves a paper by, in the order this app
 * trusts them.
 *
 * DOI first because it is the identifier a publisher assigns and the one least
 * likely to have been mangled in a reference list. arXiv next — the only
 * identifier most computer-science preprints carry at all. PubMed last, since
 * it appears mainly alongside a DOI that has already been chosen.
 *
 * Returns `null` for a paper with nothing to look up by, which is common: 24 of
 * the 40 references in the paper this pipeline was built against had no
 * identifier of any kind.
 */
export function lookupKeyFor(identifiers: PaperIdentifiers): string | null {
  if (identifiers.doi) {
    return `DOI:${identifiers.doi}`
  }
  if (identifiers.arxivId) {
    return `ARXIV:${identifiers.arxivId}`
  }
  if (identifiers.pubmedId) {
    return `PMID:${identifiers.pubmedId}`
  }
  return null
}

/**
 * One throttle for the process.
 *
 * The limiter only does its job if every request shares it: two clients with a
 * throttle each would be exactly the concurrency that produces 429s.
 */
const sharedThrottle = createThrottle()

export function createSemanticScholarClient(
  throttle: Throttle = sharedThrottle,
): SemanticScholarClient {
  const baseUrl = env.SEMANTIC_SCHOLAR_URL.replace(/\/+$/, '')

  async function send(
    path: string,
    init: RequestInit & { method: string },
  ): Promise<Response> {
    return throttle.run(async () => {
      try {
        return await fetch(`${baseUrl}${path}`, {
          ...init,
          headers: { ...init.headers, ...authHeaders() },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
      } catch (error) {
        // A network-level failure never reaches the throttle's status check, so
        // it is translated here into the one error type this module raises.
        throw new SemanticScholarUnavailableError(describe(error))
      }
    })
  }

  return {
    async lookupPapers(keys) {
      const found = new Map<string, SemanticScholarPaper>()
      for (const chunk of chunked(unique(keys), MAX_BATCH_IDS)) {
        const response = await send(`/paper/batch?fields=${FIELDS}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids: chunk }),
        })
        if (!response.ok) {
          throw new SemanticScholarUnavailableError(
            `batch lookup returned ${response.status}`,
          )
        }

        // Positional: one entry per requested id, `null` where the API knows no
        // such paper. That alignment is the whole mechanism for mapping results
        // back to the references they came from.
        const papers = (await readJson(response)) as unknown
        if (!Array.isArray(papers)) {
          throw new SemanticScholarUnavailableError(
            'batch lookup did not return a list',
          )
        }
        papers.forEach((paper, index) => {
          const key = chunk[index]
          if (key && isPaper(paper)) {
            found.set(key, paper)
          }
        })
      }
      return found
    },

    async matchByTitle(title) {
      const query = new URLSearchParams({ query: title, fields: FIELDS })
      const response = await send(`/paper/search/match?${query}`, {
        method: 'GET',
      })
      // The API's documented "no such paper" answer, and a perfectly ordinary
      // outcome — not every uploaded PDF is a paper Semantic Scholar indexes.
      if (response.status === 404) {
        await response.text().catch(() => '')
        return null
      }
      if (!response.ok) {
        throw new SemanticScholarUnavailableError(
          `title match returned ${response.status}`,
        )
      }

      const body = (await readJson(response)) as { data?: unknown }
      const first = Array.isArray(body.data) ? body.data[0] : undefined
      return isPaper(first) ? first : null
    },
  }
}

/**
 * The key header, when one is configured.
 *
 * Absent by default. The API answers anonymously from a shared pool, which is
 * what this site relies on — see `SEMANTIC_SCHOLAR_API_KEY` in env.ts.
 */
function authHeaders(): Record<string, string> {
  const key = env.SEMANTIC_SCHOLAR_API_KEY
  return key ? { 'x-api-key': key } : {}
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    // A truncated or non-JSON body from a 200 is the API misbehaving, which is
    // the same kind of problem as it being down.
    throw new SemanticScholarUnavailableError(
      `response body was not JSON (${describe(error)})`,
    )
  }
}

/**
 * A shape check rather than a schema parse.
 *
 * Only `paperId` is actually required — every other field is one the API omits
 * for papers it holds little about, and treating an absence as a malformed
 * response would discard a usable answer.
 */
function isPaper(value: unknown): value is SemanticScholarPaper {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { paperId?: unknown }).paperId === 'string'
  )
}

function unique(keys: string[]): string[] {
  return [...new Set(keys)]
}

function chunked<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'TimeoutError'
      ? 'the request timed out'
      : error.message
  }
  return String(error)
}
