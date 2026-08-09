// @vitest-environment node
//
// The unit tier runs in jsdom, but this file exercises server request parsing:
// multipart decoding, and `File.name` surviving it. jsdom supplies its own
// `FormData`, which drops the filename and turns every part into "blob" — so
// under jsdom these tests would pass or fail against an implementation that
// never runs in production. Node's is the one the app server uses.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { respondToUpload } from './upload-endpoint'
import { MAX_FILE_BYTES, MAX_FILES_PER_SUBMISSION } from './validation'

/**
 * `storeUpload` is the one part of this path that reaches Garage and pg-boss,
 * so it is stubbed here and exercised for real by the integration tier. What
 * these tests are about is the decision the endpoint makes *before* storing:
 * who is asking, what was submitted, and whether it is acceptable.
 */
const storeUpload = vi.hoisted(() => vi.fn())
vi.mock('./store-upload', () => ({ storeUpload }))

/** Never touched: every test here either refuses before storing, or stubs it. */
const database = {} as DatabaseHandle

/** Likewise: `storeUpload` is stubbed, so nothing ever sends on it. */
const queue = { send: vi.fn() }
const getQueue = async () => queue

/**
 * Backed by an explicit `ArrayBuffer` so the result is a `Uint8Array<ArrayBuffer>`
 * — `new Uint8Array(n)` widens to `ArrayBufferLike`, which `BlobPart` (and so
 * the `File` constructor) does not accept.
 */
function pdfBytes(size = 32): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(size))
  bytes.set(new TextEncoder().encode('%PDF-'))
  return bytes
}

function submission(
  files: { name: string; type: string; body?: Uint8Array<ArrayBuffer> }[],
): Request {
  const form = new FormData()
  for (const file of files) {
    form.append(
      'files',
      new File([file.body ?? pdfBytes()], file.name, { type: file.type }),
    )
  }
  return new Request('https://nicbk.com/api/lit-tracker/upload', {
    method: 'POST',
    body: form,
  })
}

const onePdf = [{ name: 'paper.pdf', type: 'application/pdf' }]

const signedIn = { getUserId: async () => 'user-a', database, getQueue }

beforeEach(() => {
  storeUpload.mockReset()
  storeUpload.mockImplementation(
    async (_db: unknown, _queue: unknown, upload: { filename: string }) => ({
      id: `id-for-${upload.filename}`,
      filename: upload.filename,
    }),
  )
})

describe('respondToUpload', () => {
  it('stores a valid PDF under the session user', async () => {
    const response = await respondToUpload(submission(onePdf), signedIn)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      accepted: [{ id: 'id-for-paper.pdf', filename: 'paper.pdf' }],
      rejected: [],
    })
    // The owner comes from the session, never from the submission — the same
    // rule /api/zero/query follows.
    expect(storeUpload).toHaveBeenCalledWith(
      database,
      queue,
      expect.objectContaining({ userId: 'user-a', filename: 'paper.pdf' }),
    )
  })

  it('stores every file of a multi-file submission', async () => {
    const response = await respondToUpload(
      submission([
        { name: 'one.pdf', type: 'application/pdf' },
        { name: 'two.pdf', type: 'application/pdf' },
        { name: 'three.pdf', type: 'application/pdf' },
      ]),
      signedIn,
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.accepted.map((a: { filename: string }) => a.filename)).toEqual([
      'one.pdf',
      'two.pdf',
      'three.pdf',
    ])
    expect(storeUpload).toHaveBeenCalledTimes(3)
  })

  it('refuses a request with no session and stores nothing', async () => {
    const response = await respondToUpload(submission(onePdf), {
      getUserId: async () => null,
      database,
      getQueue,
    })

    expect(response.status).toBe(401)
    expect(storeUpload).not.toHaveBeenCalled()
  })

  it('refuses a non-PDF with an explanatory message and stores nothing', async () => {
    const response = await respondToUpload(
      submission([{ name: 'cat.png', type: 'image/png' }]),
      signedIn,
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.accepted).toEqual([])
    expect(body.rejected).toEqual([
      { filename: 'cat.png', message: expect.stringContaining('image/png') },
    ])
    expect(storeUpload).not.toHaveBeenCalled()
  })

  it('refuses a file that claims to be a PDF but is not', async () => {
    const response = await respondToUpload(
      submission([
        {
          name: 'trojan.pdf',
          type: 'application/pdf',
          body: new TextEncoder().encode('MZ\x90\x00'),
        },
      ]),
      signedIn,
    )

    expect(response.status).toBe(400)
    expect(storeUpload).not.toHaveBeenCalled()
  })

  it('refuses an oversized file', async () => {
    const response = await respondToUpload(
      submission([
        {
          name: 'huge.pdf',
          type: 'application/pdf',
          body: pdfBytes(MAX_FILE_BYTES + 1),
        },
      ]),
      signedIn,
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.rejected[0].message).toContain('exceeds')
    expect(storeUpload).not.toHaveBeenCalled()
  })

  it('refuses a submission over the file-count limit', async () => {
    const tooMany = Array.from(
      { length: MAX_FILES_PER_SUBMISSION + 1 },
      (_, index) => ({ name: `p${index}.pdf`, type: 'application/pdf' }),
    )

    const response = await respondToUpload(submission(tooMany), signedIn)

    expect(response.status).toBe(400)
    expect((await response.json()).rejected[0].message).toContain(
      `at most ${MAX_FILES_PER_SUBMISSION}`,
    )
    expect(storeUpload).not.toHaveBeenCalled()
  })

  it('stores nothing at all when one file of a batch is unacceptable', async () => {
    // The batch is the unit: a user who fixes the one bad file re-submits the
    // set, rather than finding that the good ones went through and the set is
    // now half-uploaded.
    const response = await respondToUpload(
      submission([
        { name: 'good.pdf', type: 'application/pdf' },
        { name: 'bad.png', type: 'image/png' },
      ]),
      signedIn,
    )

    expect(response.status).toBe(400)
    expect(storeUpload).not.toHaveBeenCalled()
  })

  it('reports every unacceptable file, not only the first', async () => {
    const response = await respondToUpload(
      submission([
        { name: 'a.png', type: 'image/png' },
        { name: 'b.gif', type: 'image/gif' },
      ]),
      signedIn,
    )

    const body = await response.json()
    expect(body.rejected.map((r: { filename: string }) => r.filename)).toEqual([
      'a.png',
      'b.gif',
    ])
  })

  it('refuses a submission carrying no files', async () => {
    const response = await respondToUpload(
      new Request('https://nicbk.com/api/lit-tracker/upload', {
        method: 'POST',
        body: new FormData(),
      }),
      signedIn,
    )

    expect(response.status).toBe(400)
    expect(storeUpload).not.toHaveBeenCalled()
  })

  it('refuses a body that is not a multipart form', async () => {
    const response = await respondToUpload(
      new Request('https://nicbk.com/api/lit-tracker/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"files":[]}',
      }),
      signedIn,
    )

    expect(response.status).toBe(400)
    expect(storeUpload).not.toHaveBeenCalled()
  })

  it('ignores non-file entries submitted under the files field', async () => {
    // A client can put a string under any field name; it must not be mistaken
    // for a file and reach validation as one.
    const form = new FormData()
    form.append('files', 'not-a-file')
    const response = await respondToUpload(
      new Request('https://nicbk.com/api/lit-tracker/upload', {
        method: 'POST',
        body: form,
      }),
      signedIn,
    )

    expect(response.status).toBe(400)
    expect(storeUpload).not.toHaveBeenCalled()
  })
})
