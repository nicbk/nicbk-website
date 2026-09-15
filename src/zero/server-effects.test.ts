// @vitest-environment node
import type { SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it, vi } from 'vitest'
import type { ZeroContext } from './context'
import { mutators } from './mutators'
import { runServerEffect } from './server-effects'

/**
 * The follow-ups a mutation owes the world outside Postgres.
 *
 * Two things are worth asserting here and nowhere else: that deleting an
 * article asks for its PDF to be removed, and that the request is sent on the
 * *mutation's own transaction* rather than beside it. The second is invisible
 * when wrong — everything still works, right up until a crash between the
 * commit and the send leaves an object nobody can reach.
 */

const CONTEXT: ZeroContext = { id: 'reader-1' }
const ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-000000000001'

/** A Zero server transaction, as far as this module looks at one. */
const WRAPPED = { itIsTheDrizzleTransaction: true }
const SERVER_TX = {
  location: 'server',
  dbTransaction: { wrappedTransaction: WRAPPED },
} as never

function queueSpy() {
  const send =
    vi.fn<
      (
        name: string,
        job: unknown,
        options?: { db?: unknown },
      ) => Promise<string>
    >()
  send.mockResolvedValue('job-id')
  return { queue: { send } as never, send }
}

describe('runServerEffect', () => {
  it('asks for the deleted article’s PDF to be removed', async () => {
    const { queue, send } = queueSpy()

    await runServerEffect(mutators.articles.delete.mutatorName, {
      args: { id: ARTICLE },
      ctx: CONTEXT,
      tx: SERVER_TX,
      getQueue: async () => queue,
    })

    const [name, job] = send.mock.calls[0] ?? []
    expect(name).toBe('lit-tracker.pdf-cleanup')
    // The owner comes from the context, never from the arguments — the same
    // rule every mutator follows, and for the same reason: the arguments
    // arrive verbatim from a browser.
    expect(job).toEqual({ userId: CONTEXT.id, articleId: ARTICLE })
  })

  it('sends on the transaction the mutation wrote through', async () => {
    // What makes the enqueue and the row delete one fact. pg-boss will send on
    // its own connection unless it is handed one, and that version has a window
    // in it: a crash after the commit and before the send orphans the object
    // forever, silently.
    const { queue, send } = queueSpy()

    await runServerEffect(mutators.articles.delete.mutatorName, {
      args: { id: ARTICLE },
      ctx: CONTEXT,
      tx: SERVER_TX,
      getQueue: async () => queue,
    })

    expect(send.mock.calls[0]?.[2]?.db).toBeDefined()
  })

  it('does nothing for a mutation that owes nothing', async () => {
    // The common path by a long way, and it must not touch the queue: almost
    // every write here is a row and only a row.
    const { queue, send } = queueSpy()

    await runServerEffect(mutators.articles.setStatus.mutatorName, {
      args: { id: ARTICLE, status: 'read' },
      ctx: CONTEXT,
      tx: SERVER_TX,
      getQueue: async () => queue,
    })

    expect(send).not.toHaveBeenCalled()
  })

  it('does not reach the queue before it knows there is work', async () => {
    // Connecting per mutation would put a queue in the path of setting a
    // reading status, which is the commonest write on the site.
    const getQueue = vi.fn(async () => {
      throw new Error('the queue must not be reached for an effectless write')
    })

    await expect(
      runServerEffect(mutators.tags.create.mutatorName, {
        args: { id: ARTICLE, name: 'attention' },
        ctx: CONTEXT,
        tx: SERVER_TX,
        getQueue,
      }),
    ).resolves.toBeUndefined()
    expect(getQueue).not.toHaveBeenCalled()
  })

  it('refuses a delete carrying no session rather than guessing an owner', async () => {
    const { queue, send } = queueSpy()

    await expect(
      runServerEffect(mutators.articles.delete.mutatorName, {
        args: { id: ARTICLE },
        ctx: undefined,
        tx: SERVER_TX,
        getQueue: async () => queue,
      }),
    ).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })

  it('refuses to run against a client transaction', async () => {
    // Reaching this with a client transaction would mean the module had been
    // imported somewhere it must never be, which is worth a throw rather than
    // a cast that quietly succeeds.
    const { queue, send } = queueSpy()

    await expect(
      runServerEffect(mutators.articles.delete.mutatorName, {
        args: { id: ARTICLE },
        ctx: CONTEXT,
        tx: { location: 'client' } as never,
        getQueue: async () => queue,
      }),
    ).rejects.toThrow(/outside the server/)
    expect(send).not.toHaveBeenCalled()
  })
})

describe('referenceReads.retry', () => {
  const OTHER = '0199a1b2-c3d4-7e5f-8a9b-000000000002'

  /** A server transaction whose re-read lookup answers with these rows. */
  function serverTxReturning(rows: { articleId: string }[]) {
    const where = vi.fn(async () => rows)
    const wrapped = { select: () => ({ from: () => ({ where }) }) }
    return {
      tx: {
        location: 'server',
        dbTransaction: { wrappedTransaction: wrapped },
      } as never,
      where,
    }
  }

  it('queues the papers now waiting, one job each, on the mutation’s transaction', async () => {
    const { queue, send } = queueSpy()
    const { tx } = serverTxReturning([
      { articleId: ARTICLE },
      { articleId: OTHER },
    ])

    await runServerEffect(mutators.referenceReads.retry.mutatorName, {
      args: { articleIds: [ARTICLE, OTHER] },
      ctx: CONTEXT,
      tx,
      getQueue: async () => queue,
    })

    expect(send.mock.calls.map(([name, job]) => [name, job])).toEqual([
      [
        'lit-tracker.reread-references',
        { articleId: ARTICLE, userId: CONTEXT.id },
      ],
      [
        'lit-tracker.reread-references',
        { articleId: OTHER, userId: CONTEXT.id },
      ],
    ])
    // Keyed by paper, so a paper still queued is not queued twice.
    expect(send.mock.calls[0]?.[2]).toMatchObject({
      singletonKey: ARTICLE,
      db: expect.anything(),
    })
  })

  it('looks only at the caller’s own papers, and only those now waiting', async () => {
    // The ids come from the browser. Which rows they can reach is decided by
    // this query, so its conditions are what is asserted — rendered as the SQL
    // Postgres would receive.
    const { queue } = queueSpy()
    const { tx, where } = serverTxReturning([])

    await runServerEffect(mutators.referenceReads.retry.mutatorName, {
      args: { articleIds: [ARTICLE] },
      ctx: CONTEXT,
      tx,
      getQueue: async () => queue,
    })

    const condition = (where.mock.calls as unknown as [SQL][])[0]?.[0]
    const rendered = new PgDialect().sqlToQuery(condition as SQL)
    expect(rendered.sql).toContain('"user_id" = $')
    expect(rendered.sql).toContain('"status" = $')
    expect(rendered.params).toEqual(
      expect.arrayContaining([CONTEXT.id, 'queued', ARTICLE]),
    )
  })

  it('sends nothing when no named paper is the caller’s and waiting', async () => {
    const { queue, send } = queueSpy()
    const { tx } = serverTxReturning([])

    await runServerEffect(mutators.referenceReads.retry.mutatorName, {
      args: { articleIds: [ARTICLE] },
      ctx: CONTEXT,
      tx,
      getQueue: async () => queue,
    })

    expect(send).not.toHaveBeenCalled()
  })

  it('refuses a retry carrying no session', async () => {
    const { queue, send } = queueSpy()
    const { tx } = serverTxReturning([{ articleId: ARTICLE }])

    await expect(
      runServerEffect(mutators.referenceReads.retry.mutatorName, {
        args: { articleIds: [ARTICLE] },
        ctx: undefined,
        tx,
        getQueue: async () => queue,
      }),
    ).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })
})
