import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { createDatabase } from '~/db/create-database'
import { articles, user } from '~/db/schema'
import type { TestDatabase } from '~/db/test-support/test-database'
import { startTestDatabase } from '~/db/test-support/test-database'
import { pdfObjectKey } from '~/storage/object-key'
import type { TestGarage } from '~/storage/test-support/test-garage'
import {
  startTestGarage,
  TEST_ACCESS_KEY_ID,
  TEST_BUCKET,
  TEST_SECRET_ACCESS_KEY,
} from '~/storage/test-support/test-garage'

/**
 * The PDF-serving route against a real Postgres and a **real Garage**.
 *
 * This is where the task's security properties are actually established. A unit
 * test with a stubbed store can show that the handler makes the right decisions
 * about a fake; only this tier can show that the bytes a reader gets back are
 * the bytes that were stored, that another user's request is refused while
 * their article genuinely exists, and that a row pointing at a missing object
 * fails instead of serving an empty 200.
 *
 * Every article here is planted directly rather than uploaded: the upload path
 * has its own integration file, and what this one needs is a row and an object,
 * however they got there.
 *
 * The modules under test read their configuration from the validated
 * environment at import time, and the containers' addresses are only known once
 * they are running — so they are imported dynamically, after `process.env` has
 * been pointed at them.
 */

const OWNER = 'user-a-pdf'
const OTHER = 'user-b-pdf'

const OWNED_ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-000000000001'
const OTHERS_ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-000000000002'
const NO_SUCH_ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-0000000000ff'

let testDatabase: TestDatabase
let garage: TestGarage
let database: DatabaseHandle

let respondWithArticlePdf: typeof import('./pdf-endpoint').respondWithArticlePdf
let putArticlePdf: typeof import('~/storage/pdf-storage').putArticlePdf

/** A small but genuine PDF: a header, a marker, and an EOF. */
function pdf(marker: string): Uint8Array {
  return new TextEncoder().encode(`%PDF-1.7\n${marker}\n%%EOF\n`)
}

beforeAll(async () => {
  // Started together: each pulls an image and takes tens of seconds cold.
  ;[testDatabase, garage] = await Promise.all([
    startTestDatabase(),
    startTestGarage(),
  ])

  process.env['DATABASE_URL'] = testDatabase.connectionString
  process.env['GARAGE_ENDPOINT'] = garage.endpoint
  process.env['GARAGE_ACCESS_KEY_ID'] = TEST_ACCESS_KEY_ID
  process.env['GARAGE_SECRET_ACCESS_KEY'] = TEST_SECRET_ACCESS_KEY
  process.env['GARAGE_BUCKET'] = TEST_BUCKET

  putArticlePdf = (await import('~/storage/pdf-storage')).putArticlePdf
  respondWithArticlePdf = (await import('./pdf-endpoint')).respondWithArticlePdf
}, 300_000)

afterAll(async () => {
  await Promise.all([testDatabase.stop(), garage.stop()])
})

beforeEach(async () => {
  await testDatabase.reset()
  await garage.reset()
  // Opened after the restore: it drops and recreates the database underneath
  // any connection already open to it (see test-database.ts).
  database = createDatabase(testDatabase.connectionString)

  // The ownership FK is real, so an article needs an owner that exists.
  await database.db
    .insert(user)
    .values(
      [OWNER, OTHER].map((id) => ({
        id,
        name: id,
        email: `${id}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    )
    .onConflictDoNothing()
}, 120_000)

afterEach(async () => {
  await database.pool.end()
})

/** Plants an article row and, unless told otherwise, its PDF in the bucket. */
async function plantArticle(
  articleId: string,
  userId: string,
  options: { body?: Uint8Array; storeObject?: boolean } = {},
): Promise<Uint8Array> {
  const { body = pdf(articleId), storeObject = true } = options
  const key = pdfObjectKey(userId, articleId)

  await database.db.insert(articles).values({
    id: articleId,
    userId,
    title: `A paper belonging to ${userId}`,
    authors: [{ name: 'A. Author' }],
    pdfObjectKey: key,
  })
  if (storeObject) {
    await putArticlePdf(key, body)
  }
  return body
}

/** Asks the route for an article, as the given user or as nobody. */
function ask(articleId: string, userId: string | null): Promise<Response> {
  return respondWithArticlePdf(
    new Request(`https://nicbk.com/api/lit-tracker/articles/${articleId}/pdf`),
    {
      articleId,
      getUserId: async () => userId,
      database,
    },
  )
}

describe('serving an article PDF, against real containers', () => {
  it('gives the owner their paper back, byte for byte', async () => {
    const body = await plantArticle(OWNED_ARTICLE, OWNER)

    const response = await ask(OWNED_ARTICLE, OWNER)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body)
  })

  it('streams a large file through whole', async () => {
    // A paper is megabytes, and the read path never holds one: this is the
    // assertion that nothing truncates at a chunk boundary on the way out.
    const body = new Uint8Array(3 * 1024 * 1024)
    body.set(new TextEncoder().encode('%PDF-1.7\n'))
    // A recognisable last byte, so a short read cannot pass by accident.
    body[body.length - 1] = 42
    await plantArticle(OWNED_ARTICLE, OWNER, { body })

    const response = await ask(OWNED_ARTICLE, OWNER)
    const received = new Uint8Array(await response.arrayBuffer())

    expect(response.headers.get('content-length')).toBe(String(body.byteLength))
    expect(received.byteLength).toBe(body.byteLength)
    expect(received.at(-1)).toBe(42)
  })

  it("refuses another user's article exactly as if it did not exist", async () => {
    // Non-vacuous: the article and its object genuinely exist, so a handler
    // that could never serve anything would still fail the last assertion here.
    const othersBody = await plantArticle(OTHERS_ARTICLE, OTHER)
    expect(await garage.has(pdfObjectKey(OTHER, OTHERS_ARTICLE))).toBe(true)

    const notYours = await ask(OTHERS_ARTICLE, OWNER)
    const notThere = await ask(NO_SUCH_ARTICLE, OWNER)

    // The property is the equality, not the status: asserting each is "an
    // error" separately would pass even if one were a 403 naming the owner.
    expect(notYours.status).toBe(notThere.status)
    expect(await notYours.text()).toBe(await notThere.text())
    expect(notYours.headers.get('content-type')).toBe(
      notThere.headers.get('content-type'),
    )

    const forItsOwner = await ask(OTHERS_ARTICLE, OTHER)
    expect(new Uint8Array(await forItsOwner.arrayBuffer())).toEqual(othersBody)
  })

  it('tells an anonymous caller nothing about whether an id is real', async () => {
    await plantArticle(OWNED_ARTICLE, OWNER)

    const forReal = await ask(OWNED_ARTICLE, null)
    const forInvented = await ask(NO_SUCH_ARTICLE, null)

    expect(forReal.status).toBe(401)
    expect(forReal.status).toBe(forInvented.status)
    expect(await forReal.text()).toBe(await forInvented.text())
  })

  it('fails cleanly when the row survives but the object does not', async () => {
    // The state an interrupted deletion or a half-restored backup leaves.
    await plantArticle(OWNED_ARTICLE, OWNER, { storeObject: false })
    expect(await garage.has(pdfObjectKey(OWNER, OWNED_ARTICLE))).toBe(false)

    const response = await ask(OWNED_ARTICLE, OWNER)

    // No 200, and so no zero-byte "PDF" for a reader to stare at.
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(await response.json()).toEqual({
      error: 'The file could not be read.',
    })
  })

  it('serves the bytes itself, never a redirect to Garage', async () => {
    // The observable form of the no-presigned-URL rule: the response body *is*
    // the paper, and nothing in it points at the object store.
    await plantArticle(OWNED_ARTICLE, OWNER)

    const response = await ask(OWNED_ARTICLE, OWNER)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(JSON.stringify([...response.headers])).not.toContain(garage.endpoint)
  })
})
