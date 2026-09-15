import { mustGetMutator } from '@rocicorp/zero'
import { zeroDrizzle } from '@rocicorp/zero/server/adapters/drizzle'
import { eq } from 'drizzle-orm'
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
import * as drizzleSchema from '~/db/schema'
import type { TestDatabase } from '~/db/test-support/test-database'
import { startTestDatabase } from '~/db/test-support/test-database'
import type { ZeroContext } from './context'
import { mutators } from './mutators'
import { schema } from './schema.gen'

/**
 * Integration coverage for the **write** half of the authorization boundary:
 * real Postgres, the real committed migrations, and the real mutator
 * definitions, run through the same dispatch call `/api/zero/mutate` makes.
 *
 * `zero.integration.test.ts` is the read half. The split is by concern rather
 * than by convenience — reads prove that another user's rows stay invisible,
 * writes prove that another user's rows stay unwritten, and the two need
 * different fixtures and different assertions to be non-vacuous.
 *
 * **Why the dispatch call and not the mutator function directly.** A mutator
 * that is correct in isolation and wired up wrong is exactly the bug worth
 * catching, so `runAs` below looks the mutator up by name in the registry and
 * calls `.fn({args, tx, ctx})` inside a transaction — byte for byte what
 * `mutate-endpoint.ts` does. Calling `mutators.tags.create.fn(...)` through the
 * imported reference would skip the name lookup and prove less.
 *
 * **Why every refusal test is paired with a success.** A mutator that wrote
 * nothing under any circumstances would pass every "user A cannot write user
 * B's row" assertion. So each one is stated twice: refused across the boundary,
 * and accepted within it, against rows that are genuinely present either way.
 */

const USER_A = 'user-a-mutations'
const USER_B = 'user-b-mutations'

const CONTEXT_A: ZeroContext = { id: USER_A }
const CONTEXT_B: ZeroContext = { id: USER_B }

const ARTICLE_A = '0199a1b2-c3d4-7e5f-8a9b-000000001a01'
const ARTICLE_B = '0199a1b2-c3d4-7e5f-8a9b-000000001b01'
const TAG_A = '0199a1b2-c3d4-7e5f-8a9b-000000001a02'
const TAG_B = '0199a1b2-c3d4-7e5f-8a9b-000000001b02'
const MARK_A = '0199a1b2-c3d4-7e5f-8a9b-000000001a03'
const MARK_B = '0199a1b2-c3d4-7e5f-8a9b-000000001b03'

/** Ids for rows a test creates, rather than ones the fixture seeded. */
const NEW_TAG = '0199a1b2-c3d4-7e5f-8a9b-00000000c001'
const NEW_LINK = '0199a1b2-c3d4-7e5f-8a9b-00000000c002'
const OTHER_LINK = '0199a1b2-c3d4-7e5f-8a9b-00000000c003'
const NEW_MARK = '0199a1b2-c3d4-7e5f-8a9b-00000000c004'
const NEW_LINK_B = '0199a1b2-c3d4-7e5f-8a9b-00000000c005'
const EDGE_FROM_A = '0199a1b2-c3d4-7e5f-8a9b-00000000c006'
const EDGE_TO_A = '0199a1b2-c3d4-7e5f-8a9b-00000000c007'
const SECOND_ARTICLE_A = '0199a1b2-c3d4-7e5f-8a9b-00000000c008'

let testDatabase: TestDatabase
let database: DatabaseHandle
let zero: ReturnType<typeof zeroDrizzle<typeof schema, typeof database.db>>

beforeAll(async () => {
  testDatabase = await startTestDatabase()
}, 180_000)

afterAll(async () => {
  await testDatabase.stop()
})

beforeEach(async () => {
  await testDatabase.reset()
  database = createDatabase(testDatabase.connectionString)
  zero = zeroDrizzle(schema, database.db)
  await seedTwoUsers()
})

afterEach(async () => {
  await database.pool.end()
})

/**
 * Runs a mutator the way the endpoint runs it: found by name in the registry,
 * executed inside one transaction, under a server-derived context.
 *
 * The transaction is what makes "fails and leaves no row" testable — a mutator
 * that throws half way through rolls back what it had already written.
 */
async function runAs(
  name: string,
  ctx: ZeroContext | undefined,
  args: unknown,
): Promise<void> {
  await zero.transaction(async (tx) =>
    mustGetMutator(mutators, name).fn({ args, tx, ctx } as never),
  )
}

async function seedTwoUsers(): Promise<void> {
  for (const [userId, articleId, tagId, markId] of [
    [USER_A, ARTICLE_A, TAG_A, MARK_A],
    [USER_B, ARTICLE_B, TAG_B, MARK_B],
  ] as const) {
    await database.db.insert(drizzleSchema.user).values({
      id: userId,
      name: `Reader ${userId}`,
      email: `${userId}@example.com`,
      emailVerified: true,
    })
    await database.db.insert(drizzleSchema.articles).values({
      id: articleId,
      userId,
      title: `Paper for ${userId}`,
      authors: [{ name: 'Ada Lovelace' }],
      pdfObjectKey: `lit-tracker/${userId}/${articleId}/source.pdf`,
    })
    await database.db.insert(drizzleSchema.tags).values({
      id: tagId,
      userId,
      name: `tag of ${userId}`,
    })
    // One mark each, so every "A cannot write B's annotation" assertion has a
    // real row to fail against.
    await database.db.insert(drizzleSchema.annotations).values({
      id: markId,
      userId,
      articleId,
      type: 'highlight',
      pageIndex: 0,
      contents: `mark of ${userId}`,
      payload: { color: '#ffd400' },
    })
  }
}

const allTags = () => database.db.select().from(drizzleSchema.tags)
const allLinks = () => database.db.select().from(drizzleSchema.articleTags)
const allAnnotations = () =>
  database.db.select().from(drizzleSchema.annotations)
const annotationById = (id: string) =>
  database.db
    .select()
    .from(drizzleSchema.annotations)
    .where(eq(drizzleSchema.annotations.id, id))
const articleById = (id: string) =>
  database.db
    .select()
    .from(drizzleSchema.articles)
    .where(eq(drizzleSchema.articles.id, id))
const allArticles = () => database.db.select().from(drizzleSchema.articles)
const allUploadJobs = () => database.db.select().from(drizzleSchema.uploadJobs)
const allEdges = () => database.db.select().from(drizzleSchema.citationEdges)

describe('the fixture', () => {
  it('gives both users rows, so the refusals below are not vacuous', async () => {
    // If this fails, every "A cannot touch B's row" assertion in this file
    // passes for the wrong reason.
    expect((await allTags()).map((row) => row.id).sort()).toEqual(
      [TAG_A, TAG_B].sort(),
    )
    const articles = await database.db.select().from(drizzleSchema.articles)
    expect(articles.map((row) => row.id).sort()).toEqual(
      [ARTICLE_A, ARTICLE_B].sort(),
    )
  })
})

describe('tags.create', () => {
  it('creates the tag under the caller, ignoring anything the client claims', async () => {
    await runAs('tags.create', CONTEXT_A, { id: NEW_TAG, name: 'attention' })

    const [created] = await database.db
      .select()
      .from(drizzleSchema.tags)
      .where(eq(drizzleSchema.tags.id, NEW_TAG))

    expect(created?.name).toBe('attention')
    // The owner came from the context. There is no argument that could have
    // set it to anything else — which is the point of the assertion.
    expect(created?.userId).toBe(USER_A)
  })

  it('trims the name and refuses one that is only whitespace', async () => {
    await runAs('tags.create', CONTEXT_A, { id: NEW_TAG, name: '  spaced  ' })
    const [created] = await database.db
      .select()
      .from(drizzleSchema.tags)
      .where(eq(drizzleSchema.tags.id, NEW_TAG))
    expect(created?.name).toBe('spaced')

    await expect(
      runAs('tags.create', CONTEXT_A, { id: OTHER_LINK, name: '   ' }),
    ).rejects.toThrow()
    expect(await allTags()).toHaveLength(3)
  })

  it('refuses to overwrite another user’s tag by reusing its id', async () => {
    // The reason `create` inserts rather than upserts: an upsert addressed by
    // primary key would rewrite B's tag — including its owner — from A's
    // session. B's tag must survive, unchanged.
    await expect(
      runAs('tags.create', CONTEXT_A, { id: TAG_B, name: 'stolen' }),
    ).rejects.toThrow()

    const [victim] = await database.db
      .select()
      .from(drizzleSchema.tags)
      .where(eq(drizzleSchema.tags.id, TAG_B))
    expect(victim?.userId).toBe(USER_B)
    expect(victim?.name).toBe(`tag of ${USER_B}`)
  })

  it('refuses a request with no session', async () => {
    await expect(
      runAs('tags.create', undefined, { id: NEW_TAG, name: 'anonymous' }),
    ).rejects.toThrow()
    expect(await allTags()).toHaveLength(2)
  })
})

describe('tags.delete', () => {
  it('deletes the caller’s own tag', async () => {
    await runAs('tags.delete', CONTEXT_A, { id: TAG_A })

    expect((await allTags()).map((row) => row.id)).toEqual([TAG_B])
  })

  it('refuses another user’s tag and leaves it in place', async () => {
    await expect(
      runAs('tags.delete', CONTEXT_A, { id: TAG_B }),
    ).rejects.toThrow()

    expect((await allTags()).map((row) => row.id).sort()).toEqual(
      [TAG_A, TAG_B].sort(),
    )
  })

  it('takes the tag’s applications with it, by cascade', async () => {
    await runAs('tags.attach', CONTEXT_A, {
      id: NEW_LINK,
      articleId: ARTICLE_A,
      tagId: TAG_A,
    })
    expect(await allLinks()).toHaveLength(1)

    await runAs('tags.delete', CONTEXT_A, { id: TAG_A })

    // Removed by the foreign key, not by a second write in the mutator.
    expect(await allLinks()).toEqual([])
  })
})

describe('tags.attach', () => {
  it('applies the caller’s tag to the caller’s article', async () => {
    await runAs('tags.attach', CONTEXT_A, {
      id: NEW_LINK,
      articleId: ARTICLE_A,
      tagId: TAG_A,
    })

    const links = await allLinks()
    expect(links).toHaveLength(1)
    expect(links[0]?.articleId).toBe(ARTICLE_A)
    expect(links[0]?.tagId).toBe(TAG_A)
  })

  it('is idempotent: attaching twice creates one row and does not throw', async () => {
    const args = { id: NEW_LINK, articleId: ARTICLE_A, tagId: TAG_A }
    await runAs('tags.attach', CONTEXT_A, args)

    // Zero re-runs a pending mutation on every rebase, so this is what actually
    // happens in the browser rather than a defensive hypothetical. A second
    // call with a *different* row id must also be absorbed, since a retry from
    // a fresh client would generate one.
    await runAs('tags.attach', CONTEXT_A, args)
    await runAs('tags.attach', CONTEXT_A, { ...args, id: OTHER_LINK })

    expect(await allLinks()).toHaveLength(1)
  })

  it('refuses another user’s article, even with the caller’s own tag', async () => {
    await expect(
      runAs('tags.attach', CONTEXT_A, {
        id: NEW_LINK,
        articleId: ARTICLE_B,
        tagId: TAG_A,
      }),
    ).rejects.toThrow()

    expect(await allLinks()).toEqual([])
  })

  it('refuses another user’s tag, even on the caller’s own article', async () => {
    // The mirror image, and the one an ownership check written for only the
    // article would miss: this would otherwise let A apply B's tag, leaking B's
    // tag name onto A's card.
    await expect(
      runAs('tags.attach', CONTEXT_A, {
        id: NEW_LINK,
        articleId: ARTICLE_A,
        tagId: TAG_B,
      }),
    ).rejects.toThrow()

    expect(await allLinks()).toEqual([])
  })

  it('lets each user tag their own article independently', async () => {
    await runAs('tags.attach', CONTEXT_A, {
      id: NEW_LINK,
      articleId: ARTICLE_A,
      tagId: TAG_A,
    })
    await runAs('tags.attach', CONTEXT_B, {
      id: OTHER_LINK,
      articleId: ARTICLE_B,
      tagId: TAG_B,
    })

    expect(await allLinks()).toHaveLength(2)
  })
})

describe('tags.detach', () => {
  beforeEach(async () => {
    await runAs('tags.attach', CONTEXT_A, {
      id: NEW_LINK,
      articleId: ARTICLE_A,
      tagId: TAG_A,
    })
  })

  it('removes the application but not the tag', async () => {
    await runAs('tags.detach', CONTEXT_A, {
      articleId: ARTICLE_A,
      tagId: TAG_A,
    })

    expect(await allLinks()).toEqual([])
    expect((await allTags()).map((row) => row.id).sort()).toEqual(
      [TAG_A, TAG_B].sort(),
    )
  })

  it('does nothing, and does not throw, when the tag is not applied', async () => {
    await runAs('tags.detach', CONTEXT_A, {
      articleId: ARTICLE_A,
      tagId: TAG_A,
    })
    await runAs('tags.detach', CONTEXT_A, {
      articleId: ARTICLE_A,
      tagId: TAG_A,
    })

    expect(await allLinks()).toEqual([])
  })

  it('refuses to unpick a pairing the caller does not own', async () => {
    await runAs('tags.attach', CONTEXT_B, {
      id: OTHER_LINK,
      articleId: ARTICLE_B,
      tagId: TAG_B,
    })

    await expect(
      runAs('tags.detach', CONTEXT_A, {
        articleId: ARTICLE_B,
        tagId: TAG_B,
      }),
    ).rejects.toThrow()

    expect(await allLinks()).toHaveLength(2)
  })
})

describe('articles.setStatus', () => {
  it('sets the status on the caller’s own article', async () => {
    await runAs('articles.setStatus', CONTEXT_A, {
      id: ARTICLE_A,
      status: 'reading',
    })

    const [article] = await articleById(ARTICLE_A)
    expect(article?.status).toBe('reading')
  })

  it('replaces the previous status rather than adding to it', async () => {
    // Mutual exclusivity, which the column provides for free. There is no
    // "clear the old one" write, and this is the assertion that says so.
    await runAs('articles.setStatus', CONTEXT_A, {
      id: ARTICLE_A,
      status: 'reading',
    })
    await runAs('articles.setStatus', CONTEXT_A, {
      id: ARTICLE_A,
      status: 'read',
    })

    const [article] = await articleById(ARTICLE_A)
    expect(article?.status).toBe('read')
  })

  it('touches no other article', async () => {
    await runAs('articles.setStatus', CONTEXT_A, {
      id: ARTICLE_A,
      status: 'read',
    })

    const [other] = await articleById(ARTICLE_B)
    expect(other?.status).toBe('pending')
  })

  it('refuses another user’s article and leaves its status alone', async () => {
    await expect(
      runAs('articles.setStatus', CONTEXT_A, {
        id: ARTICLE_B,
        status: 'read',
      }),
    ).rejects.toThrow()

    const [victim] = await articleById(ARTICLE_B)
    expect(victim?.status).toBe('pending')
  })

  it('refuses a status that is not one of the three', async () => {
    await expect(
      runAs('articles.setStatus', CONTEXT_A, {
        id: ARTICLE_A,
        status: 'finished',
      }),
    ).rejects.toThrow()

    const [article] = await articleById(ARTICLE_A)
    expect(article?.status).toBe('pending')
  })

  it('accepts the same status twice', async () => {
    // Rebase safety again: `update` to the value already there is a no-op that
    // must not become an error.
    await runAs('articles.setStatus', CONTEXT_B, {
      id: ARTICLE_B,
      status: 'reading',
    })
    await runAs('articles.setStatus', CONTEXT_B, {
      id: ARTICLE_B,
      status: 'reading',
    })

    const [article] = await articleById(ARTICLE_B)
    expect(article?.status).toBe('reading')
  })
})

describe('referenceReads.retry', () => {
  async function readsFailed() {
    for (const [articleId, userId] of [
      [ARTICLE_A, USER_A],
      [ARTICLE_B, USER_B],
    ] as const) {
      await database.db
        .insert(drizzleSchema.referenceReads)
        .values({ articleId, userId, status: 'failed' })
    }
  }
  const statusOf = async (articleId: string) =>
    (
      await database.db
        .select()
        .from(drizzleSchema.referenceReads)
        .where(eq(drizzleSchema.referenceReads.articleId, articleId))
    )[0]?.status

  it('queues the caller’s failed re-read again', async () => {
    await readsFailed()

    await runAs('referenceReads.retry', CONTEXT_A, { articleIds: [ARTICLE_A] })

    expect(await statusOf(ARTICLE_A)).toBe('queued')
  })

  it('refuses another user’s re-read and leaves it failed', async () => {
    await readsFailed()

    await expect(
      runAs('referenceReads.retry', CONTEXT_A, { articleIds: [ARTICLE_B] }),
    ).rejects.toThrow()

    expect(await statusOf(ARTICLE_B)).toBe('failed')
  })

  it('refuses an anonymous caller', async () => {
    await readsFailed()

    await expect(
      runAs('referenceReads.retry', undefined, { articleIds: [ARTICLE_A] }),
    ).rejects.toThrow()

    expect(await statusOf(ARTICLE_A)).toBe('failed')
  })

  it('leaves a re-read that is not failed as it was', async () => {
    await database.db
      .insert(drizzleSchema.referenceReads)
      .values({ articleId: ARTICLE_A, userId: USER_A, status: 'done' })

    await runAs('referenceReads.retry', CONTEXT_A, { articleIds: [ARTICLE_A] })

    expect(await statusOf(ARTICLE_A)).toBe('done')
  })
})

describe('articles.setReadingPosition', () => {
  it('stores the position on the caller’s own article, fraction and all', async () => {
    await runAs('articles.setReadingPosition', CONTEXT_A, {
      id: ARTICLE_A,
      page: 7,
      offset: 412.75,
    })

    const [article] = await articleById(ARTICLE_A)
    expect(article?.readingPage).toBe(7)
    expect(article?.readingOffset).toBe(412.75)
  })

  it('starts with no position', async () => {
    const [article] = await articleById(ARTICLE_A)
    expect(article?.readingPage).toBeNull()
    expect(article?.readingOffset).toBeNull()
  })

  it('leaves updated_at alone', async () => {
    // Saved every second a reader scrolls: were this to bump `updated_at`,
    // "recently updated" would mean "recently read".
    const [before] = await articleById(ARTICLE_A)

    await runAs('articles.setReadingPosition', CONTEXT_A, {
      id: ARTICLE_A,
      page: 2,
      offset: 10,
    })

    const [after] = await articleById(ARTICLE_A)
    expect(after?.readingPage).toBe(2)
    expect(after?.updatedAt.getTime()).toBe(before?.updatedAt.getTime())
  })

  it('refuses another user’s article and leaves its position alone', async () => {
    // Non-vacuous: B's position is really there to be overwritten.
    await runAs('articles.setReadingPosition', CONTEXT_B, {
      id: ARTICLE_B,
      page: 3,
      offset: 100,
    })

    await expect(
      runAs('articles.setReadingPosition', CONTEXT_A, {
        id: ARTICLE_B,
        page: 99,
        offset: 0,
      }),
    ).rejects.toThrow()

    const [victim] = await articleById(ARTICLE_B)
    expect(victim?.readingPage).toBe(3)
    expect(victim?.readingOffset).toBe(100)
  })

  it('refuses an anonymous caller', async () => {
    await expect(
      runAs('articles.setReadingPosition', undefined, {
        id: ARTICLE_A,
        page: 2,
        offset: 0,
      }),
    ).rejects.toThrow()

    const [article] = await articleById(ARTICLE_A)
    expect(article?.readingPage).toBeNull()
  })

  it('refuses a page below 1', async () => {
    await expect(
      runAs('articles.setReadingPosition', CONTEXT_A, {
        id: ARTICLE_A,
        page: 0,
        offset: 0,
      }),
    ).rejects.toThrow()

    const [article] = await articleById(ARTICLE_A)
    expect(article?.readingPage).toBeNull()
  })
})

describe('articles.setNotes', () => {
  it('writes notes on the caller’s own article', async () => {
    await runAs('articles.setNotes', CONTEXT_A, {
      id: ARTICLE_A,
      notes: 'the one everything else cites',
    })

    const [article] = await articleById(ARTICLE_A)
    expect(article?.notes).toBe('the one everything else cites')
  })

  it('replaces the whole value rather than appending', async () => {
    // One textarea, one column. Last write wins, which is what makes this safe
    // to re-run on rebase.
    await runAs('articles.setNotes', CONTEXT_A, { id: ARTICLE_A, notes: 'a' })
    await runAs('articles.setNotes', CONTEXT_A, { id: ARTICLE_A, notes: 'b' })

    const [article] = await articleById(ARTICLE_A)
    expect(article?.notes).toBe('b')
  })

  it('stores a cleared field as an empty string, not as null', async () => {
    // Clearing notes is a thing a reader does, and it must not produce a second
    // representation of "no notes" for the UI to have to tell apart.
    await runAs('articles.setNotes', CONTEXT_A, {
      id: ARTICLE_A,
      notes: 'something',
    })
    await runAs('articles.setNotes', CONTEXT_A, { id: ARTICLE_A, notes: '' })

    const [article] = await articleById(ARTICLE_A)
    expect(article?.notes).toBe('')
  })

  it('keeps whitespace, unlike a tag name', async () => {
    // Prose, mid-edit. Trimming would delete the newline the reader just typed
    // every time the debounce fired.
    await runAs('articles.setNotes', CONTEXT_A, {
      id: ARTICLE_A,
      notes: 'first line\n\nsecond paragraph  ',
    })

    const [article] = await articleById(ARTICLE_A)
    expect(article?.notes).toBe('first line\n\nsecond paragraph  ')
  })

  it('refuses another user’s article and leaves its notes alone', async () => {
    // The load-bearing one, and non-vacuous: B's article genuinely exists, so a
    // handler that wrote nothing at all would still fail this.
    await runAs('articles.setNotes', CONTEXT_B, {
      id: ARTICLE_B,
      notes: 'B wrote this',
    })

    await expect(
      runAs('articles.setNotes', CONTEXT_A, {
        id: ARTICLE_B,
        notes: 'A should not be able to write this',
      }),
    ).rejects.toThrow()

    const [victim] = await articleById(ARTICLE_B)
    expect(victim?.notes).toBe('B wrote this')
  })

  it('touches no other article', async () => {
    await runAs('articles.setNotes', CONTEXT_A, {
      id: ARTICLE_A,
      notes: 'mine',
    })

    const [other] = await articleById(ARTICLE_B)
    expect(other?.notes).toBeNull()
  })
})

describe('annotations.create', () => {
  const mark = {
    id: NEW_MARK,
    articleId: ARTICLE_A,
    type: 'highlight',
    pageIndex: 3,
    contents: 'the passage itself',
    payload: { color: '#ffd400', segmentRects: [{ x: 1, y: 2 }] },
  }

  it('stores the mark under the caller, with the payload it was given', async () => {
    await runAs('annotations.create', CONTEXT_A, mark)

    const [created] = await annotationById(NEW_MARK)

    expect(created).toMatchObject({
      articleId: ARTICLE_A,
      type: 'highlight',
      pageIndex: 3,
      contents: 'the passage itself',
    })
    expect(created?.payload).toEqual(mark.payload)
    // From the context. No argument could have set it to anything else.
    expect(created?.userId).toBe(USER_A)
  })

  it('refuses a mark on another user’s paper and writes nothing', async () => {
    // The load-bearing one, and non-vacuous: B's article genuinely exists and B
    // can be marked up, so a mutator that wrote nothing at all would still fail
    // the pairing below.
    await expect(
      runAs('annotations.create', CONTEXT_A, { ...mark, articleId: ARTICLE_B }),
    ).rejects.toThrow()
    expect(await allAnnotations()).toHaveLength(2)

    await runAs('annotations.create', CONTEXT_B, {
      ...mark,
      articleId: ARTICLE_B,
    })
    expect(await allAnnotations()).toHaveLength(3)
  })

  it('refuses to overwrite another user’s mark by reusing its id', async () => {
    // Why `create` inserts rather than upserts: an upsert addressed by primary
    // key would rewrite B's annotation — including its owner — from A's session.
    await expect(
      runAs('annotations.create', CONTEXT_A, { ...mark, id: MARK_B }),
    ).rejects.toThrow()

    const [victim] = await annotationById(MARK_B)
    expect(victim?.userId).toBe(USER_B)
    expect(victim?.contents).toBe(`mark of ${USER_B}`)
  })

  it('refuses a request with no session', async () => {
    await expect(runAs('annotations.create', undefined, mark)).rejects.toThrow()
    expect(await allAnnotations()).toHaveLength(2)
  })
})

describe('annotations.update', () => {
  it('replaces the caller’s own mark’s page, contents and payload', async () => {
    await runAs('annotations.update', CONTEXT_A, {
      id: MARK_A,
      pageIndex: 7,
      contents: 'reworded',
      payload: { color: '#000000' },
    })

    const [updated] = await annotationById(MARK_A)
    expect(updated).toMatchObject({ pageIndex: 7, contents: 'reworded' })
    expect(updated?.payload).toEqual({ color: '#000000' })
  })

  it('cannot change the type or move the mark to another paper', async () => {
    // Neither is in the mutator's schema, so both are dropped rather than
    // refused — and this is where that claim is worth proving, because what
    // matters is what is *stored* afterwards.
    await runAs('annotations.update', CONTEXT_A, {
      id: MARK_A,
      pageIndex: 1,
      contents: null,
      payload: {},
      type: 'ink',
      articleId: ARTICLE_B,
    })

    const [updated] = await annotationById(MARK_A)
    expect(updated?.type).toBe('highlight')
    expect(updated?.articleId).toBe(ARTICLE_A)
  })

  it('refuses another user’s mark and leaves it as it was', async () => {
    await expect(
      runAs('annotations.update', CONTEXT_A, {
        id: MARK_B,
        pageIndex: 99,
        contents: 'A should not be able to write this',
        payload: {},
      }),
    ).rejects.toThrow()

    const [victim] = await annotationById(MARK_B)
    expect(victim?.contents).toBe(`mark of ${USER_B}`)
    expect(victim?.pageIndex).toBe(0)
  })

  it('accepts the same write twice', async () => {
    // Rebase safety: Zero re-runs a pending mutation whenever it rebases onto
    // newly-arrived data, so writing the same object again must be a no-op
    // rather than an error.
    const args = {
      id: MARK_A,
      pageIndex: 2,
      contents: 'settled',
      payload: { color: '#ffd400' },
    }
    await runAs('annotations.update', CONTEXT_A, args)
    await runAs('annotations.update', CONTEXT_A, args)

    const [updated] = await annotationById(MARK_A)
    expect(updated?.contents).toBe('settled')
  })
})

describe('annotations.delete', () => {
  it('deletes the caller’s own mark', async () => {
    await runAs('annotations.delete', CONTEXT_A, { id: MARK_A })

    expect((await allAnnotations()).map((row) => row.id)).toEqual([MARK_B])
  })

  it('refuses another user’s mark and leaves it in place', async () => {
    await expect(
      runAs('annotations.delete', CONTEXT_A, { id: MARK_B }),
    ).rejects.toThrow()

    expect((await allAnnotations()).map((row) => row.id).sort()).toEqual(
      [MARK_A, MARK_B].sort(),
    )
  })
})

describe('articles.updateDetails', () => {
  /** A complete correction, against the fixture's own article. */
  const CORRECTION = {
    id: ARTICLE_A,
    title: 'Attention Is All You Need',
    authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
    publicationYear: 2017,
    venue: 'NeurIPS',
    doi: '10.5555/3295222.3295349',
  }

  it('writes the correction to the caller’s own article', async () => {
    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    const [article] = await articleById(ARTICLE_A)
    expect(article).toMatchObject({
      title: 'Attention Is All You Need',
      authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
      publicationYear: 2017,
      venue: 'NeurIPS',
      doi: '10.5555/3295222.3295349',
    })
  })

  it('leaves every column it does not name exactly as it was', async () => {
    // The guarantee the whole feature rests on. A correction is not a reason to
    // disturb where the reader had got to, what they had written, what the
    // extractor achieved, or where the PDF lives.
    await runAs('articles.setStatus', CONTEXT_A, {
      id: ARTICLE_A,
      status: 'reading',
    })
    await runAs('articles.setNotes', CONTEXT_A, {
      id: ARTICLE_A,
      notes: 'read the appendix first',
    })
    const [before] = await articleById(ARTICLE_A)

    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    const [after] = await articleById(ARTICLE_A)
    expect(after?.status).toBe('reading')
    expect(after?.notes).toBe('read the appendix first')
    expect(after?.extractionStatus).toBe(before?.extractionStatus)
    expect(after?.pdfObjectKey).toBe(before?.pdfObjectKey)
    expect(after?.userId).toBe(before?.userId)
  })

  it('stores a blanked venue and DOI as null in the column itself', async () => {
    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)
    await runAs('articles.updateDetails', CONTEXT_A, {
      ...CORRECTION,
      venue: '',
      doi: '  ',
    })

    const [article] = await articleById(ARTICLE_A)
    expect(article?.venue).toBeNull()
    expect(article?.doi).toBeNull()
  })

  it('accepts the same correction twice', async () => {
    // Rebase safety: Zero re-runs a pending mutation against newly-arrived
    // authoritative data, so writing the same values again must be a no-op
    // rather than an error.
    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)
    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    const [article] = await articleById(ARTICLE_A)
    expect(article?.title).toBe('Attention Is All You Need')
  })

  it('touches no other article', async () => {
    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    const [other] = await articleById(ARTICLE_B)
    expect(other?.title).toBe(`Paper for ${USER_B}`)
  })

  it('refuses another user’s article and leaves it untouched', async () => {
    const [before] = await articleById(ARTICLE_B)

    await expect(
      runAs('articles.updateDetails', CONTEXT_A, {
        ...CORRECTION,
        id: ARTICLE_B,
      }),
    ).rejects.toThrow()

    const [victim] = await articleById(ARTICLE_B)
    expect(victim).toEqual(before)
  })

  it('refuses an article with no authors, writing nothing', async () => {
    const [before] = await articleById(ARTICLE_A)

    await expect(
      runAs('articles.updateDetails', CONTEXT_A, {
        ...CORRECTION,
        authors: [],
      }),
    ).rejects.toThrow()

    const [article] = await articleById(ARTICLE_A)
    expect(article).toEqual(before)
  })

  /**
   * The other half of #11's third task: a correction is what resolves a failed
   * upload, and the job row is what the resolution removes.
   *
   * Seeded directly, because `upload_jobs` rows belong to the pipeline and have
   * no mutator. The id is the article's own — the pre-allocated id every
   * upload is stored under — so this is the shape `recordOutcome` really
   * leaves behind, including for a failure.
   */
  async function giveArticleAnUpload(
    articleId: string,
    userId: string,
    status: 'processing' | 'failed',
  ): Promise<void> {
    await database.db.insert(drizzleSchema.uploadJobs).values({
      id: articleId,
      userId,
      filename: 'paper.pdf',
      status,
      failureReason: status === 'failed' ? "couldn't find authors" : null,
      articleId,
      pdfObjectKey: `lit-tracker/${userId}/${articleId}/source.pdf`,
    })
  }

  it('retires the job row of a failed upload it has just corrected', async () => {
    await giveArticleAnUpload(ARTICLE_A, USER_A, 'failed')

    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    // The row is deleted rather than marked — the popup lists only uploads
    // still needing attention, and keeps no history of resolved ones.
    expect(await allUploadJobs()).toEqual([])
  })

  it('leaves the extraction status saying the extraction failed', async () => {
    // The column records what extraction achieved, which is still true: the
    // metadata really did have to be typed in by hand. What stops being true
    // is that somebody needs to act, and that was the job row.
    await database.db
      .update(drizzleSchema.articles)
      .set({ extractionStatus: 'failed' })
      .where(eq(drizzleSchema.articles.id, ARTICLE_A))
    await giveArticleAnUpload(ARTICLE_A, USER_A, 'failed')

    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    const [article] = await articleById(ARTICLE_A)
    expect(article?.extractionStatus).toBe('failed')
  })

  it('leaves a still-processing upload’s job row in place', async () => {
    // Correcting a title while extraction is still running does not make the
    // upload resolved, and the row is the only thing that would say so.
    await giveArticleAnUpload(ARTICLE_A, USER_A, 'processing')

    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    const jobs = await allUploadJobs()
    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.status).toBe('processing')
  })

  it('cannot retire another user’s job row', async () => {
    // Both readers have a failed upload. A's correction must reach exactly one
    // of them, and the filter that decides which is the owner check — not the
    // article id, which a caller supplies.
    await giveArticleAnUpload(ARTICLE_A, USER_A, 'failed')
    await giveArticleAnUpload(ARTICLE_B, USER_B, 'failed')

    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    const jobs = await allUploadJobs()
    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.userId).toBe(USER_B)
  })

  it('is still safe to run twice once the job has gone', async () => {
    // Rebase safety again, now that the mutation has a second effect: the
    // repeat finds no failed row and does nothing, rather than throwing.
    await giveArticleAnUpload(ARTICLE_A, USER_A, 'failed')

    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)
    await runAs('articles.updateDetails', CONTEXT_A, CORRECTION)

    expect(await allUploadJobs()).toEqual([])
    const [article] = await articleById(ARTICLE_A)
    expect(article?.title).toBe('Attention Is All You Need')
  })
})

describe('articles.delete', () => {
  /**
   * Everything an article can have hanging off it, for the one test that has to
   * prove all of it goes.
   *
   * Written directly rather than through mutators because half of it has no
   * mutator — `upload_jobs` rows are the pipeline's, and citation edges are
   * extraction's. What this fixture is for is the *cascade*, which belongs to
   * the schema whichever code path created the row.
   */
  async function giveArticleAEverything(): Promise<void> {
    await database.db.insert(drizzleSchema.articleTags).values({
      id: NEW_LINK,
      articleId: ARTICLE_A,
      tagId: TAG_A,
    })
    await database.db.insert(drizzleSchema.uploadJobs).values({
      id: ARTICLE_A,
      userId: USER_A,
      filename: 'paper.pdf',
      status: 'failed',
      failureReason: "couldn't find authors",
      articleId: ARTICLE_A,
      pdfObjectKey: `lit-tracker/${USER_A}/${ARTICLE_A}/source.pdf`,
    })
    // A second paper of A's, so there is an edge pointing *at* the article
    // being deleted from somewhere that is not itself deleted.
    await database.db.insert(drizzleSchema.articles).values({
      id: SECOND_ARTICLE_A,
      userId: USER_A,
      title: 'A paper that cites the first',
      authors: [{ name: 'Ada Lovelace' }],
      pdfObjectKey: `lit-tracker/${USER_A}/${SECOND_ARTICLE_A}/source.pdf`,
    })
    await database.db.insert(drizzleSchema.citationEdges).values([
      {
        id: EDGE_FROM_A,
        userId: USER_A,
        citingArticleId: ARTICLE_A,
        title: 'Something the deleted paper cites',
        authors: [{ name: 'Grace Hopper' }],
      },
      {
        id: EDGE_TO_A,
        userId: USER_A,
        citingArticleId: SECOND_ARTICLE_A,
        citedArticleId: ARTICLE_A,
        title: `Paper for ${USER_A}`,
        authors: [{ name: 'Ada Lovelace' }],
      },
    ])
  }

  it('removes the article and everything that was only about it', async () => {
    await giveArticleAEverything()

    await runAs('articles.delete', CONTEXT_A, { id: ARTICLE_A })

    expect(await articleById(ARTICLE_A)).toEqual([])
    // Each of these is a separate `ON DELETE CASCADE`, and none of them is
    // written by the mutator — which is the point. A mutator deleting them by
    // hand would be four more windows for a half-deleted article to exist in.
    expect(await annotationById(MARK_A)).toEqual([])
    expect((await allLinks()).map((link) => link.id)).not.toContain(NEW_LINK)
    expect(await allUploadJobs()).toEqual([])
    expect((await allEdges()).map((edge) => edge.id)).not.toContain(EDGE_FROM_A)
  })

  it('clears a failed upload’s job row, which is how its warning goes away', async () => {
    // The reason this task and #11's third are the same feature: a failed
    // extraction still produced an article, and its `upload_jobs` row is what
    // keeps reporting the failure. Deleting the article takes the warning with
    // it, free, by the FK.
    await giveArticleAEverything()

    await runAs('articles.delete', CONTEXT_A, { id: ARTICLE_A })

    expect(await allUploadJobs()).toEqual([])
  })

  it('leaves a citing paper’s bibliography entry standing, unresolved', async () => {
    // `cited_article_id` is `set null`, not cascade, and the difference is a
    // decision rather than an oversight: the other paper still cited this work.
    // Erasing the entry would rewrite a bibliography that really exists.
    await giveArticleAEverything()

    await runAs('articles.delete', CONTEXT_A, { id: ARTICLE_A })

    const [edge] = (await allEdges()).filter((row) => row.id === EDGE_TO_A)
    expect(edge).toBeDefined()
    expect(edge?.citedArticleId).toBeNull()
    expect(edge?.title).toBe(`Paper for ${USER_A}`)
  })

  it('refuses another user’s article and leaves all of it standing', async () => {
    await database.db.insert(drizzleSchema.articleTags).values({
      id: NEW_LINK_B,
      articleId: ARTICLE_B,
      tagId: TAG_B,
    })
    const [before] = await articleById(ARTICLE_B)

    await expect(
      runAs('articles.delete', CONTEXT_A, { id: ARTICLE_B }),
    ).rejects.toThrow()

    const [victim] = await articleById(ARTICLE_B)
    expect(victim).toEqual(before)
    // The refusal rolls back, so what hangs off it is untouched too — which is
    // the half that a check-then-delete written in the wrong order would fail.
    expect(await annotationById(MARK_B)).toHaveLength(1)
    expect((await allLinks()).map((link) => link.id)).toContain(NEW_LINK_B)
  })

  it('refuses an article that does not exist, rather than succeeding quietly', async () => {
    // "No such row" and "not yours" are deliberately one answer: telling them
    // apart would confirm that a given id exists in somebody else's collection.
    await expect(
      runAs('articles.delete', CONTEXT_A, {
        id: '0199a1b2-c3d4-7e5f-8a9b-00000000dead',
      }),
    ).rejects.toThrow()
  })

  it('refuses a request carrying no session', async () => {
    await expect(
      runAs('articles.delete', undefined, { id: ARTICLE_A }),
    ).rejects.toThrow()

    expect(await articleById(ARTICLE_A)).toHaveLength(1)
  })

  it('leaves the other user’s collection alone', async () => {
    await runAs('articles.delete', CONTEXT_A, { id: ARTICLE_A })

    expect((await allArticles()).map((article) => article.id)).toEqual([
      ARTICLE_B,
    ])
    expect(await annotationById(MARK_B)).toHaveLength(1)
    expect(await allTags()).toHaveLength(2)
  })
})

describe('the registry', () => {
  it('throws on a mutator name it does not hold', async () => {
    // What stops an invented name from being a silent no-op. `/mutate` relies
    // on this rather than checking the name itself.
    await expect(
      runAs('tags.rename', CONTEXT_A, { id: TAG_A, name: 'nope' }),
    ).rejects.toThrow()
  })
})
