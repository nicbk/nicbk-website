import { z } from 'zod'

/**
 * The `/sign-in` route's search-param schema.
 *
 * Both fields arrive from outside the page and neither is trustworthy on its
 * own: `returnTo` is written by whoever linked here (the route guard, normally
 * — but anyone can hand-craft the URL), and `error` is written by Better Auth
 * when it bounces a failed OAuth callback back to this page. So both are
 * validated as *strings* here and interpreted safely downstream —
 * `sanitizeReturnTo` for the destination, `signInErrorMessage` for the code —
 * rather than being trusted because they parsed.
 *
 * Optional rather than defaulted, and `.catch(undefined)` on each, for the same
 * reasons the blog's schema documents: a defaulted field would serialize itself
 * back into every plain `/sign-in` link, and a malformed value should degrade to
 * absent instead of throwing the page the user came here to use.
 */
export const signInSearchSchema = z.object({
  /** Where to send the user once they are signed in. */
  returnTo: z.string().optional().catch(undefined),
  /** Better Auth's machine-readable OAuth failure code, e.g. `access_denied`. */
  error: z.string().optional().catch(undefined),
})

/** The validated search state read via `useSearch`. */
export type SignInSearch = z.infer<typeof signInSearchSchema>
