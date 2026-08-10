import { Link } from '@tanstack/react-router'
import { useArticleMutations } from '~/routes/lit-tracker/-hooks/use-article-mutations'
import { ArticleSidebar } from './article-sidebar'
import { ArticleSummary } from './article-summary'
import { ReaderPlaceholder } from './reader-placeholder'
import { useArticleDetail } from './use-article-detail'
import styles from './article-detail-page.module.css'

/** Shown while the first sync is in flight, so an arriving article is not a 404. */
const SYNCING_MESSAGE = 'loading…'

/**
 * What an article that is not in this account looks like.
 *
 * The same words whether the id is someone else's or nobody's, which is the
 * whole point — see `use-article-detail.ts`. Deliberately not the site's
 * `NotFoundPage`: that one is the root route's 404 for an unmatched *route*,
 * rendered in the personal site's shell with a link home. This route matched,
 * the reader is signed in, and where they want to go is back to their
 * collection.
 */
const MISSING_MESSAGE = 'no such article in your collection.'

/** Shown when the query itself failed, which is not the same as an empty one. */
const ERROR_MESSAGE = 'could not load this article.'

interface ArticleDetailPageProps {
  articleId: string
}

/**
 * One paper: its metadata across the top, its reader filling the panel, and its
 * sidebar in the shell's rail beside them.
 *
 * The decided layout (research/ui-ux/pages/lit-tracker/pages/article-detail.md)
 * puts the reader in the main content area because reading is the primary task
 * on this page. Task 1 builds everything around it; the reader itself is task 3,
 * and until then this page is honest about the hole rather than filling it with
 * a spinner (`reader-placeholder.tsx`).
 *
 * **The sidebar is not rendered here.** It lives in the shell's rail, which is
 * outside this page entirely — `route.tsx` decides what the rail shows for the
 * matched route, exactly as it already does for the collection's filters. What
 * this page does render is the *sheet* copy of it, below the breakpoint, through
 * the trigger in the summary row.
 */
export function ArticleDetailPage({ articleId }: ArticleDetailPageProps) {
  const { state, article, tags, allTags } = useArticleDetail(articleId)
  const mutations = useArticleMutations()

  if (state === 'syncing') {
    return <p className={styles.notice}>{SYNCING_MESSAGE}</p>
  }

  if (state === 'error') {
    return <p className={styles.notice}>{ERROR_MESSAGE}</p>
  }

  if (state === 'missing' || article === undefined) {
    return (
      <div className={styles.notice}>
        {/*
          Still an <h1>: this route matched and rendered a page, so the focus
          handoff (src/focus-handoff.ts) needs a heading to land on here as much
          as it does on a page that found its article.
        */}
        <h1 className={styles.missingHeading}>{MISSING_MESSAGE}</h1>
        <p>
          <Link to="/lit-tracker">back to your collection</Link>
        </p>
      </div>
    )
  }

  const appliedTagIds = new Set(tags.map((tag) => tag.id))

  return (
    <div className={styles.page}>
      <ArticleSummary
        article={article}
        allTags={allTags}
        appliedTagIds={appliedTagIds}
        onSetStatus={(status) => mutations.setStatus(articleId, status)}
        onToggleTag={(tagId, applied) =>
          applied
            ? mutations.applyTag(articleId, tagId)
            : mutations.removeTag(articleId, tagId)
        }
        onCreateTag={(name) => mutations.createAndApplyTag(articleId, name)}
        // An element, not a rendered tree: the sheet mounts it only while open,
        // so the sidebar's queries and its tab state exist once at a time even
        // though two surfaces can show it.
        sidebar={<ArticleSidebar articleId={articleId} />}
      />

      <ReaderPlaceholder />
    </div>
  )
}
