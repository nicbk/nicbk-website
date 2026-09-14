import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { env } from '~/env'
import { isOwnedBy } from './object-key'

/**
 * Reading, writing and removing article PDFs in Garage.
 *
 * **Server-only.** Nothing here may be imported from a component: it holds the
 * bucket credentials, and the browser is never a client of the object store.
 * Every PDF read and write is proxied through this app server so file access is
 * authorized in the same place as every other piece of user data — no presigned
 * URL is ever issued, because one grants access to whoever holds it,
 * independent of this server's checks
 * (research/security-privacy/pdf-and-annotation-data-protection.md).
 *
 * The S3 client is a thin, well-supported way to speak to Garage, which
 * implements the S3 API; it is not an AWS dependency. Two settings are not
 * optional against Garage:
 *
 * - **`forcePathStyle`** — virtual-hosted addressing puts the bucket in the
 *   hostname, which would need a wildcard DNS entry resolving to the container.
 * - **`region`** — arbitrary, but it is covered by the request signature, so it
 *   must be the exact string in docker/garage.toml's `s3_region`.
 */

/** Fixed by docker/garage.toml. Signatures cover it, so the two must agree. */
const GARAGE_REGION = 'garage'

/**
 * One client for the process.
 *
 * The SDK pools connections internally, and building a client per request would
 * throw that away on a path that streams whole files.
 */
const s3 = new S3Client({
  endpoint: env.GARAGE_ENDPOINT,
  region: GARAGE_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.GARAGE_ACCESS_KEY_ID,
    secretAccessKey: env.GARAGE_SECRET_ACCESS_KEY,
  },
})

/**
 * Stores one article's PDF.
 *
 * Takes the bytes rather than a stream because the caller has already had to
 * hold them: the `%PDF-` magic-byte check reads the head of the file, and the
 * size cap can only be enforced against a known length. Streaming straight
 * through would mean deciding whether to keep a file after it had already been
 * written.
 */
export async function putArticlePdf(
  key: string,
  body: Uint8Array,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.GARAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/pdf',
    }),
  )
}

/**
 * Raised when a key does not belong to the user asking for it.
 *
 * One type for every operation, and the wording stays operation-neutral: it
 * guarded only reads until #11 added a delete, and a message naming the wrong
 * verb in a log is worse than one naming none.
 */
export class PdfOwnershipError extends Error {
  constructor(key: string) {
    super(`Refusing ${key}: it does not belong to the requesting user.`)
    this.name = 'PdfOwnershipError'
  }
}

/**
 * Fetches one article's PDF as bytes, refusing keys the requester does not own.
 *
 * **Buffered on purpose.** The extraction pipeline is the caller this exists
 * for, and it posts the whole file to GROBID as one multipart body — it has to
 * hold the file either way, so streaming would only move the buffer. A caller
 * that is merely passing the bytes onward wants `openArticlePdf` below instead.
 */
export async function getArticlePdf(
  key: string,
  userId: string,
): Promise<Uint8Array> {
  const { body } = await fetchOwnedObject(key, userId)
  return body.transformToByteArray()
}

/** One article's PDF, unread, with what Garage said about it. */
export interface ArticlePdfStream {
  kind: 'body'
  /**
   * The object's bytes as a web stream.
   *
   * Nothing has been read from it yet. Whoever takes this owns it: it must be
   * consumed or cancelled, or the connection to Garage stays open.
   */
  body: ReadableStream<Uint8Array>
  /**
   * Garage's own `Content-Length`, or `null` if it reported none — which is
   * the difference between a browser that can show a progress bar and one that
   * cannot, so it is passed through rather than recomputed.
   */
  contentLength: number | null
  /**
   * Garage's `ETag` for the object, verbatim, or `null` if it sent none.
   *
   * Garage's rather than one derived from the article id, although the id would
   * serve today — a stored PDF is never replaced. The object's own tag changes
   * with its bytes, so a later feature that did replace one could not leave a
   * browser trusting a stale copy.
   */
  etag: string | null
}

/**
 * The requester's copy is current: Garage answered 304 to `ifNoneMatch`.
 *
 * Nothing was read, and there is nothing to consume.
 */
export interface ArticlePdfNotModified {
  kind: 'not-modified'
  /** The object's tag as Garage sent it with the 304, or `null`. */
  etag: string | null
}

export interface OpenArticlePdfOptions {
  /**
   * An `If-None-Match` condition for Garage to evaluate — already validated by
   * the caller. `null` or absent reads the object unconditionally.
   */
  ifNoneMatch?: string | null
}

/**
 * Opens one article's PDF for streaming, refusing keys the requester does not
 * own.
 *
 * The counterpart to `getArticlePdf`, for the caller that is handing the bytes
 * straight to a client: the PDF-serving route
 * (`src/lit-tracker/pdf/pdf-endpoint.ts`). A paper is megabytes, and buffering
 * one per in-flight request would put the server's memory at the mercy of how
 * many tabs are open — the read path has no reason to hold what it is only
 * passing along. In Node, `transformToWebStream()` is `Readable.toWeb()` over
 * the socket the SDK is already reading, so this is a genuine stream rather
 * than a buffer wearing a stream's shape.
 *
 * The request is awaited before anything is returned, so a missing object or a
 * refused signature raises **here** — before a response exists to be half-sent.
 * That is what makes "a missing object fails cleanly" implementable at all: an
 * error discovered after the first chunk is already a truncated 200.
 *
 * ## Unchanged is a result, not an error
 *
 * With `ifNoneMatch`, Garage compares the condition with the object and may
 * answer 304. **The AWS SDK throws on that 304** — an `S3ServiceException` named
 * `Unknown`, measured 2026-09-14 — as it does for any response it has no model
 * for. It is turned into a value here, so that no caller has to know the SDK
 * does this, and so that a caller's general "storage failed" handling cannot
 * swallow it into a 500. The ownership check still runs first: the condition is
 * an argument to the fetch it guards, not a way around it.
 */
export async function openArticlePdf(
  key: string,
  userId: string,
  { ifNoneMatch = null }: OpenArticlePdfOptions = {},
): Promise<ArticlePdfStream | ArticlePdfNotModified> {
  try {
    const { body, contentLength, etag } = await fetchOwnedObject(
      key,
      userId,
      ifNoneMatch,
    )
    return {
      kind: 'body',
      body: body.transformToWebStream(),
      contentLength,
      etag,
    }
  } catch (error) {
    if (isNotModified(error)) {
      return { kind: 'not-modified', etag: etagOfNotModified(error) }
    }
    throw error
  }
}

/**
 * Whether a thrown value is the SDK's rendering of a 304.
 *
 * Keyed on the status alone, and on nothing looser: the error's name is
 * `Unknown`, which the SDK uses for every response it cannot model.
 */
function isNotModified(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode === 304
  )
}

/**
 * The `ETag` Garage sent with its 304.
 *
 * It is on the raw response the SDK attaches to the error, as a
 * non-enumerable `$response` — present, measured, but not part of the
 * exception's typed shape, hence the defensive read.
 */
function etagOfNotModified(error: unknown): string | null {
  const headers = (
    error as { $response?: { headers?: Record<string, string | undefined> } }
  ).$response?.headers
  return headers?.['etag'] ?? null
}

/**
 * Removes one article's PDF, refusing keys the named user does not own.
 *
 * The first operation here that takes something away — everything this project
 * had built until #11 only ever added — and it is deliberately the last step of
 * a deletion rather than part of it: the article row and everything cascading
 * from it goes in one Postgres transaction, and this runs afterwards, from a
 * queue, because object storage cannot join that transaction.
 *
 * **Idempotent, because the queue will run it twice.** S3's `DeleteObject`
 * answers 204 for a key that was never there, so a retry after a partial failure
 * is a success rather than an error to be distinguished from one. That is what
 * lets the cleanup be retried at all.
 *
 * The ownership check is the same one the reads make, and it matters more here:
 * a mixed-up key served to the wrong reader is a disclosure, while a mixed-up
 * key deleted is another user's paper gone for good. Its caller derives the key
 * from the same user id it passes, so today this can only pass — that is the
 * point. It is the guard that stays behind if a later caller ever reads a key
 * out of a row instead.
 */
export async function deleteArticlePdf(
  key: string,
  userId: string,
): Promise<void> {
  if (!isOwnedBy(key, userId)) {
    throw new PdfOwnershipError(key)
  }

  await s3.send(
    new DeleteObjectCommand({ Bucket: env.GARAGE_BUCKET, Key: key }),
  )
}

/**
 * The shared half of both reads: check the key belongs to the asker, fetch the
 * object, and insist it has a body.
 *
 * The ownership check is here rather than only at the call sites so that every
 * read path inherits it — a key that came back from a query is still checked
 * against the session's user before any bytes are fetched. It is defence in
 * depth behind `/query`'s scoping and the serving route's own `WHERE user_id`,
 * not a replacement for either: this is the last point at which a mixed-up row
 * can still be caught.
 */
async function fetchOwnedObject(
  key: string,
  userId: string,
  ifNoneMatch: string | null = null,
) {
  if (!isOwnedBy(key, userId)) {
    throw new PdfOwnershipError(key)
  }

  const object = await s3.send(
    new GetObjectCommand({
      Bucket: env.GARAGE_BUCKET,
      Key: key,
      ...(ifNoneMatch === null ? {} : { IfNoneMatch: ifNoneMatch }),
    }),
  )
  if (!object.Body) {
    throw new Error(`Garage returned no body for ${key}.`)
  }
  return {
    body: object.Body,
    contentLength: object.ContentLength ?? null,
    etag: object.ETag ?? null,
  }
}
