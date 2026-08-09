/**
 * The one error enrichment raises.
 *
 * It lives in a file of its own — rather than beside the client that throws
 * it — for the same reason `extraction/failure.ts` does: so a caller can name
 * the failure without importing the machinery that produces it. That matters
 * more here than it looks. `client.ts` reads the validated environment, and
 * importing it is enough to freeze `process.env`, which is exactly the wrong
 * thing to do from a test that has not started its containers yet.
 *
 * ## There is only one, and it is always retryable
 *
 * Enrichment has no terminal failure. A paper Semantic Scholar has never heard
 * of is a *successful* lookup that resolved nothing — no error at all — and
 * everything else is the API being unavailable right now: a 429 that outlasted
 * the backoff, a timeout, a 5xx, a socket error. The stage above turns that
 * into a retry and, eventually, into an article that stays `grobid_only`.
 *
 * That is the decided behaviour, and it is why this file has one class rather
 * than the terminal/transient pair extraction needs: an external, rate-limited
 * third party must never be able to fail a user's upload.
 */
export class SemanticScholarUnavailableError extends Error {
  constructor(detail: string) {
    super(`Semantic Scholar is unavailable: ${detail}`)
    this.name = 'SemanticScholarUnavailableError'
  }
}
