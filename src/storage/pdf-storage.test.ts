// @vitest-environment node
//
// Server module, and the S3 client is mocked: what is asserted here is the
// decision this module makes *before* it reaches the network.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pdfObjectKey } from './object-key'

/**
 * The ownership refusal on the read path.
 *
 * The integration tier proves the refusal against a real Garage with the other
 * user's object genuinely present. What it cannot show is that the check
 * happens **before any request is made** — which is what keeps a mixed-up row
 * from becoming a fetch for someone else's PDF. That needs the client stubbed,
 * so it lives here.
 */

const send = vi.hoisted(() => vi.fn())
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = send
  },
  PutObjectCommand: class {
    constructor(readonly input: unknown) {}
  },
  GetObjectCommand: class {
    constructor(readonly input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(readonly input: unknown) {}
  },
}))

const {
  deleteArticlePdf,
  getArticlePdf,
  openArticlePdf,
  putArticlePdf,
  PdfOwnershipError,
} = await import('./pdf-storage')

const OWNER = 'user-a'
const ARTICLE = '01930000-0000-7000-8000-000000000001'
const TAG = '"18e1b007a1dab45b30cc861ba2dfda25"'

/**
 * What the AWS SDK throws when Garage answers 304, as measured against Garage
 * on 2026-09-14: an `S3ServiceException` named `Unknown`, whose raw response
 * rides along as a **non-enumerable** `$response` carrying the tag.
 */
function sdkNotModified(etag: string): Error {
  const error = Object.assign(new Error('UnknownError'), {
    name: 'Unknown',
    $fault: 'client',
    $metadata: { httpStatusCode: 304 },
  })
  Object.defineProperty(error, '$response', {
    value: { statusCode: 304, headers: { etag } },
    enumerable: false,
  })
  return error
}

beforeEach(() => {
  send.mockReset()
})

describe('getArticlePdf', () => {
  it('refuses another user key without asking the store for it', async () => {
    const key = pdfObjectKey('user-b', ARTICLE)

    await expect(getArticlePdf(key, OWNER)).rejects.toThrow(PdfOwnershipError)
    // The point: no request was made at all, so a mixed-up row cannot become a
    // fetch for someone else's PDF even momentarily.
    expect(send).not.toHaveBeenCalled()
  })

  it('reads a key the requester owns', async () => {
    const body = new Uint8Array([1, 2, 3])
    send.mockResolvedValue({ Body: { transformToByteArray: async () => body } })

    await expect(
      getArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER),
    ).resolves.toEqual(body)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('raises rather than returning nothing when the store answers with no body', async () => {
    send.mockResolvedValue({})

    await expect(
      getArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER),
    ).rejects.toThrow(/no body/)
  })
})

describe('openArticlePdf', () => {
  it('refuses another user key without asking the store for it', async () => {
    // The same rule as the buffered read, asserted separately because it is a
    // separate entry point: a second read path that skipped the check would be
    // a way around it.
    const key = pdfObjectKey('user-b', ARTICLE)

    await expect(openArticlePdf(key, OWNER)).rejects.toThrow(PdfOwnershipError)
    expect(send).not.toHaveBeenCalled()
  })

  it('hands back the stream without reading it, and the length beside it', async () => {
    const body = new ReadableStream()
    send.mockResolvedValue({
      Body: { transformToWebStream: () => body },
      ContentLength: 4_812_390,
      ETag: TAG,
    })

    // Unread on purpose: buffering the paper here would put the server's memory
    // at the mercy of how many readers have a tab open.
    await expect(
      openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER),
    ).resolves.toEqual({
      kind: 'body',
      body,
      contentLength: 4_812_390,
      etag: TAG,
    })
  })

  it('reports no length or tag rather than wrong ones when the store gives none', async () => {
    send.mockResolvedValue({ Body: { transformToWebStream: () => null } })

    const opened = await openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER)

    expect(opened).toMatchObject({
      kind: 'body',
      contentLength: null,
      etag: null,
    })
  })

  it('reads unconditionally when given no condition', async () => {
    send.mockResolvedValue({ Body: { transformToWebStream: () => null } })

    await openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER)

    expect(send.mock.calls[0]?.[0].input).not.toHaveProperty('IfNoneMatch')
  })

  it('hands the condition to the store with the read', async () => {
    send.mockResolvedValue({ Body: { transformToWebStream: () => null } })

    await openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER, {
      ifNoneMatch: TAG,
    })

    expect(send.mock.calls[0]?.[0].input).toMatchObject({ IfNoneMatch: TAG })
  })

  it('turns the SDK’s thrown 304 into a result carrying the tag', async () => {
    send.mockRejectedValue(sdkNotModified(TAG))

    await expect(
      openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER, { ifNoneMatch: TAG }),
    ).resolves.toEqual({ kind: 'not-modified', etag: TAG })
  })

  it('still refuses another user key when a condition is given', async () => {
    const key = pdfObjectKey('user-b', ARTICLE)

    await expect(
      openArticlePdf(key, OWNER, { ifNoneMatch: TAG }),
    ).rejects.toThrow(PdfOwnershipError)
    expect(send).not.toHaveBeenCalled()
  })

  it('lets every other storage failure through as a failure', async () => {
    const missing = Object.assign(new Error('NoSuchKey'), {
      $metadata: { httpStatusCode: 404 },
    })
    send.mockRejectedValue(missing)

    await expect(
      openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER, { ifNoneMatch: TAG }),
    ).rejects.toBe(missing)
  })

  it('raises rather than returning nothing when the store answers with no body', async () => {
    send.mockResolvedValue({})

    await expect(
      openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER),
    ).rejects.toThrow(/no body/)
  })
})

describe('putArticlePdf', () => {
  it('stores the bytes as a PDF under the given key', async () => {
    send.mockResolvedValue({})
    const key = pdfObjectKey(OWNER, ARTICLE)
    const bytes = new TextEncoder().encode('%PDF-1.7')

    await putArticlePdf(key, bytes)

    const [command] = send.mock.calls[0] as [{ input: Record<string, unknown> }]
    expect(command.input).toMatchObject({
      Key: key,
      Body: bytes,
      // Stored on the object so a later read serves it as a PDF rather than as
      // an octet stream the browser offers to download.
      ContentType: 'application/pdf',
    })
  })
})

describe('deleteArticlePdf', () => {
  it('removes the object under the given key', async () => {
    send.mockResolvedValue({})
    const key = pdfObjectKey(OWNER, ARTICLE)

    await deleteArticlePdf(key, OWNER)

    const [command] = send.mock.calls[0] as [{ input: Record<string, unknown> }]
    expect(command.input).toMatchObject({ Key: key })
  })

  it('refuses another user key without asking the store to delete it', async () => {
    // The same guard the reads carry, and it matters more here: a mixed-up key
    // read is a disclosure, a mixed-up key deleted is another user's paper gone
    // for good.
    const key = pdfObjectKey('user-b', ARTICLE)

    await expect(deleteArticlePdf(key, OWNER)).rejects.toThrow(
      PdfOwnershipError,
    )
    expect(send).not.toHaveBeenCalled()
  })

  it('does not distinguish an object that was already gone', async () => {
    // S3 answers 204 for a key that was never there, so the SDK resolves and
    // nothing here has to tell the two apart. That is what makes the cleanup
    // job safe to retry, which pg-boss will do.
    send.mockResolvedValue({})

    await expect(
      deleteArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER),
    ).resolves.toBeUndefined()
  })
})
