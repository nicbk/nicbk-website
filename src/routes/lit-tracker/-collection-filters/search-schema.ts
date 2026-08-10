import { z } from 'zod'
import { ARTICLE_STATUSES } from '~/lit-tracker/article-status'

/**
 * The Lit Tracker's filter state, as URL search params — the shareable source of
 * truth for what the collection is narrowed to (per
 * research/coding-conventions/state-management-conventions.md: shareable UI
 * state lives in search params, not local `useState`). Passed **directly** to
 * the route's `validateSearch`; the repo is on Zod 4, whose schemas are callable
 * validators, so `@tanstack/zod-adapter` (which pins Zod 3) is not used.
 *
 * **Declared on the `/lit-tracker` layout route, not on the collection page.**
 * The filter rail renders in the layout's sidebar, beside the page rather than
 * inside it, so page-level search params would be unreadable from the control
 * that sets them. Putting them one level up gives the rail and the collection
 * one route API, and it means a filtered collection survives navigating into an
 * article and back — the filters are still there in the URL that was left.
 *
 * Every field is `.optional()` rather than `.default(...)`, for the reason the
 * blog's schema records: a defaulted field validates a bare `/lit-tracker` into
 * a concrete object, which the router then serializes back into the URL,
 * polluting every plain link to the tracker. An inactive filter left `undefined`
 * keeps those URLs clean, and consumers normalize the absent value
 * (`useCollectionFilters`). `.catch(undefined)` makes a malformed value — a
 * hand-edited or stale URL — degrade to absent rather than throwing the page.
 */

/**
 * Selected tags, **by name**. TanStack Router's default serializer JSON-encodes
 * arrays, so a real multi-tag URL round-trips as an array; the `preprocess` step
 * additionally lifts a lone hand-typed `?tags=rlhf` (a bare string) into
 * `['rlhf']` so such a URL still filters instead of being discarded.
 *
 * Names rather than ids: a URL carrying `["transformers","rlhf"]` is readable
 * and says what it does, where two UUIDs would not, and it keeps working if a
 * tag is deleted and made again. Names are not unique in the database, but the
 * card menu makes an exact name match *apply the existing tag* rather than
 * create a second one, so duplicates are not reachable through the UI — and if
 * one ever existed, "carries a tag called X" is still exactly what this filters
 * on.
 */
const tagsSchema = z
  .preprocess(
    (value) => (Array.isArray(value) ? value : [value]),
    z.array(z.string()),
  )
  .optional()
  .catch(undefined)

export const collectionSearchSchema = z.object({
  /**
   * The search text, matched against title, authors, tags, and reading status.
   *
   * `q` rather than `query`, matching the blog's parameter exactly: the two
   * search bars are one component and one interaction, and there is no reason a
   * reader should find two different spellings of the same idea in two URLs on
   * one site.
   *
   * The URL carries the *settled* text, mirrored on a debounce — the visible
   * grid filters from local state on every keystroke and never waits on this
   * (see `use-collection-search.ts`). What this param is for is sharing and
   * reloading a searched view, not driving it.
   */
  q: z.string().optional().catch(undefined),
  /** Tags the article must all carry (AND-composed) to remain in the grid. */
  tags: tagsSchema,
  /**
   * The one reading status to show, if any. A single value rather than an
   * array because `articles.status` is a single-valued column and the rail's
   * status group is single-select — the same mutual exclusivity, expressed in
   * the URL.
   */
  status: z.enum(ARTICLE_STATUSES).optional().catch(undefined),
})

/** The validated search state read via `useSearch`; absent filters are `undefined`. */
export type CollectionSearch = z.infer<typeof collectionSearchSchema>
