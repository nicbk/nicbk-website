import { zeroDrizzle } from '@rocicorp/zero/server/adapters/drizzle'
import { eq, sql } from 'drizzle-orm'
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
import { queries } from './queries'
import { schema, zql } from './schema.gen'

/**
 * Integration coverage for the sync foundation: real Postgres
 * (Testcontainers), the real committed migrations, and the real query
 * definitions run through Zero's own server-side ZQL.
 *
 * What this proves that no unit test can: with two users' rows genuinely in the
 * database, a query resolved under one user's context returns that user's rows
 * and nothing else. Zero has no permissions layer behind `/query`, so this is
 * the whole of read authorization for user-owned data on this site — and a
 * filter can only really be shown to work against data it has to exclude.
 *
 * The isolation tests are deliberately written so that a handler returning
 * nothing at all would fail them: every one that asserts "user B's rows do not
 * appear" is paired with an assertion that they exist and are reachable.
 */

const USER_A = 'user-a-integration'
const USER_B = 'user-b-integration'

const CONTEXT_A: ZeroContext = { id: USER_A }
const CONTEXT_B: ZeroContext = { id: USER_B }

/** Fixed ids so a test can name one user's row while asking as the other. */
const ARTICLE_A = '0199a1b2-c3d4-7e5f-8a9b-000000000a01'
const ARTICLE_B = '0199a1b2-c3d4-7e5f-8a9b-000000000b01'
const TAG_A = '0199a1b2-c3d4-7e5f-8a9b-000000000a02'
const TAG_B = '0199a1b2-c3d4-7e5f-8a9b-000000000b02'

let testDatabase: TestDatabase
let database: DatabaseHandle
let zero: ReturnType<typeof zeroDrizzle<typeof schema, typeof database.db>>

beforeAll(async () => {
  testDatabase = await startTestDatabase()
  // Pulling and starting Postgres, then migrating, can take a while on a cold
  // Docker cache.
}, 180_000)

afterAll(async () => {
  await testDatabase.stop()
})

beforeEach(async () => {
  // Back to a migrated-but-empty database. The pool must be opened after the
  // restore — it drops and recreates the database underneath any open
  // connection (see test-database.ts).
  await testDatabase.reset()
  database = createDatabase(testDatabase.connectionString)
  zero = zeroDrizzle(schema, database.db)
})

afterEach(async () => {
  // Closed before the next reset drops the database out from under it, which
  // would otherwise surface as an uncaught "terminating connection" error.
  await database.pool.end()
})

/** Creates the identity row every user-owned table hangs off. */
async function createUser(id: string): Promise<void> {
  await database.db.insert(drizzleSchema.user).values({
    id,
    name: `Reader ${id}`,
    email: `${id}@example.com`,
    emailVerified: true,
  })
}

async function createArticle(
  id: string,
  userId: string,
  overrides: Partial<typeof drizzleSchema.articles.$inferInsert> = {},
): Promise<void> {
  await database.db.insert(drizzleSchema.articles).values({
    id,
    userId,
    title: `Paper ${id}`,
    authors: [{ name: 'Ada Lovelace', given: 'Ada', family: 'Lovelace' }],
    pdfObjectKey: `lit-tracker/${userId}/${id}/source.pdf`,
    ...overrides,
  })
}

async function createTag(
  id: string,
  userId: string,
  name = `tag-${id.slice(-4)}`,
): Promise<void> {
  await database.db.insert(drizzleSchema.tags).values({ id, userId, name })
}

/**
 * Applies a tag to an article, writing the join row directly.
 *
 * The join row's own id is incidental — nothing reads one back by id — so it
 * comes from a counter rather than from another pair of named constants.
 */
let nextArticleTagId = 0
async function applyTag(articleId: string, tagId: string): Promise<void> {
  nextArticleTagId += 1
  await database.db.insert(drizzleSchema.articleTags).values({
    id: `0199a1b2-c3d4-7e5f-8a9b-${String(nextArticleTagId).padStart(12, '0')}`,
    articleId,
    tagId,
  })
}

/** Returns the new job's id, which is also the future article's id. */
async function createUploadJob(userId: string): Promise<string> {
  const [row] = await database.db
    .insert(drizzleSchema.uploadJobs)
    .values({
      userId,
      filename: 'paper.pdf',
      // The real upload path writes the object under the row's own id; nothing
      // here depends on the two agreeing, so a placeholder is honest.
      pdfObjectKey: `lit-tracker/${userId}/pending/source.pdf`,
    })
    .returning({ id: drizzleSchema.uploadJobs.id })
  if (!row) {
    throw new Error('insert returned no row')
  }
  return row.id
}

/** Runs a query definition against Postgres exactly as the endpoint builds it. */
async function runAs<Args>(
  query: {
    fn: (input: { args: Args; ctx: ZeroContext | undefined }) => unknown
  },
  ctx: ZeroContext | undefined,
  args: Args,
): Promise<{ id: string }[]> {
  return zero.transaction(async (tx) =>
    tx.run(query.fn({ args, ctx }) as never),
  ) as Promise<{ id: string }[]>
}

/**
 * `articles.mine` with its ownership filter taken away — the mistake the
 * isolation tests exist to catch, kept here so one test can prove it would be
 * caught.
 */
const unscopedArticles = zql.articles

/** Both users, each with one article, one upload job, and one applied tag. */
async function seedTwoUsers(): Promise<void> {
  await createUser(USER_A)
  await createUser(USER_B)
  await createArticle(ARTICLE_A, USER_A)
  await createArticle(ARTICLE_B, USER_B)
  await createUploadJob(USER_A)
  await createUploadJob(USER_B)
  await createTag(TAG_A, USER_A)
  await createTag(TAG_B, USER_B)
  await applyTag(ARTICLE_A, TAG_A)
  await applyTag(ARTICLE_B, TAG_B)
}

describe('the committed migrations', () => {
  it('create the trigram extension the author index needs', async () => {
    const { rows } = await database.pool.query(
      `select 1 from pg_extension where extname = 'pg_trgm'`,
    )

    expect(rows).toHaveLength(1)
  })

  it('create the indexes these tables are queried through', async () => {
    const { rows } = await database.pool.query<{ indexname: string }>(
      `select indexname from pg_indexes
       where tablename in ('articles', 'upload_jobs', 'tags', 'article_tags')`,
    )
    const names = rows.map((row) => row.indexname)

    expect(names).toContain('articles_authors_search_trgm_idx')
    expect(names).toContain('articles_user_id_idx')
    expect(names).toContain('upload_jobs_user_id_idx')
    expect(names).toContain('tags_user_id_idx')
    // The other direction of the join. Postgres indexes the unique constraint's
    // `(article_id, tag_id)` for free but not the trailing column on its own.
    expect(names).toContain('article_tags_tag_id_idx')
  })

  it('constrain a tag to one application per article', async () => {
    await createUser(USER_A)
    await createArticle(ARTICLE_A, USER_A)
    await createTag(TAG_A, USER_A)
    await applyTag(ARTICLE_A, TAG_A)

    // The backstop under the mutator's own idempotence check: two clients can
    // attach the same tag at once and neither read will have seen the other.
    await expect(applyTag(ARTICLE_A, TAG_A)).rejects.toThrow()
  })

  it('cascade every foreign key on the tag tables', async () => {
    const { rows } = await database.pool.query<{
      table_name: string
      column_name: string
      delete_rule: string
    }>(
      `select tc.table_name, kcu.column_name, rc.delete_rule
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on kcu.constraint_name = tc.constraint_name
       join information_schema.referential_constraints rc
         on rc.constraint_name = tc.constraint_name
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_name in ('tags', 'article_tags')
       order by tc.table_name, kcu.column_name`,
    )

    // All three are ownership relationships, so all three cascade — the
    // convention in zero-schema-conventions.md, asserted rather than assumed
    // because a `no action` here would strand rows the app can never reach.
    expect(rows).toEqual([
      {
        table_name: 'article_tags',
        column_name: 'article_id',
        delete_rule: 'CASCADE',
      },
      {
        table_name: 'article_tags',
        column_name: 'tag_id',
        delete_rule: 'CASCADE',
      },
      { table_name: 'tags', column_name: 'user_id', delete_rule: 'CASCADE' },
    ])
  })

  it('publish only the lit-tracker tables to the sync engine', async () => {
    // The load-bearing part is what is *absent*: Better Auth's `session` and
    // `account` rows carry session tokens and Google OAuth access/refresh
    // tokens, and must never reach zero-cache's replica.
    const { rows } = await database.pool.query<{ tablename: string }>(
      `select tablename from pg_publication_tables
       where pubname = 'zero_data' order by tablename`,
    )

    expect(rows.map((row) => row.tablename)).toEqual([
      'article_tags',
      'articles',
      'citation_edges',
      'tags',
      'upload_jobs',
    ])
  })

  it('default an upload job id to a time-ordered uuid', async () => {
    await createUser(USER_A)

    const first = await createUploadJob(USER_A)
    const second = await createUploadJob(USER_A)

    // Version 7 puts the version nibble in the third group's first character,
    // and orders roughly by creation time — which is why it is used here
    // instead of a random v4.
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(second > first).toBe(true)
  })

  it('default a new article to pending and unextracted', async () => {
    await createUser(USER_A)
    await createArticle(ARTICLE_A, USER_A)

    const [article] = await database.db
      .select()
      .from(drizzleSchema.articles)
      .where(eq(drizzleSchema.articles.id, ARTICLE_A))

    expect(article?.status).toBe('pending')
    expect(article?.extractionStatus).toBe('pending')
  })

  it('default a new upload job to processing', async () => {
    await createUser(USER_A)
    const jobId = await createUploadJob(USER_A)

    const [job] = await database.db
      .select()
      .from(drizzleSchema.uploadJobs)
      .where(eq(drizzleSchema.uploadJobs.id, jobId))

    expect(job?.status).toBe('processing')
    expect(job?.failureReason).toBeNull()
    expect(job?.articleId).toBeNull()
  })
})

describe('the generated authors_search column', () => {
  it('is maintained by Postgres, not by the application', async () => {
    await createUser(USER_A)
    await createArticle(ARTICLE_A, USER_A, {
      authors: [{ name: 'Grace Hopper' }, { name: 'Ada Lovelace' }],
    })

    // Nothing above wrote this column. Reading it back through raw SQL rather
    // than Drizzle keeps the assertion about what the database did.
    const { rows } = await database.pool.query<{ authors_search: string }>(
      `select authors_search from articles where id = $1`,
      [ARTICLE_A],
    )

    expect(rows[0]?.authors_search).toContain('grace hopper')
    expect(rows[0]?.authors_search).toContain('ada lovelace')
  })
})

describe('cross-user isolation', () => {
  beforeEach(seedTwoUsers)

  it('has both users’ rows present, so the tests below are not vacuous', async () => {
    // If this fails, every "does not see the other user" assertion is worthless
    // — a query returning nothing at all would pass them all.
    const all = await database.db.select().from(drizzleSchema.articles)
    const jobs = await database.db.select().from(drizzleSchema.uploadJobs)

    expect(all.map((row) => row.id).sort()).toEqual(
      [ARTICLE_A, ARTICLE_B].sort(),
    )
    expect(jobs).toHaveLength(2)
  })

  it('returns only the requesting user’s articles', async () => {
    const forA = await runAs(queries.articles.mine, CONTEXT_A, undefined)
    const forB = await runAs(queries.articles.mine, CONTEXT_B, undefined)

    expect(forA.map((row) => row.id)).toEqual([ARTICLE_A])
    expect(forB.map((row) => row.id)).toEqual([ARTICLE_B])
  })

  it('returns only the requesting user’s upload jobs', async () => {
    const forA = await runAs(queries.uploadJobs.mine, CONTEXT_A, undefined)
    const forB = await runAs(queries.uploadJobs.mine, CONTEXT_B, undefined)

    expect(forA).toHaveLength(1)
    expect(forB).toHaveLength(1)
    expect(forA[0]?.id).not.toBe(forB[0]?.id)
  })

  it('returns only the requesting user’s tags', async () => {
    const forA = await runAs(queries.tags.mine, CONTEXT_A, undefined)
    const forB = await runAs(queries.tags.mine, CONTEXT_B, undefined)

    expect(forA.map((row) => row.id)).toEqual([TAG_A])
    expect(forB.map((row) => row.id)).toEqual([TAG_B])
  })

  it('returns only the requesting user’s applied tags', async () => {
    // `article_tags` has no owner column of its own, so this query filters
    // through the tag relationship. A new synced table is a new read surface
    // and gets its own isolation test rather than riding on `articles.mine`.
    const forA = await runAs(queries.articleTags.mine, CONTEXT_A, undefined)
    const forB = await runAs(queries.articleTags.mine, CONTEXT_B, undefined)

    expect(forA).toHaveLength(1)
    expect(forB).toHaveLength(1)
    expect(forA[0]?.id).not.toBe(forB[0]?.id)
  })

  it('returns nothing when the request carries no session', async () => {
    expect(await runAs(queries.articles.mine, undefined, undefined)).toEqual([])
    expect(await runAs(queries.uploadJobs.mine, undefined, undefined)).toEqual(
      [],
    )
    expect(await runAs(queries.tags.mine, undefined, undefined)).toEqual([])
    expect(await runAs(queries.articleTags.mine, undefined, undefined)).toEqual(
      [],
    )
  })

  it('returns nothing when the argument names another user’s row', async () => {
    // The client controls this argument. Naming a row that exists, and that the
    // other user can read, must still return nothing.
    const asA = await runAs(queries.articles.byId, CONTEXT_A, ARTICLE_B)
    const asB = await runAs(queries.articles.byId, CONTEXT_B, ARTICLE_B)

    expect(asA).toEqual([])
    expect(asB.map((row) => row.id)).toEqual([ARTICLE_B])
  })

  it('would return both users’ rows if the ownership filter were dropped', async () => {
    // Verifies the tests above measure the filter and not the fixture. This is
    // deliberately the broken version of `articles.mine` — the same query with
    // its `userId` condition removed — and it must see everything. If it did
    // not, "user A sees only A's rows" would pass for the wrong reason.
    const withoutOwnership = (await zero.transaction(async (tx) =>
      tx.run(unscopedArticles as never),
    )) as { id: string }[]

    expect(withoutOwnership.map((row) => row.id).sort()).toEqual(
      [ARTICLE_A, ARTICLE_B].sort(),
    )
  })
})

describe('ownership cascades', () => {
  beforeEach(seedTwoUsers)

  it('removes a deleted user’s articles, upload jobs, and tags', async () => {
    // The first real coverage of the cascade convention: account deletion has
    // to take the user's data with it, and a database-level cascade fires
    // however the row was deleted. `article_tags` has no `user_id` and so no
    // cascade from the user directly — it goes two hops, through both ends.
    await database.db
      .delete(drizzleSchema.user)
      .where(eq(drizzleSchema.user.id, USER_A))

    const articles = await database.db.select().from(drizzleSchema.articles)
    const jobs = await database.db.select().from(drizzleSchema.uploadJobs)
    const tags = await database.db.select().from(drizzleSchema.tags)
    const applied = await database.db.select().from(drizzleSchema.articleTags)

    expect(articles.map((row) => row.id)).toEqual([ARTICLE_B])
    expect(jobs.map((row) => row.userId)).toEqual([USER_B])
    expect(tags.map((row) => row.id)).toEqual([TAG_B])
    expect(applied.map((row) => row.tagId)).toEqual([TAG_B])
  })

  it('removes a deleted tag’s applications, leaving the articles alone', async () => {
    await database.db
      .delete(drizzleSchema.tags)
      .where(eq(drizzleSchema.tags.id, TAG_A))

    const applied = await database.db.select().from(drizzleSchema.articleTags)
    const articles = await database.db.select().from(drizzleSchema.articles)

    // This cascade is what lets the delete-tag mutator be a single write: it
    // does not have to find and remove the applications itself.
    expect(applied.map((row) => row.tagId)).toEqual([TAG_B])
    expect(articles.map((row) => row.id).sort()).toEqual(
      [ARTICLE_A, ARTICLE_B].sort(),
    )
  })

  it('removes a deleted article’s applications, leaving the tags alone', async () => {
    await database.db
      .delete(drizzleSchema.articles)
      .where(eq(drizzleSchema.articles.id, ARTICLE_A))

    const applied = await database.db.select().from(drizzleSchema.articleTags)
    const tags = await database.db.select().from(drizzleSchema.tags)

    // A tag outlives the articles it was applied to — it is a label the user
    // made, not a property of one paper.
    expect(applied.map((row) => row.articleId)).toEqual([ARTICLE_B])
    expect(tags.map((row) => row.id).sort()).toEqual([TAG_A, TAG_B].sort())
  })

  it('removes a job when the article it tracks is deleted', async () => {
    const jobId = await createUploadJob(USER_A)
    await database.db
      .update(drizzleSchema.uploadJobs)
      .set({ articleId: ARTICLE_A })
      .where(eq(drizzleSchema.uploadJobs.id, jobId))

    await database.db
      .delete(drizzleSchema.articles)
      .where(eq(drizzleSchema.articles.id, ARTICLE_A))

    const remaining = await database.db
      .select()
      .from(drizzleSchema.uploadJobs)
      .where(eq(drizzleSchema.uploadJobs.id, jobId))

    expect(remaining).toEqual([])
  })

  it('refuses an article that belongs to no one', async () => {
    // The ownership column is what every query filters on, so a row without a
    // real owner would be invisible to `/query` and unreachable forever.
    await expect(
      database.db.execute(
        sql`insert into articles (id, user_id, title, authors, pdf_object_key)
            values (${ARTICLE_A}, 'no-such-user', 'Orphan', '[]'::jsonb, 'k')`,
      ),
    ).rejects.toThrow()
  })
})

/**
 * There is deliberately no end-to-end `/mutate` *request* test here or in
 * `mutators.integration.test.ts`. Pushing a mutation writes to zero-cache's own
 * `zero_0.clients` bookkeeping table before it looks up the mutator, and that
 * schema is created by zero-cache at startup, not by this project's migrations —
 * so a Testcontainers database migrated from the committed SQL cannot serve one.
 *
 * The three layers that answer for it instead: what the endpoint decides on its
 * own (a wrong key is 403, a missing session is 401, and neither opens a
 * transaction) is `mutate-endpoint.test.ts`; what the mutators decide, run
 * through the endpoint's exact dispatch call against real Postgres, is
 * `mutators.integration.test.ts`; and the live path through a real zero-cache is
 * the signed-in Playwright suite plus the Compose walkthrough in the task's
 * status.md.
 */

describe('updated_at', () => {
  it('moves when a row is written through Drizzle', async () => {
    // Maintained by the schema's `$onUpdate`, not by every call site
    // remembering to set it.
    await createUser(USER_A)
    await createArticle(ARTICLE_A, USER_A)
    const [before] = await database.db
      .select()
      .from(drizzleSchema.articles)
      .where(eq(drizzleSchema.articles.id, ARTICLE_A))

    await database.db
      .update(drizzleSchema.articles)
      .set({ status: 'reading' })
      .where(eq(drizzleSchema.articles.id, ARTICLE_A))

    const [after] = await database.db
      .select()
      .from(drizzleSchema.articles)
      .where(eq(drizzleSchema.articles.id, ARTICLE_A))

    expect(after?.status).toBe('reading')
    expect(after?.updatedAt.getTime()).toBeGreaterThan(
      before?.updatedAt.getTime() ?? 0,
    )
    expect(after?.createdAt.getTime()).toBe(before?.createdAt.getTime())
  })
})
