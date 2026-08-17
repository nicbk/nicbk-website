import { describe, expect, it } from 'vitest'
import type { ZeroContext } from './context'
import { mutators } from './mutators'

/**
 * What each mutator refuses **before it writes anything**.
 *
 * The integration suite proves the same mutators against real Postgres, and it
 * is the authority on authorization. This tier answers a narrower question that
 * does not need a database: given arguments that should never have been
 * accepted, does the mutator reject them without having already written? Zero
 * validates inside `fn`, so the way to ask is to hand it a transaction that
 * records every write and then assert nothing was recorded.
 *
 * That distinction matters because a mutator that writes first and validates
 * afterwards still *fails* — the transaction rolls back — but it fails at the
 * database rather than at the boundary, and every such write is a chance for a
 * constraint error to be the thing the user sees instead of a clear refusal.
 */

const CONTEXT: ZeroContext = { id: 'reader-1' }

const ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-000000000001'
const TAG = '0199a1b2-c3d4-7e5f-8a9b-000000000002'
const LINK = '0199a1b2-c3d4-7e5f-8a9b-000000000003'
const MARK = '0199a1b2-c3d4-7e5f-8a9b-000000000004'

interface RecordedWrite {
  table: string
  operation: string
}

/**
 * A transaction that writes nowhere and remembers being asked to.
 *
 * `reads` answers the mutator's lookups **in the order it makes them**, one
 * entry per `tx.run`, where `true` means "a row came back". That ordering is
 * what lets a test distinguish the two ways a lookup can come up empty — the
 * ownership check finding nothing, and the already-applied check finding
 * nothing — which a single "does the database have rows" switch cannot express.
 * `attach` and `detach` both read three times: article, tag, then the link.
 *
 * Omitting `reads` answers every lookup with a row, which is the ordinary case.
 */
function stubTransaction({ reads }: { reads?: boolean[] } = {}) {
  const writes: RecordedWrite[] = []
  let readCount = 0

  const table = (name: string) => ({
    insert: async () => void writes.push({ table: name, operation: 'insert' }),
    update: async () => void writes.push({ table: name, operation: 'update' }),
    upsert: async () => void writes.push({ table: name, operation: 'upsert' }),
    delete: async () => void writes.push({ table: name, operation: 'delete' }),
  })

  const tx = {
    run: async () => {
      const found = reads ? reads[readCount] === true : true
      readCount += 1
      return found ? [{ id: 'a-row' }] : []
    },
    mutate: {
      tags: table('tags'),
      articleTags: table('articleTags'),
      articles: table('articles'),
      annotations: table('annotations'),
    },
  }

  return { tx, writes }
}

/** Calls a mutator the way the endpoint does, with the stub standing in. */
async function run(
  mutator: { fn: (input: never) => Promise<void> },
  args: unknown,
  options: { reads?: boolean[] } = {},
): Promise<RecordedWrite[]> {
  const { tx, writes } = stubTransaction(options)
  await mutator.fn({ args, tx, ctx: CONTEXT } as never)
  return writes
}

describe('tags.create', () => {
  it('accepts a well-formed tag and writes exactly one row', async () => {
    const writes = await run(mutators.tags.create, {
      id: TAG,
      name: 'attention',
    })

    expect(writes).toEqual([{ table: 'tags', operation: 'insert' }])
  })

  it.each([
    ['an id that is not a uuid', { id: 'tag-1', name: 'attention' }],
    ['an empty name', { id: TAG, name: '' }],
    ['a name of only whitespace', { id: TAG, name: '   ' }],
    ['a name past the length bound', { id: TAG, name: 'x'.repeat(65) }],
    ['a missing name', { id: TAG }],
    ['a name that is not a string', { id: TAG, name: 42 }],
  ])('refuses %s without writing', async (_case, args) => {
    const { tx, writes } = stubTransaction()

    await expect(
      mutators.tags.create.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })

  it('refuses a request with no session, before validating anything', async () => {
    const { tx, writes } = stubTransaction()

    await expect(
      mutators.tags.create.fn({
        args: { id: TAG, name: 'attention' },
        tx,
        ctx: undefined,
      } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })
})

describe('tags.delete', () => {
  it('deletes when the tag is the caller’s', async () => {
    const writes = await run(mutators.tags.delete, { id: TAG })

    expect(writes).toEqual([{ table: 'tags', operation: 'delete' }])
  })

  it('writes nothing when the ownership check finds no row', async () => {
    const { tx, writes } = stubTransaction({ reads: [false] })

    await expect(
      mutators.tags.delete.fn({ args: { id: TAG }, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })
})

describe('tags.attach', () => {
  const args = { id: LINK, articleId: ARTICLE, tagId: TAG }

  it('inserts the join row when the tag is not yet applied', async () => {
    // Article found, tag found, no existing link.
    const writes = await run(mutators.tags.attach, args, {
      reads: [true, true, false],
    })

    expect(writes).toEqual([{ table: 'articleTags', operation: 'insert' }])
  })

  it('does not insert a second row when the tag is already applied', async () => {
    // Same three lookups, but the link is there — the idempotent path Zero
    // takes every time it rebases a pending attach.
    const writes = await run(mutators.tags.attach, args, {
      reads: [true, true, true],
    })

    expect(writes).toEqual([])
  })

  it('writes nothing when the article is not the caller’s', async () => {
    const { tx, writes } = stubTransaction({ reads: [false] })

    await expect(
      mutators.tags.attach.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })

  it('writes nothing when the tag is not the caller’s', async () => {
    // The article checks out and the tag does not — the second guard, which a
    // mutator checking only the article would let through.
    const { tx, writes } = stubTransaction({ reads: [true, false] })

    await expect(
      mutators.tags.attach.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })

  it.each([
    ['a malformed article id', { id: LINK, articleId: 'a', tagId: TAG }],
    ['a malformed tag id', { id: LINK, articleId: ARTICLE, tagId: 't' }],
    ['a missing row id', { articleId: ARTICLE, tagId: TAG }],
  ])('refuses %s without writing', async (_case, args) => {
    const { tx, writes } = stubTransaction()

    await expect(
      mutators.tags.attach.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })
})

describe('tags.detach', () => {
  const args = { articleId: ARTICLE, tagId: TAG }

  it('deletes the join row when the tag is applied', async () => {
    const writes = await run(mutators.tags.detach, args, {
      reads: [true, true, true],
    })

    expect(writes).toEqual([{ table: 'articleTags', operation: 'delete' }])
  })

  it('returns quietly when the tag is not applied', async () => {
    // Both ends are the caller's; there is simply no link to remove. This is
    // the rebase-replay case — the write already landed, so running it again
    // must be a no-op rather than an error the reader is shown.
    const writes = await run(mutators.tags.detach, args, {
      reads: [true, true, false],
    })

    expect(writes).toEqual([])
  })

  it('refuses when the pairing is not the caller’s, rather than returning quietly', async () => {
    // The distinction the test above exists beside: "nothing to do" and "not
    // yours" both write nothing, and only one of them is allowed to be silent.
    const { tx, writes } = stubTransaction({ reads: [false] })

    await expect(
      mutators.tags.detach.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })
})

describe('annotations.create', () => {
  const args = {
    id: MARK,
    articleId: ARTICLE,
    type: 'highlight',
    pageIndex: 3,
    contents: 'the passage itself',
    payload: { rect: { origin: { x: 1, y: 2 } }, color: '#ffd400' },
  }

  it('accepts a well-formed mark and writes exactly one row', async () => {
    expect(await run(mutators.annotations.create, args)).toEqual([
      { table: 'annotations', operation: 'insert' },
    ])
  })

  it('accepts a mark with nothing written on it', async () => {
    // A shape or an ink stroke has no contents, which is expected rather than
    // invalid — the column is nullable for exactly this.
    expect(
      await run(mutators.annotations.create, { ...args, contents: null }),
    ).toEqual([{ table: 'annotations', operation: 'insert' }])
  })

  it.each([
    ['an id that is not a uuid', { ...args, id: 'mark-1' }],
    ['a type outside the twelve', { ...args, type: 'stamp' }],
    ['a type in the wrong case', { ...args, type: 'Highlight' }],
    ['a negative page index', { ...args, pageIndex: -1 }],
    ['a fractional page index', { ...args, pageIndex: 1.5 }],
    ['a malformed article id', { ...args, articleId: 'article-1' }],
    ['a payload that is not an object', { ...args, payload: 'rect' }],
    ['a missing payload', { ...args, payload: undefined }],
    // The payload is stored as `jsonb` and travels through Zero, neither of
    // which can carry anything else — so a value that is not JSON is refused at
    // the boundary rather than lost somewhere past it.
    [
      'a payload holding something that is not JSON',
      {
        ...args,
        payload: { rect: () => 'nope' },
      },
    ],
  ])('refuses %s without writing', async (_case, args) => {
    const { tx, writes } = stubTransaction()

    await expect(
      mutators.annotations.create.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })

  it('writes nothing when the article is not the caller’s', async () => {
    const { tx, writes } = stubTransaction({ reads: [false] })

    await expect(
      mutators.annotations.create.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })

  it('refuses a request with no session, before validating anything', async () => {
    const { tx, writes } = stubTransaction()

    await expect(
      mutators.annotations.create.fn({ args, tx, ctx: undefined } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })
})

describe('annotations.update', () => {
  const args = {
    id: MARK,
    pageIndex: 3,
    contents: null,
    payload: { rect: { origin: { x: 1, y: 2 } } },
  }

  it('updates when the mark is the caller’s', async () => {
    expect(await run(mutators.annotations.update, args)).toEqual([
      { table: 'annotations', operation: 'update' },
    ])
  })

  it('writes nothing when the ownership check finds no row', async () => {
    const { tx, writes } = stubTransaction({ reads: [false] })

    await expect(
      mutators.annotations.update.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })

  it('ignores a request to change the type or the article', async () => {
    // A highlight does not become an ink stroke, and a mark does not move to
    // another paper. Neither is in this mutator's schema, so both are dropped
    // before the body runs rather than refused — the write still happens, and
    // still touches only the three columns the mutator names. What is *stored*
    // after such a request is asserted against real Postgres in
    // `mutators.integration.test.ts`, which is where that claim belongs.
    const writes = await run(mutators.annotations.update, {
      ...args,
      type: 'ink',
      articleId: ARTICLE,
    })

    expect(writes).toEqual([{ table: 'annotations', operation: 'update' }])
  })
})

describe('annotations.delete', () => {
  it('deletes when the mark is the caller’s', async () => {
    expect(await run(mutators.annotations.delete, { id: MARK })).toEqual([
      { table: 'annotations', operation: 'delete' },
    ])
  })

  it('writes nothing when the ownership check finds no row', async () => {
    const { tx, writes } = stubTransaction({ reads: [false] })

    await expect(
      mutators.annotations.delete.fn({
        args: { id: MARK },
        tx,
        ctx: CONTEXT,
      } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })
})

describe('articles.setStatus', () => {
  it.each(['pending', 'reading', 'read'])('accepts %s', async (status) => {
    const writes = await run(mutators.articles.setStatus, {
      id: ARTICLE,
      status,
    })

    expect(writes).toEqual([{ table: 'articles', operation: 'update' }])
  })

  it.each([
    ['a status outside the three', { id: ARTICLE, status: 'finished' }],
    ['a status in the wrong case', { id: ARTICLE, status: 'Reading' }],
    ['a missing status', { id: ARTICLE }],
    ['a malformed article id', { id: 'article-1', status: 'read' }],
  ])('refuses %s without writing', async (_case, args) => {
    const { tx, writes } = stubTransaction()

    await expect(
      mutators.articles.setStatus.fn({ args, tx, ctx: CONTEXT } as never),
    ).rejects.toThrow()
    expect(writes).toEqual([])
  })
})
