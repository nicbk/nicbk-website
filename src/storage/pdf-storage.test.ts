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
}))

const { getArticlePdf, openArticlePdf, putArticlePdf, PdfOwnershipError } =
  await import('./pdf-storage')

const OWNER = 'user-a'
const ARTICLE = '01930000-0000-7000-8000-000000000001'

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
    })

    // Unread on purpose: buffering the paper here would put the server's memory
    // at the mercy of how many readers have a tab open.
    await expect(
      openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER),
    ).resolves.toEqual({ body, contentLength: 4_812_390 })
  })

  it('reports no length rather than a wrong one when the store gives none', async () => {
    send.mockResolvedValue({ Body: { transformToWebStream: () => null } })

    const opened = await openArticlePdf(pdfObjectKey(OWNER, ARTICLE), OWNER)

    expect(opened.contentLength).toBeNull()
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
