import { createAuthClient } from 'better-auth/react'

/**
 * The browser-side Better Auth client.
 *
 * No `baseURL`: the client then talks to `/api/auth/*` on whatever origin the
 * page was served from, which is exactly right here — the app is served from
 * one origin and mounts Better Auth in-process (`src/routes/api/auth/$.ts`), so
 * dev, Docker, and production each work without configuration.
 *
 * This is the adopted foundation for anything the browser needs to ask of the
 * auth server (starting a sign-in now; signing out and account deletion when
 * the settings surface arrives), rather than hand-rolled `fetch` calls against
 * endpoint paths that would have to be kept in step with the library by hand.
 */
export const authClient = createAuthClient()
