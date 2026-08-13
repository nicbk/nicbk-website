import { formatAuthors } from '../-collection-page/authors'
import type { DetailArticle } from './detail-article'
import { formatPublication } from './detail-article'
import styles from './article-details.module.css'

/**
 * What the paper is, at the top of the detail page's three-dot menu.
 *
 * These three lines used to be a header above the reader, and they cost roughly
 * a fifth of the panel's height to say something a reader needs once and then
 * not again (user-decided 2026-08-13). The title moved up into the tracker's own
 * header, beside the app name; the authors and venue moved here, behind the
 * control that was already the page's "about this article" surface.
 *
 * **The title is repeated here on purpose.** Up in the header it is ellipsised —
 * it shares that row with the app name, the path and the account controls — so
 * this is the one place a long paper title can be read in full without hovering
 * for a tooltip. Nothing else on the page says it.
 */

interface ArticleDetailsProps {
  article: DetailArticle
}

export function ArticleDetails({ article }: ArticleDetailsProps) {
  const authorLine = formatAuthors(article.authors)
  const publication = formatPublication(article.publicationYear, article.venue)

  return (
    <div className={styles.details}>
      {/*
        Not a heading. The page's one `<h1>` is inside `<main>` for the focus
        handoff (src/focus-handoff.ts), and a second heading inside a popup would
        put a rival at the top of the document outline for something that is not
        a section of the page.

        Not elided either, unlike the card's: this is the surface that exists to
        show the whole thing.
      */}
      <p className={styles.title}>{article.title}</p>
      <p className={styles.authors}>{authorLine}</p>
      {publication !== null && (
        <p className={styles.publication}>{publication}</p>
      )}
    </div>
  )
}
