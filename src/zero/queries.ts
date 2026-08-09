import { defineQueries, defineQuery } from '@rocicorp/zero'
import { z } from 'zod'
import { zql } from './schema.gen'

/**
 * Every query the client may ask zero-cache to sync, and — because Zero has no
 * permissions layer behind this file — every read-authorization decision on the
 * site's user-owned data.
 *
 * Each query is scoped by `ctx.id`, the user id that `zeroContextFrom` derives
 * from the session (`context.ts` also registers `ctx`'s type, which is why it
 * needs no annotation here). Arguments are never trusted for ownership: a query
 * that took a `userId` argument and filtered on it would let any signed-in
 * client read any other user's collection, and nothing further down would catch
 * it.
 *
 * `ctx` is `undefined` when the request carries no session, and every query
 * answers that with `.limit(0)`. Read permissions in Zero are filter-based: the
 * documented way to deny a read is to return a query matching no rows rather
 * than to throw. Zero's docs suggest an empty `or()` for this, but that
 * compiles to an invalid `WHERE ()` when the same definition is run through
 * server-side ZQL against Postgres, whereas a zero limit is handled identically
 * everywhere and cannot be defeated by any row that happens to exist. The
 * endpoint separately answers such a request with 401, so this is the guarantee
 * underneath that rather than a substitute for it.
 *
 * A copy of each of these runs on the client too, against its local data. That
 * copy is a convenience, not a control — zero-cache resolves the authoritative
 * version by calling this app's `/api/zero/query` endpoint.
 */
export const queries = defineQueries({
  articles: {
    /** Every article in the signed-in user's collection, newest first. */
    mine: defineQuery(({ ctx }) => {
      if (!ctx) {
        return zql.articles.limit(0)
      }
      return zql.articles.where('userId', ctx.id).orderBy('createdAt', 'desc')
    }),

    /**
     * One article by id — and only if the requester owns it.
     *
     * The ownership filter is applied *in addition to* the id, not instead of
     * it, which is what makes naming another user's row id return nothing
     * rather than that row.
     */
    byId: defineQuery(z.uuid(), ({ args: id, ctx }) => {
      if (!ctx) {
        return zql.articles.limit(0)
      }
      return zql.articles.where('id', id).where('userId', ctx.id)
    }),
  },

  tags: {
    /**
     * Every tag the signed-in user has made, alphabetically.
     *
     * Sorted here rather than in the component because every surface that shows
     * tags wants the same order — the card, the menu's tag list, and the filter
     * rail — and a shared query is one place for that instead of three.
     */
    mine: defineQuery(({ ctx }) => {
      if (!ctx) {
        return zql.tags.limit(0)
      }
      return zql.tags.where('userId', ctx.id).orderBy('name', 'asc')
    }),
  },

  articleTags: {
    /**
     * Which of the user's articles carry which of their tags.
     *
     * `article_tags` has no `userId` of its own — both ends already belong to
     * exactly one user (`schema/lit-tracker.ts` explains why a third copy would
     * be a liability) — so ownership is filtered **through the tag**, using the
     * relationship the generated schema derives from the Drizzle one. Filtering
     * through the article would be equally correct and equally sufficient; what
     * would not be correct is returning the table unfiltered because it has no
     * owner column of its own to filter on. That is the mistake this comment
     * exists to prevent, and the read-isolation test is what proves it was
     * avoided.
     */
    mine: defineQuery(({ ctx }) => {
      if (!ctx) {
        return zql.articleTags.limit(0)
      }
      return zql.articleTags.whereExists('tag', (tag) =>
        tag.where('userId', ctx.id),
      )
    }),
  },

  uploadJobs: {
    /**
     * The signed-in user's unresolved uploads, oldest first — what the upload
     * status popup lists. Resolved jobs are deleted rather than marked, so this
     * is exactly "uploads still needing attention".
     */
    mine: defineQuery(({ ctx }) => {
      if (!ctx) {
        return zql.uploadJobs.limit(0)
      }
      return zql.uploadJobs.where('userId', ctx.id).orderBy('createdAt', 'asc')
    }),
  },
})
