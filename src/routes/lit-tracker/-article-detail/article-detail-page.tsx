import { Link } from '@tanstack/react-router'
import { PanelLeft } from 'lucide-react'
import { ArticleMenu } from '~/routes/lit-tracker/-components/article-menu/article-menu'
import { NarrowScreenDrawer } from '~/routes/lit-tracker/-components/narrow-screen-drawer/narrow-screen-drawer'
import { useArticleMutations } from '~/routes/lit-tracker/-hooks/use-article-mutations'
import { ArticleDetails } from './article-details'
import { ArticleSidebar, SIDEBAR_LABEL } from './article-sidebar'
import { ArticleReader } from './reader/article-reader'
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
 * One paper, filling its panel.
 *
 * **The page is the reader now** (user-decided 2026-08-13). It used to open with
 * a metadata header — title, authors, venue — above the document, and that row
 * spent roughly a fifth of the panel's height on three lines of text, on the one
 * page whose entire purpose is showing as much of a paper as possible. Each
 * piece moved somewhere it was already wanted:
 *
 *  - **the title** into the tracker's own header (`article-title.tsx`),
 *    beside the app name, where it costs the document nothing;
 *  - **the authors and venue** into the three-dot menu (`article-details.tsx`),
 *    the page's "about this article" surface;
 *  - **the two controls** into the reader's toolbar, which overlays the document
 *    rather than sitting above it.
 *
 * What is left here is the `<h1>` — clipped, because nothing draws it any more,
 * but present because the route-change focus handoff lands on it
 * (src/focus-handoff.ts) and it names the page for anyone listening. The
 * collection page's heading works exactly the same way.
 *
 * **The sidebar is not rendered here.** It lives in the shell's rail, which is
 * outside this page entirely — `route.tsx` decides what the rail shows for the
 * matched route, exactly as it already does for the collection's filters. What
 * this page does render is the *sheet* copy of it, below the breakpoint, through
 * the trigger it hands to the reader's toolbar.
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
          Still an <h1>, and drawn rather than clipped: this page found no
          article, so the sentence *is* the page, and the focus handoff
          (src/focus-handoff.ts) needs a heading to land on here as much as it
          does on a page that found one.
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
      {/* Clipped, not removed — see this component's docblock. */}
      <h1 className={styles.heading}>{article.title}</h1>

      <ArticleReader
        articleId={articleId}
        actions={
          <>
            <NarrowScreenDrawer label={SIDEBAR_LABEL} icon={PanelLeft}>
              {/*
                An element, not a rendered tree: the sheet mounts it only while
                open, so the sidebar's queries and its tab state exist once at a
                time even though two surfaces can show it.
              */}
              <ArticleSidebar articleId={articleId} />
            </NarrowScreenDrawer>

            <ArticleMenu
              articleTitle={article.title}
              // The card's menu, unchanged in what it does — #11 adds "edit…"
              // and "delete…" to this one rather than building a second. What
              // this surface adds is the article's own details at the top, since
              // nothing else on the page shows them any more.
              details={<ArticleDetails article={article} />}
              // The menu opens over the reader's floating toolbar, which would
              // otherwise stay lit and clickable behind it.
              modal
              status={article.status ?? 'pending'}
              allTags={allTags}
              appliedTagIds={appliedTagIds}
              onSetStatus={(status) => mutations.setStatus(articleId, status)}
              onToggleTag={(tagId, applied) =>
                applied
                  ? mutations.applyTag(articleId, tagId)
                  : mutations.removeTag(articleId, tagId)
              }
              onCreateTag={(name) =>
                mutations.createAndApplyTag(articleId, name)
              }
            />
          </>
        }
      />
    </div>
  )
}
