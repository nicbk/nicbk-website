import { z } from 'zod'
import { PATH_MAX } from '~/lit-tracker/citation-path'
import { articleViewField } from './article-view'

/**
 * Everything the article route keeps in its URL: which view is showing, and the
 * way back to where the reader started.
 *
 * Both belong to this one route — no other tracker page has a view to swap or a
 * path to keep — and both are here rather than in component state for the same
 * reason the collection's filters are (`-collection-filters/search-schema.ts`):
 * the header and the rail are siblings of the page, so what they share has to
 * live somewhere all three can read, and a reload or a shared link then lands on
 * the same screen.
 *
 * Composed from a field per concern rather than written out here, so the view's
 * rules stay in `article-view.ts` and the path's in `~/lit-tracker/citation-path`.
 */

/**
 * The papers visited before the open one, oldest first
 * (features/citation-graph-traversal, task 5).
 *
 * **UUIDs, validated here.** These ids are read back out of the URL, where
 * anyone may type anything, and they are the argument to an owner-scoped query;
 * a malformed value degrades the whole parameter to absent — a path is a
 * journey, and half a journey with a hole in it is not a safer version of it.
 * `preprocess` lifts a single hand-typed id into a list, exactly as the
 * collection's `tags` does, so `?via=<id>` still works.
 *
 * Capped at `PATH_MAX` so a URL cannot ask for an unbounded query. The path's
 * own rules cap it again as it is walked; this is the boundary, that is the
 * behaviour.
 */
const viaField = z
  .preprocess(
    (value) => (Array.isArray(value) ? value : [value]),
    z.array(z.uuid()).max(PATH_MAX),
  )
  .optional()
  .catch(undefined)

export const articleSearchSchema = z.object({
  view: articleViewField,
  via: viaField,
})

/** The validated search state this route reads back. */
export type ArticleSearch = z.infer<typeof articleSearchSchema>

/** The path ids a validated search carries; `[]` when it carries none. */
export function articleViaOf(search: ArticleSearch | undefined): string[] {
  return search?.via ?? []
}
