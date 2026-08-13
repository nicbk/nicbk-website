import { createFileRoute } from '@tanstack/react-router'
import { getSession } from '~/auth/auth'
import { db, pool } from '~/db/client'
import { respondWithArticlePdf } from '~/lit-tracker/pdf/pdf-endpoint'

/**
 * Mounts the route the reader loads an article's PDF from.
 *
 * The URL names the resource — *this article's PDF* — rather than the object
 * behind it, which is why the id is a path segment and not a search param: it
 * would otherwise travel in query strings through logs and referrers, and read
 * as an action rather than a thing.
 *
 * The session is resolved here from the request's own cookie, so the user whose
 * articles are searched is server-derived — the same rule `/api/lit-tracker/upload`
 * and `/api/zero/query` follow, and the reason no request can name an owner.
 *
 * Everything this route decides lives in `respondWithArticlePdf`, including why
 * "not yours" and "not there" are the same answer.
 */
export const Route = createFileRoute(
  '/api/lit-tracker/articles/$articleId/pdf',
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        respondWithArticlePdf(request, {
          articleId: params.articleId,
          getUserId: async (incoming) =>
            (await getSession(incoming))?.user.id ?? null,
          database: { db, pool },
        }),
    },
  },
})
