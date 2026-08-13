import { useArticleDetail } from './use-article-detail'
import styles from './article-title.module.css'

/**
 * The article's title, in the tracker's header beside the app name.
 *
 * **This is where the paper names itself.** The detail page used to carry a
 * metadata header — title, authors, venue — above the reader, and that header
 * spent roughly a fifth of the panel's height on three lines of text, on the one
 * page whose whole purpose is showing as much of a document as possible. The
 * title came up here and the row went away (user-decided 2026-08-13). Authors
 * and venue moved into the three-dot menu.
 *
 * **Beside the app name rather than in the breadcrumb** (user-decided
 * 2026-08-13, after seeing both). The decided header spec put it at the end of
 * the path, and there it read wrong: `↳/nicbk_home/…` is a path from the
 * *personal site's* root, so a paper title arriving at the end of it looked like
 * a page on that site rather than the thing being read. Beside "Literature
 * Tracker", behind a rule, it reads as the tracker and then what is open in it.
 *
 * **Not a link, and not the page's heading.** There is nowhere for it to go —
 * this is where you already are — and the page's `<h1>` stays inside `<main>`,
 * clipped, because that is what the route-change focus handoff targets
 * (src/focus-handoff.ts). The collection page's heading works the same way.
 *
 * It renders inside the Zero provider, which is why the shell moved the header
 * in there: the title is synced data like everything else on this page. Before
 * the row arrives, and for an article that is not in this account, it renders
 * nothing at all — a header reading "loading…" would be worse than one that
 * briefly says only where it is.
 */

interface ArticleTitleProps {
  articleId: string
}

export function ArticleTitle({ articleId }: ArticleTitleProps) {
  const { article } = useArticleDetail(articleId)

  if (article === undefined) {
    return null
  }

  return (
    // `title` gives the full text back on a narrow screen, where the visible one
    // is ellipsised. A real paper title is long, and this row is the one place
    // on the page it now appears.
    <span className={styles.label} aria-current="page" title={article.title}>
      {article.title}
    </span>
  )
}
