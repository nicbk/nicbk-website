import { and, eq } from 'drizzle-orm'
import type { DatabaseHandle } from '~/db/create-database'
import { articles } from '~/db/schema'
import type {
  ArticlePdfNotModified,
  ArticlePdfStream,
} from '~/storage/pdf-storage'
import { openArticlePdf } from '~/storage/pdf-storage'
import { entityTagsToForward } from './if-none-match'

/**
 * Serving one article's PDF, separated from how it is mounted.
 *
 * A plain function over `Request` → `Response`, the same shape
 * `~/lit-tracker/upload/upload-endpoint.ts` and `~/zero/query-endpoint.ts` use,
 * so every branch — anonymous, not yours, not there, malformed, missing object,
 * served — can be exercised without a router.
 *
 * ## Why the bytes come through this server at all
 *
 * Garage can sign a URL that grants direct access to an object, and this route
 * deliberately never asks it to. A presigned URL is a bearer token: whoever
 * holds it can read the file until it expires, independent of any check this
 * server makes, which would put file access on a second trust model beside the
 * one every other piece of user data already uses
 * (research/security-privacy/pdf-and-annotation-data-protection.md). The
 * bandwidth saving that justifies presigning elsewhere is worth nothing at this
 * project's scale.
 *
 * ## What a refusal is allowed to say
 *
 * **An article that is not yours and an article that does not exist get the
 * same response**, and the reason is not tidiness: a route that answered 403
 * for one and 404 for the other would tell anyone who asked which article ids
 * are real. That is why ownership is part of the `WHERE` clause below rather
 * than a second check afterwards — there is no branch in which the two cases
 * are distinguishable, because there is no branch. Both do exactly one query
 * and touch storage not at all, so the two are alike in timing as well as in
 * status and body.
 *
 * An **anonymous** request is answered 401 instead, which reveals nothing: that
 * decision is made before the id is so much as looked at, so it is identical
 * for a real id and an invented one.
 *
 * ## A reopened paper is revalidated, not re-downloaded
 *
 * Every response carries the object's `ETag` and `private, no-cache`: the
 * browser keeps its copy, and asks before every use of it. When the copy is
 * current the answer is **304 with no body** — for the largest paper in the
 * collection, the difference between 13.4 MB and a few hundred bytes on every
 * visit (measured on `nicbk.com`, 2026-09-14).
 *
 * **A 304 is a successful read, so it is reachable only where a 200 is.** The
 * condition is not looked at until the session is known and the row is proven
 * the requester's; a matching tag with no session is still a 401, and with
 * someone else's article still the same 404. That is also why the check reaches
 * storage at all rather than being answered from the row: Garage, which holds
 * the object, decides whether it is unchanged.
 */

/** What every refusal says. One shape, so no case can drift from another. */
const NOT_FOUND_BODY = { error: 'Not found.' }

/**
 * The shape Postgres's `uuid` type accepts, checked before the id reaches a
 * query.
 *
 * Without this, `/articles/not-a-uuid/pdf` would make Postgres raise
 * `invalid input syntax for type uuid` (SQLSTATE 22P02) — a 500 that a real
 * article id never produces, and therefore a way to tell a *well-formed*
 * unknown id from a malformed one. The point is not the crash; it is that every
 * unservable request must look the same from outside.
 *
 * Deliberately not a version check: Postgres accepts any 8-4-4-4-12 hex string,
 * so matching what the column accepts keeps this from refusing an id the
 * database would have happily looked up and not found.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface PdfEndpointOptions {
  /** The article id from the URL. Untrusted: it is whatever was typed. */
  articleId: string
  /** Resolves the signed-in user, or `null`. Injected so tests need no cookie jar. */
  getUserId: (request: Request) => Promise<string | null>
  database: DatabaseHandle
}

/**
 * Answers one request for an article's PDF.
 *
 * The order is the security property: no session means no query, and no row
 * means no call into storage. Nothing below a refusal runs.
 */
export async function respondWithArticlePdf(
  request: Request,
  { articleId, getUserId, database }: PdfEndpointOptions,
): Promise<Response> {
  const userId = await getUserId(request)
  if (!userId) {
    // The same answer an unauthenticated upload gets. Said before the id is
    // examined, so it carries no information about it.
    return json({ error: 'Not signed in.' }, 401)
  }

  if (!UUID_PATTERN.test(articleId)) {
    return notFound()
  }

  const [article] = await database.db
    .select({ pdfObjectKey: articles.pdfObjectKey })
    .from(articles)
    // Ownership is a condition of the lookup, not a test on its result: this is
    // what makes "not yours" indistinguishable from "not there".
    .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
    .limit(1)

  if (!article) {
    return notFound()
  }

  let pdf: ArticlePdfStream | ArticlePdfNotModified
  try {
    pdf = await openArticlePdf(article.pdfObjectKey, userId, {
      ifNoneMatch: entityTagsToForward(request.headers.get('if-none-match')),
    })
  } catch (error) {
    // Reached when the row exists but the object behind it does not, or Garage
    // is unreachable. The requester owns this article — the row said so — so
    // there is nothing to conceal here; what matters is that it is a clean
    // failure rather than a 200 that stops halfway, which is only possible
    // because `openArticlePdf` awaits the fetch before handing back a stream.
    console.error(`Could not open the PDF for article ${articleId}:`, error)
    return json({ error: 'The file could not be read.' }, 500)
  }

  const headers = new Headers({
    // Nothing else: the body is a PDF, and a browser that sniffs it into
    // something scriptable would be reading a file another user uploaded.
    'x-content-type-options': 'nosniff',
    // `private`: one user's document, so no shared cache is invited to keep a
    // copy. `no-cache`: the browser may keep one, but must ask before every use
    // — which is what keeps the checks above true for every open, and not only
    // the first. Decided with the user, 2026-09-14, over `immutable`, which
    // would skip the request entirely and so let a deleted article, or a
    // signed-out session, still open a paper from disk.
    'cache-control': 'private, no-cache',
  })
  if (pdf.etag !== null) {
    headers.set('etag', pdf.etag)
  }

  if (pdf.kind === 'not-modified') {
    // No body and no length: the browser serves the copy it already has.
    return new Response(null, { status: 304, headers })
  }

  headers.set('content-type', 'application/pdf')
  // Shown rather than downloaded — this route feeds the reader, and no
  // download control is decided. Without a filename: the moment one is
  // wanted, it belongs to whatever control asks for the download.
  headers.set('content-disposition', 'inline')
  if (pdf.contentLength !== null) {
    headers.set('content-length', String(pdf.contentLength))
  }

  return new Response(pdf.body, { status: 200, headers })
}

function notFound(): Response {
  return json(NOT_FOUND_BODY, 404)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
