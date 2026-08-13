import { describe, expect, it, vi } from 'vitest'

/**
 * The mount itself, in the same shape as `/api/lit-tracker/upload`'s test. What
 * the endpoint decides is covered in `src/lit-tracker/pdf/pdf-endpoint.test.ts`,
 * and against a real Garage in `src/lit-tracker/pdf/pdf.integration.test.ts`.
 *
 * `~/db/client` is mocked because importing it opens a real connection from the
 * validated environment — server wiring the unit tier has no business reaching.
 */

const respondWithArticlePdf = vi.hoisted(() =>
  vi.fn(async (..._args: unknown[]) => new Response('ok')),
)
const getSession = vi.hoisted(() => vi.fn())
const db = vi.hoisted(() => ({ select: vi.fn() }))
const pool = vi.hoisted(() => ({ end: vi.fn() }))

vi.mock('~/lit-tracker/pdf/pdf-endpoint', () => ({ respondWithArticlePdf }))
vi.mock('~/auth/auth', () => ({ getSession }))
vi.mock('~/db/client', () => ({ db, pool }))

const { Route } = await import('./pdf')

type GetHandler = (options: {
  request: Request
  params: { articleId: string }
}) => Promise<Response>

function handler(): GetHandler {
  return (Route.options.server?.handlers as unknown as { GET: GetHandler }).GET
}

function requestFor(articleId: string): Request {
  return new Request(
    `https://nicbk.com/api/lit-tracker/articles/${articleId}/pdf`,
  )
}

describe('the article PDF mount', () => {
  it('serves GET, and nothing else', () => {
    const handlers = Route.options.server?.handlers as
      | Record<string, unknown>
      | undefined

    // Read-only by construction: the bytes are written by the upload endpoint,
    // and nothing about this route should offer a second way in.
    expect(Object.keys(handlers ?? {})).toEqual(['GET'])
  })

  it('passes the id from the path through with the database', async () => {
    const request = requestFor('article-1')

    const response = await handler()({
      request,
      params: { articleId: 'article-1' },
    })

    expect(respondWithArticlePdf).toHaveBeenCalledWith(request, {
      articleId: 'article-1',
      getUserId: expect.any(Function),
      database: { db, pool },
    })
    expect(await response.text()).toBe('ok')
  })

  it("derives the user id from the request's own session, never from the URL", async () => {
    // The rule /api/lit-tracker/upload and /api/zero/query follow: no request
    // gets to name whose articles are searched.
    await handler()({
      request: requestFor('article-1'),
      params: { articleId: 'article-1' },
    })

    const lastCall = respondWithArticlePdf.mock.calls.at(-1) as unknown as [
      Request,
      { getUserId: (request: Request) => Promise<string | null> },
    ]
    const { getUserId } = lastCall[1]

    const incoming = requestFor('article-1')
    getSession.mockResolvedValue({ user: { id: 'user-from-session' } })
    await expect(getUserId(incoming)).resolves.toBe('user-from-session')
    expect(getSession).toHaveBeenCalledWith(incoming)

    // No session is `null`, which the endpoint answers with a 401.
    getSession.mockResolvedValue(null)
    await expect(getUserId(incoming)).resolves.toBeNull()
  })
})
