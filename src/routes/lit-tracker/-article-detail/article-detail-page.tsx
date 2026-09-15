import { Link, useNavigate } from '@tanstack/react-router'
import { PanelLeft } from 'lucide-react'
import { useState } from 'react'
import { ArticleMenu } from '~/routes/lit-tracker/-components/article-menu/article-menu'
import { NarrowScreenDrawer } from '~/routes/lit-tracker/-components/narrow-screen-drawer/narrow-screen-drawer'
import { useArticleMutations } from '~/routes/lit-tracker/-hooks/use-article-mutations'
import { ArticleDetails } from './article-details'
import { ArticleSidebar, SIDEBAR_LABEL } from './article-sidebar'
import type { ArticleView } from './article-view'
import { CitationsView } from './citations/citations-view'
import { useCitations } from './citations/use-citations'
import type { DetailArticle } from './detail-article'
import { ArticleReader } from './reader/article-reader'
import type { ReadingPosition } from './reader/reading-position'
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
  /** The reader, or the citations view in its place. From the URL. */
  view: ArticleView
  onViewChange: (view: ArticleView) => void
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
 *
 * **The citations view takes the reader's place without unmounting it**
 * (features/citation-graph-traversal). The reader is hidden with the `hidden`
 * attribute — no layout, no focus, no pointer — and stays open behind it, so
 * choosing any other tab shows the same page at the same place with nothing
 * reloaded. Measured before building: a remount costs ~0.4s of blank panel on
 * `nicbk.com` and loses the place; hidden, Chrome kept the scroll offset and the
 * zoom exactly and redrew nothing.
 *
 * **The page's controls go wherever the page is showing.** They sit at the end
 * of the reader's toolbar, which is hidden with the reader, so the citations view
 * takes them while it shows. Rendered in one place at a time, never two: the
 * sheet is a single dialog, and two mounted copies would open two sheets.
 */
export function ArticleDetailPage({
  articleId,
  view,
  onViewChange,
}: ArticleDetailPageProps) {
  const { state, article, tags, allTags } = useArticleDetail(articleId)
  const citations = useCitations(articleId)
  const mutations = useArticleMutations()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)

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
  const showingCitations = view === 'citations'

  const actions = (
    <>
      <NarrowScreenDrawer
        label={SIDEBAR_LABEL}
        icon={PanelLeft}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      >
        {/*
                An element, not a rendered tree: the sheet mounts it only while
                open, so the sidebar's queries and its tab state exist once at a
                time even though two surfaces can show it.
              */}
        <ArticleSidebar
          articleId={articleId}
          view={view}
          onViewChange={(next) => {
            // Choosing Citations in the sheet closes it, so what the
            // reader sees is the lists they asked for rather than the
            // sheet still covering them. Any other tab is shown in the
            // sheet itself, which stays open.
            if (next === 'citations') {
              setSheetOpen(false)
            }
            onViewChange(next)
          }}
        />
      </NarrowScreenDrawer>

      <ArticleMenu
        article={article}
        onSaveDetails={(details) => mutations.updateDetails(articleId, details)}
        onDelete={() => {
          // Leave first, then delete. Zero applies the delete to the
          // local copy immediately, so staying would put this page into
          // its own "no such article in your collection" branch — a dead
          // end presented to the reader who just asked for it, which
          // reads as an error rather than as the thing working. The
          // collection is where they were before this article and the
          // only place left to be. A refusal still arrives, as a toast,
          // once the server has answered.
          void navigate({ to: '/lit-tracker' })
          void mutations.deleteArticle(articleId)
        }}
        // The card's menu, unchanged in what it does — #11 added "edit…"
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
        onCreateTag={(name) => mutations.createAndApplyTag(articleId, name)}
      />
    </>
  )

  return (
    <div className={styles.page}>
      {/* Clipped, not removed — see this component's docblock. */}
      <h1 className={styles.heading}>{article.title}</h1>

      <div className={styles.main} hidden={showingCitations}>
        <ArticleReader
          articleId={articleId}
          readingPosition={readingPositionOf(article)}
          onReadingPositionChange={(position) =>
            mutations.setReadingPosition(articleId, position)
          }
          hidden={showingCitations}
          actions={showingCitations ? undefined : actions}
        />
      </div>

      {showingCitations ? (
        <CitationsView
          state={citations.state}
          lists={citations.lists}
          actions={actions}
        />
      ) : null}
    </div>
  )
}

/**
 * The article's stored reading position, or `null` when it has none — both
 * columns are written together, so one without the other is treated as none.
 */
export function readingPositionOf(
  article: Pick<DetailArticle, 'readingPage' | 'readingOffset'>,
): ReadingPosition | null {
  if (article.readingPage == null || article.readingOffset == null) {
    return null
  }
  return { page: article.readingPage, offset: article.readingOffset }
}
