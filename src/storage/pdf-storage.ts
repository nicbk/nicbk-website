import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { env } from '~/env'
import { isOwnedBy } from './object-key'

/**
 * Reading and writing article PDFs in Garage.
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

/** Raised when a key does not belong to the user asking for it. */
export class PdfOwnershipError extends Error {
  constructor(key: string) {
    super(`Refusing to read ${key}: it does not belong to the requesting user.`)
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
 */
export async function openArticlePdf(
  key: string,
  userId: string,
): Promise<ArticlePdfStream> {
  const { body, contentLength } = await fetchOwnedObject(key, userId)
  return { body: body.transformToWebStream(), contentLength }
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
async function fetchOwnedObject(key: string, userId: string) {
  if (!isOwnedBy(key, userId)) {
    throw new PdfOwnershipError(key)
  }

  const object = await s3.send(
    new GetObjectCommand({ Bucket: env.GARAGE_BUCKET, Key: key }),
  )
  if (!object.Body) {
    throw new Error(`Garage returned no body for ${key}.`)
  }
  return { body: object.Body, contentLength: object.ContentLength ?? null }
}
