import { createFileRoute } from '@tanstack/react-router'
import { getSession } from '~/auth/auth'
import { db, pool } from '~/db/client'
import { respondToUpload } from '~/lit-tracker/upload/upload-endpoint'

/**
 * Mounts the PDF upload endpoint the tracker's upload modal posts to.
 *
 * The one write on this site that does not go through Zero — a binary is not a
 * mutation payload, and `respondToUpload` documents why in full. Everything the
 * upload produces still reaches the browser by sync: this response says only
 * what was accepted or refused, and the job rows arrive on their own.
 *
 * The session is resolved here from the request's own cookie, so the user id
 * every stored object is filed under is server-derived — the same rule
 * `/api/zero/query` follows, and for the same reason.
 */
export const Route = createFileRoute('/api/lit-tracker/upload')({
  server: {
    handlers: {
      POST: ({ request }) =>
        respondToUpload(request, {
          getUserId: async (incoming) =>
            (await getSession(incoming))?.user.id ?? null,
          database: { db, pool },
        }),
    },
  },
})
