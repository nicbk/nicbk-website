import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadPdfs } from './upload-request'

function pdf(name: string) {
  return new File([new Uint8Array(new ArrayBuffer(8))], name, {
    type: 'application/pdf',
  })
}

function respondWith(body: unknown, status: number) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('uploadPdfs', () => {
  it('posts every file under the field the endpoint reads', async () => {
    const fetchMock = respondWith({ accepted: [], rejected: [] }, 201)

    await uploadPdfs([pdf('a.pdf'), pdf('b.pdf')])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/lit-tracker/upload')
    expect(init.method).toBe('POST')
    const files = (init.body as FormData).getAll('files') as File[]
    expect(files.map((file) => file.name)).toEqual(['a.pdf', 'b.pdf'])
  })

  it('reports acceptance with the submitted count', async () => {
    respondWith(
      { accepted: [{ id: '1', filename: 'a.pdf' }], rejected: [] },
      201,
    )

    expect(await uploadPdfs([pdf('a.pdf')])).toEqual({
      status: 'accepted',
      count: 1,
    })
  })

  it('passes the server per-file refusals through', async () => {
    respondWith(
      {
        accepted: [],
        rejected: [{ filename: 'cat.png', message: 'Not a PDF.' }],
      },
      400,
    )

    expect(await uploadPdfs([pdf('cat.png')])).toEqual({
      status: 'rejected',
      rejected: [{ filename: 'cat.png', message: 'Not a PDF.' }],
    })
  })

  it('explains an expired session rather than reporting a generic failure', async () => {
    respondWith({ error: 'Not signed in.' }, 401)

    const outcome = await uploadPdfs([pdf('a.pdf')])

    expect(outcome.status).toBe('rejected')
    expect(outcome).toMatchObject({
      rejected: [{ message: expect.stringContaining('no longer signed in') }],
    })
  })

  it('reports a transport failure as a rejection rather than throwing', async () => {
    // The modal has one way to show a failure, and a caller forced to handle
    // both a thrown error and a returned one would need two.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    const outcome = await uploadPdfs([pdf('a.pdf')])

    expect(outcome.status).toBe('rejected')
    expect(outcome).toMatchObject({
      rejected: [{ message: expect.stringContaining('could not reach') }],
    })
  })

  it('survives an error response that is not the expected shape', async () => {
    respondWith({ unexpected: true }, 500)

    const outcome = await uploadPdfs([pdf('a.pdf')])

    expect(outcome.status).toBe('rejected')
    expect(outcome).toMatchObject({
      rejected: [{ message: expect.stringContaining('refused') }],
    })
  })

  it('survives an error response that is not JSON at all', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>502</html>', { status: 502 }),
    )

    expect((await uploadPdfs([pdf('a.pdf')])).status).toBe('rejected')
  })
})
