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
    expect(queries.articles.onPath.queryName).toBe('articles.onPath')
    expect(queries.uploadJobs.mine.queryName).toBe('uploadJobs.mine')
    expect(queries.citationEdges.references.queryName).toBe(
      'citationEdges.references',
    )
    expect(queries.citationEdges.citedBy.queryName).toBe(
      'citationEdges.citedBy',
    )
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

describe('articles.onPath', () => {
  const ANOTHER_ARTICLE_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c'

  it('asks for the path’s papers and the edges between them, owner-scoped twice', () => {
    const ast = astOf(
      queries.articles.onPath.fn({
        args: [AN_ARTICLE_ID, ANOTHER_ARTICLE_ID],
        ctx: OWNER,
      }),
    ) as {
      table: string
      where?: unknown
      related?: {
        subquery: { alias: string; table: string; where?: unknown }
      }[]
    }

    expect(ast.table).toBe('articles')
    expect(ast.where).toEqual({
      type: 'and',
      conditions: [
        {
          type: 'simple',
          left: { type: 'column', name: 'id' },
          right: {
            type: 'literal',
            value: [AN_ARTICLE_ID, ANOTHER_ARTICLE_ID],
          },
          op: 'IN',
        },
        equals('userId', OWNER.id),
      ],
    })
    // The edges come back with the papers, which is what lets one query label
    // every step; they are filtered to the path and to the owner as well.
    expect(ast.related).toHaveLength(1)
    expect(ast.related?.[0]?.subquery).toMatchObject({
      alias: 'references',
      table: 'citationEdges',
    })
    expect(JSON.stringify(ast.related?.[0]?.subquery.where)).toContain(OWNER.id)
  })

  it('still filters by the context user when the ids are someone else’s', () => {
    const ast = astOf(
      queries.articles.onPath.fn({ args: [AN_ARTICLE_ID], ctx: OWNER }),
    )

    expect(JSON.stringify(ast.where)).not.toContain(OTHER_USER_ID)
  })

  it('rejects ids that are not article ids, and a path longer than one can be', () => {
    expect(() =>
      queries.articles.onPath.fn({ args: ['not-a-uuid'], ctx: OWNER }),
    ).toThrow()
    expect(() =>
      queries.articles.onPath.fn({
        args: Array.from({ length: 22 }, () => AN_ARTICLE_ID),
        ctx: OWNER,
      }),
    ).toThrow()
  })

  it('matches nothing for an empty path, and nothing without a context', () => {
    expect(
      astOf(queries.articles.onPath.fn({ args: [], ctx: OWNER })).limit,
    ).toBe(0)
    expect(
      astOf(
        queries.articles.onPath.fn({ args: [AN_ARTICLE_ID], ctx: undefined }),
      ).limit,
    ).toBe(0)
  })
})

describe('annotations.forArticle', () => {
  it('filters by owner as well as by article, in page order', () => {
    const ast = astOf(
      queries.annotations.forArticle.fn({ args: AN_ARTICLE_ID, ctx: OWNER }),
    )

    expect(ast.table).toBe('annotations')
    // Both conditions, joined by AND. Filtering by article alone would hand any
    // signed-in client every mark on any paper whose id it could name.
    expect(ast.where).toEqual({
      type: 'and',
      conditions: [
        equals('articleId', AN_ARTICLE_ID),
        equals('userId', OWNER.id),
      ],
    })
    expect(ast.orderBy).toEqual([
      ['pageIndex', 'asc'],
      ['createdAt', 'asc'],
    ])
  })

  it('rejects an argument that is not an article id', () => {
    expect(() =>
      queries.annotations.forArticle.fn({ args: 'not-a-uuid', ctx: OWNER }),
    ).toThrow()
  })

  it('matches nothing without a context', () => {
    const ast = astOf(
      queries.annotations.forArticle.fn({
        args: AN_ARTICLE_ID,
        ctx: undefined,
      }),
    )

    expect(ast.limit).toBe(0)
    expect(ast.where).toBeUndefined()
  })
})

describe.each([
  ['references', 'citingArticleId', 'citedArticle'],
  ['citedBy', 'citedArticleId', 'citingArticle'],
] as const)('citationEdges.%s', (name, column, relationship) => {
  const query = queries.citationEdges[name]

  it('filters by the paper and by owner, and scopes the related article to the owner too', () => {
    const ast = astOf(query.fn({ args: AN_ARTICLE_ID, ctx: OWNER })) as {
      table: string
      where?: unknown
      orderBy?: unknown
      related?: {
        subquery: { alias: string; table: string; where?: unknown }
      }[]
    }

    expect(ast.table).toBe('citationEdges')
    expect(ast.where).toEqual({
      type: 'and',
      conditions: [equals(column, AN_ARTICLE_ID), equals('userId', OWNER.id)],
    })
    expect(ast.orderBy).toEqual([['id', 'asc']])
    expect(ast.related).toHaveLength(1)
    expect(ast.related?.[0]?.subquery).toMatchObject({
      alias: relationship,
      table: 'articles',
      where: equals('userId', OWNER.id),
    })
  })

  it('still filters by the context user when the argument names someone else’s paper', () => {
    const ast = astOf(query.fn({ args: AN_ARTICLE_ID, ctx: OWNER }))

    expect(JSON.stringify(ast.where)).toContain(OWNER.id)
    expect(JSON.stringify(ast.where)).not.toContain(OTHER_USER_ID)
  })

  it('rejects an argument that is not an article id', () => {
    expect(() => query.fn({ args: 'not-an-id' as never, ctx: OWNER })).toThrow()
  })

  it('matches nothing without a context', () => {
    expect(astOf(query.fn({ args: AN_ARTICLE_ID, ctx: undefined })).limit).toBe(
      0,
    )
  })
})

describe('referenceReads.mine', () => {
  it('filters to the context user', () => {
    const ast = astOf(
      queries.referenceReads.mine.fn({ args: undefined, ctx: OWNER }),
    )

    expect(ast.table).toBe('referenceReads')
    expect(ast.where).toEqual(equals('userId', OWNER.id))
  })

  it('matches nothing without a context', () => {
    const ast = astOf(
      queries.referenceReads.mine.fn({ args: undefined, ctx: undefined }),
    )

    expect(ast.limit).toBe(0)
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
