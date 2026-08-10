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

/** Ids for rows a test creates, rather than ones the fixture seeded. */
const NEW_TAG = '0199a1b2-c3d4-7e5f-8a9b-00000000c001'
const NEW_LINK = '0199a1b2-c3d4-7e5f-8a9b-00000000c002'
const OTHER_LINK = '0199a1b2-c3d4-7e5f-8a9b-00000000c003'

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
  for (const [userId, articleId, tagId] of [
    [USER_A, ARTICLE_A, TAG_A],
    [USER_B, ARTICLE_B, TAG_B],
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
  }
}

const allTags = () => database.db.select().from(drizzleSchema.tags)
const allLinks = () => database.db.select().from(drizzleSchema.articleTags)
const articleById = (id: string) =>
  database.db
    .select()
    .from(drizzleSchema.articles)
    .where(eq(drizzleSchema.articles.id, id))

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

describe('the registry', () => {
  it('throws on a mutator name it does not hold', async () => {
    // What stops an invented name from being a silent no-op. `/mutate` relies
    // on this rather than checking the name itself.
    await expect(
      runAs('tags.rename', CONTEXT_A, { id: TAG_A, name: 'nope' }),
    ).rejects.toThrow()
  })
})
