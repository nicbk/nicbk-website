import { z } from 'zod'

/**
 * The `/blog` route's search-param schema — the URL is the single source of
 * truth for the blog's filter state (per
 * research/coding-conventions/state-management-conventions.md: shareable UI
 * state lives in search params, not local `useState`). Passed **directly** to
 * the route's `validateSearch`; the repo is on Zod 4, whose schemas are callable
 * validators, so `@tanstack/zod-adapter` (which pins Zod 3) is not used.
 *
 * Both fields are `.optional()` rather than `.default(...)` on purpose: a
 * defaulted field validates a bare `/blog` (or any `<Link to="/blog">`) into a
 * concrete `{ q: '', tags: [] }`, which the router then serializes back into the
 * URL as `?q=&tags=%5B%5D` — polluting every plain link to the list. Leaving an
 * inactive filter `undefined` keeps those URLs clean; consumers normalize the
 * absent value to `''`/`[]` (see `useBlogFilters`). `.catch(undefined)` makes a
 * malformed value (a hand-edited or stale URL) degrade to absent rather than
 * throwing the page.
 */

/**
 * Selected tags. TanStack Router's default serializer JSON-encodes arrays, so a
 * real multi-tag URL round-trips as an array; the `preprocess` step additionally
 * lifts a lone hand-typed `?tags=react` (a bare string) into `['react']` so such
 * a URL still filters instead of being discarded.
 */
const tagsSchema = z
  .preprocess(
    (value) => (Array.isArray(value) ? value : [value]),
    z.array(z.string()),
  )
  .optional()
  .catch(undefined)

export const blogSearchSchema = z.object({
  /** Free-text query over post title, description, and tags. */
  q: z.string().optional().catch(undefined),
  /** Tags the post must all carry (AND-composed) to remain in the list. */
  tags: tagsSchema,
})

/** The validated search state read via `useSearch`; absent filters are `undefined`. */
export type BlogSearch = z.infer<typeof blogSearchSchema>
