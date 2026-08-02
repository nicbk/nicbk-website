import { describe, expect, it } from 'vitest'
import type { ZeroContext } from './context'
import { queries } from './queries'

/**
 * The query expression a definition produced, as data.
 *
 * Zero exposes the AST on every query but does not surface it in the public
 * type, so reading it needs a cast. It is worth reading: these tests assert the
 * *shape of the filter* each definition builds, which is the authorization
 * decision itself, without needing a database to observe it. The integration
 * tier then proves the same definitions against real rows.
 */
function astOf(query: unknown): {
  table: string
  where?: unknown
  orderBy?: unknown
  limit?: number
} {
  return (
    query as {
      ast: {
        table: string
        where?: unknown
        orderBy?: unknown
        limit?: number
      }
    }
  ).ast
}

const OWNER: ZeroContext = { id: 'user-a' }
const OTHER_USER_ID = 'user-b'
const AN_ARTICLE_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'

/** A `column = literal` comparison, as the AST spells one. */
function equals(column: string, value: string) {
  return {
    type: 'simple',
    left: { type: 'column', name: column },
    right: { type: 'literal', value },
    op: '=',
  }
}

describe('query names', () => {
  it('are the names the client and server agree on', () => {
    // These strings are the wire contract: the client sends a name, this app
    // looks it up. Renaming a query is a protocol change, so the names are
    // pinned rather than left to whatever `defineQueries` happens to compute.
    expect(queries.articles.mine.queryName).toBe('articles.mine')
    expect(queries.articles.byId.queryName).toBe('articles.byId')
    expect(queries.uploadJobs.mine.queryName).toBe('uploadJobs.mine')
  })
})

describe('articles.mine', () => {
  it('filters to the context user, newest first', () => {
    const ast = astOf(queries.articles.mine.fn({ args: undefined, ctx: OWNER }))

    expect(ast.table).toBe('articles')
    expect(ast.where).toEqual(equals('userId', OWNER.id))
    expect(ast.orderBy).toEqual([['createdAt', 'desc']])
  })

  it('matches nothing without a context', () => {
    const ast = astOf(
      queries.articles.mine.fn({ args: undefined, ctx: undefined }),
    )

    expect(ast.limit).toBe(0)
  })
})

describe('articles.byId', () => {
  it('requires ownership in addition to the id', () => {
    const ast = astOf(
      queries.articles.byId.fn({ args: AN_ARTICLE_ID, ctx: OWNER }),
    )

    // Both conditions, joined by AND. An id-only filter here would hand any
    // signed-in client any article whose id it could name.
    expect(ast.where).toEqual({
      type: 'and',
      conditions: [equals('id', AN_ARTICLE_ID), equals('userId', OWNER.id)],
    })
  })

  it('still filters by the context user when the argument names someone else', () => {
    // Arguments come straight from the client. The ownership filter is applied
    // from `ctx`, so naming another user's row cannot widen the result.
    const ast = astOf(
      queries.articles.byId.fn({ args: AN_ARTICLE_ID, ctx: { id: 'user-a' } }),
    )

    expect(JSON.stringify(ast.where)).not.toContain(OTHER_USER_ID)
    expect(JSON.stringify(ast.where)).toContain('user-a')
  })

  it('rejects an argument that is not an article id', () => {
    // The validator runs before the query body, so a malformed argument never
    // reaches the filter — which is why Zero requires one for every query that
    // takes arguments.
    expect(() =>
      queries.articles.byId.fn({ args: 'not-a-uuid', ctx: OWNER }),
    ).toThrow()
  })

  it('matches nothing without a context', () => {
    // Not even the id argument survives: with no session there is no query to
    // scope, so the definition returns one that can produce no rows at all.
    const ast = astOf(
      queries.articles.byId.fn({ args: AN_ARTICLE_ID, ctx: undefined }),
    )

    expect(ast.limit).toBe(0)
    expect(ast.where).toBeUndefined()
  })
})

describe('uploadJobs.mine', () => {
  it('filters to the context user, oldest first', () => {
    const ast = astOf(
      queries.uploadJobs.mine.fn({ args: undefined, ctx: OWNER }),
    )

    expect(ast.table).toBe('uploadJobs')
    expect(ast.where).toEqual(equals('userId', OWNER.id))
    expect(ast.orderBy).toEqual([['createdAt', 'asc']])
  })

  it('matches nothing without a context', () => {
    const ast = astOf(
      queries.uploadJobs.mine.fn({ args: undefined, ctx: undefined }),
    )

    expect(ast.limit).toBe(0)
  })
})
