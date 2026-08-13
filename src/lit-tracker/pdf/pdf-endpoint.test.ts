// @vitest-environment node
//
// Server request handling, like `upload-endpoint.test.ts` next door: this file
// builds `Request`s, reads `Response` bodies, and streams. Node's
// implementations are the ones the app server runs, and jsdom's stand-ins
// differ enough to make a passing test meaningless.
import { drizzle } from 'drizzle-orm/pg-proxy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import * as schema from '~/db/schema'
import { respondWithArticlePdf } from './pdf-endpoint'

/**
 * Storage is stubbed here and exercised for real against a Garage container in
 * `pdf.integration.test.ts`. What these tests are about is the decision made
 * *before* any object is fetched — who is asking, whether the row is theirs —
 * and, just as importantly, the cases where storage must not be reached at all.
 */
const openArticlePdf = vi.hoisted(() => vi.fn())
vi.mock('~/storage/pdf-storage', () => ({ openArticlePdf }))

const OWNER = 'user-a'
const OTHER = 'user-b'

const OWNED_ARTICLE = '01930000-0000-7000-8000-0000000000a1'
const OTHERS_ARTICLE = '01930000-0000-7000-8000-0000000000b1'
const NO_SUCH_ARTICLE = '01930000-0000-7000-8000-0000000000ff'

/** What each article row would hold, keyed by owner. */
const ROWS = [
  { id: OWNED_ARTICLE, userId: OWNER },
  { id: OTHERS_ARTICLE, userId: OTHER },
]

function keyFor(articleId: string, userId: string): string {
  return `lit-tracker/${userId}/${articleId}/source.pdf`
}

interface RecordedQuery {
  sql: string
  params: unknown[]
}

/**
 * A database whose query builder is real and whose connection is a function.
 *
 * Deliberately not the hand-rolled `{ select: () => ({ from: ... }) }` double
 * used elsewhere in this codebase: those record *that* a query happened, and
 * the property this route lives or dies by is *what was in the `WHERE`*. Drizzle's
 * pg-proxy driver builds the same SQL the real pool would and hands it here as
 * a string plus parameters, so a change that dropped the `user_id` condition
 * would fail these tests instead of passing them.
 *
 * The rows it answers with come from `ROWS`, matched on both columns — so
 * "another user's article" is refused by the same mechanism production uses,
 * rather than by the fake being told to say no.
 */
function fakeDatabase(): {
  database: DatabaseHandle
  queries: RecordedQuery[]
} {
  const queries: RecordedQuery[] = []

  const db = drizzle(
    async (sql, params) => {
      queries.push({ sql, params })
      const [articleId, userId] = params as string[]
      const row = ROWS.find(
        (candidate) =>
          candidate.id === articleId && candidate.userId === userId,
      )
      // pg-proxy hands rows back positionally, in the order the select names
      // its columns — here, the one column `pdf_object_key`.
      return { rows: row ? [[keyFor(row.id, row.userId)]] : [] }
    },
    { schema },
  )

  return {
    // The proxy driver's client type differs from the pool-backed one the app
    // uses; the query builder over it is the same.
    database: { db, pool: {} } as unknown as DatabaseHandle,
    queries,
  }
}

/** A signed-in caller, or an anonymous one when `userId` is null. */
function signedInAs(userId: string | null) {
  return async () => userId
}

function requestFor(articleId: string): Request {
  return new Request(
    `https://nicbk.com/api/lit-tracker/articles/${articleId}/pdf`,
  )
}

/** Answers with a stream, the way `openArticlePdf` does. */
function servesBytes(bytes: Uint8Array) {
  return async () => ({
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    }),
    contentLength: bytes.byteLength,
  })
}

const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\nthe paper\n%%EOF\n')

beforeEach(() => {
  vi.clearAllMocks()
  openArticlePdf.mockImplementation(servesBytes(PDF_BYTES))
})

describe('serving an article PDF', () => {
  it('refuses an anonymous request without looking the id up', async () => {
    const { database, queries } = fakeDatabase()

    const response = await respondWithArticlePdf(requestFor(OWNED_ARTICLE), {
      articleId: OWNED_ARTICLE,
      getUserId: signedInAs(null),
      database,
    })

    expect(response.status).toBe(401)
    // The point of the ordering: an anonymous request reaches neither the
    // database nor the object store, so it can reveal nothing about either.
    expect(queries).toHaveLength(0)
    expect(openArticlePdf).not.toHaveBeenCalled()
  })

  it("does not reach storage for another user's article", async () => {
    const { database } = fakeDatabase()

    const response = await respondWithArticlePdf(requestFor(OTHERS_ARTICLE), {
      articleId: OTHERS_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    expect(response.status).toBe(404)
    expect(openArticlePdf).not.toHaveBeenCalled()
  })

  it('does not reach storage for an article that does not exist', async () => {
    const { database } = fakeDatabase()

    const response = await respondWithArticlePdf(requestFor(NO_SUCH_ARTICLE), {
      articleId: NO_SUCH_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    expect(response.status).toBe(404)
    expect(openArticlePdf).not.toHaveBeenCalled()
  })

  it('answers a malformed id the same way, without querying', async () => {
    // A non-uuid would make Postgres raise 22P02 — a 500 that a well-formed
    // unknown id never produces, and so a way to tell the two apart.
    const { database, queries } = fakeDatabase()

    const response = await respondWithArticlePdf(requestFor('not-a-uuid'), {
      articleId: 'not-a-uuid',
      getUserId: signedInAs(OWNER),
      database,
    })

    expect(response.status).toBe(404)
    expect(queries).toHaveLength(0)
  })

  it('gives byte-identical refusals for "not yours" and "not there"', async () => {
    const { database } = fakeDatabase()
    const ask = (articleId: string) =>
      respondWithArticlePdf(requestFor(articleId), {
        articleId,
        getUserId: signedInAs(OWNER),
        database,
      })

    const notYours = await ask(OTHERS_ARTICLE)
    const notThere = await ask(NO_SUCH_ARTICLE)

    expect(notYours.status).toBe(notThere.status)
    expect(await notYours.text()).toBe(await notThere.text())
    expect(notYours.headers.get('content-type')).toBe(
      notThere.headers.get('content-type'),
    )
  })

  it('scopes the lookup by owner in the query itself', async () => {
    const { database, queries } = fakeDatabase()

    await respondWithArticlePdf(requestFor(OWNED_ARTICLE), {
      articleId: OWNED_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    expect(queries).toHaveLength(1)
    const [query] = queries
    expect(query?.sql).toContain('"user_id"')
    // Both values are bound parameters of the one statement — the ownership
    // condition cannot be lost without this changing. The trailing `1` is the
    // `LIMIT`, which drizzle binds like any other value.
    expect(query?.params).toEqual([OWNED_ARTICLE, OWNER, 1])
  })

  it('fetches the key the row holds, not one built from the URL', async () => {
    const { database } = fakeDatabase()

    await respondWithArticlePdf(requestFor(OWNED_ARTICLE), {
      articleId: OWNED_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    expect(openArticlePdf).toHaveBeenCalledWith(
      keyFor(OWNED_ARTICLE, OWNER),
      OWNER,
    )
  })

  it("serves the owner's PDF as a PDF, and says how long it is", async () => {
    const { database } = fakeDatabase()

    const response = await respondWithArticlePdf(requestFor(OWNED_ARTICLE), {
      articleId: OWNED_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-length')).toBe(
      String(PDF_BYTES.byteLength),
    )
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PDF_BYTES)
  })

  it('sends the bytes itself rather than redirecting to the object store', async () => {
    // The observable form of the no-presigned-URL rule: nothing hands the
    // browser somewhere else to go.
    const { database } = fakeDatabase()

    const response = await respondWithArticlePdf(requestFor(OWNED_ARTICLE), {
      articleId: OWNED_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    expect(response.status).toBeLessThan(300)
    expect(response.headers.get('location')).toBeNull()
  })

  it('will not let the body be sniffed into something else, or cached publicly', async () => {
    const { database } = fakeDatabase()

    const response = await respondWithArticlePdf(requestFor(OWNED_ARTICLE), {
      articleId: OWNED_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-disposition')).toBe('inline')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('omits the length when the store did not report one', async () => {
    const { database } = fakeDatabase()
    openArticlePdf.mockImplementation(async () => ({
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(PDF_BYTES)
          controller.close()
        },
      }),
      contentLength: null,
    }))

    const response = await respondWithArticlePdf(requestFor(OWNED_ARTICLE), {
      articleId: OWNED_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    // A wrong length would truncate the paper; no length at all merely costs a
    // progress bar.
    expect(response.headers.get('content-length')).toBeNull()
    expect(response.status).toBe(200)
  })

  it('fails cleanly when the object behind the row cannot be read', async () => {
    const { database } = fakeDatabase()
    openArticlePdf.mockRejectedValue(new Error('NoSuchKey'))
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await respondWithArticlePdf(requestFor(OWNED_ARTICLE), {
      articleId: OWNED_ARTICLE,
      getUserId: signedInAs(OWNER),
      database,
    })

    // Not a 200 that stops halfway, and not an unhandled rejection taking the
    // request down with it.
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(await response.json()).toEqual({
      error: 'The file could not be read.',
    })
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})
