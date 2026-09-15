import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'

/**
 * Which of the article page's two main views is showing: the reader, or the
 * citations view (features/citation-graph-traversal).
 *
 * **In the URL, not in component state**, because three things must agree on it
 * and no two of them share a parent below the route layout: the sidebar in the
 * shell's rail, the copy of that sidebar in the narrow-screen sheet, and the
 * page's main area. It also means a reload, or a link, lands on the same view.
 *
 * Only `citations` is ever written. The reader is the page's default and is
 * spelled as no parameter at all, so every plain link to an article — the
 * collection's cards, a pasted URL — opens the reader with a clean URL, for the
 * reason the collection's filters give (`search-schema.ts`).
 */
export type ArticleView = 'reader' | 'citations'

export const articleSearchSchema = z.object({
  /** Absent means the reader. A malformed value degrades to absent. */
  view: z.enum(['citations']).optional().catch(undefined),
})

export type ArticleSearch = z.infer<typeof articleSearchSchema>

/** The view a validated search names. */
export function articleViewOf(search: ArticleSearch | undefined): ArticleView {
  return search?.view === 'citations' ? 'citations' : 'reader'
}

/**
 * Switches an article's view.
 *
 * **Pushed onto history, not replaced.** The views swap the whole main area,
 * which is what a reader takes a page to be — so Back from the citations view
 * returns to the paper, on a phone as much as on a desktop. The collection's
 * filters, which the layout keeps in the same URL, are carried over untouched.
 */
export function useSetArticleView(
  articleId: string,
): (view: ArticleView) => void {
  const navigate = useNavigate()
  return useCallback(
    (view: ArticleView) => {
      void navigate({
        to: '/lit-tracker/$articleId',
        params: { articleId },
        search: (previous) => ({
          ...previous,
          view: view === 'citations' ? 'citations' : undefined,
        }),
      })
    },
    [navigate, articleId],
  )
}
