import { Tabs } from '@base-ui/react/tabs'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { nextVia } from '~/lit-tracker/citation-path'
import { formatAuthors } from '~/routes/lit-tracker/-collection-page/authors'
import type {
  CitationArticle,
  CitationLists,
  CitationTab,
  OutsideReference,
} from './citation-lists'
import { citationNotice, citesCount, noticeText } from './citation-lists'
import type { CitationsState } from './use-citations'
import styles from './citations-view.module.css'

/**
 * The citations view: what this paper cites and what cites it, in the page's
 * main area while the sidebar's Citations tab is selected
 * (features/citation-graph-traversal, task 4).
 *
 * A presentational component — the page supplies the lists (`use-citations.ts`)
 * so what is decided here is what each list says and where each row goes,
 * assertable without Zero.
 *
 * **Two tabs, the paper's two directions** (user-decided 2026-09-15): *cites*,
 * its forward edges, and *cited by*, the papers in the collection that point
 * back at it. Inside *cites*, papers you have come first, because they are the
 * ones you can follow; the rest follow under *elsewhere* and leave for Semantic
 * Scholar. A first version had three tabs — in your collection, cited by, not
 * in your collection — and the labels read as three places rather than two
 * directions.
 *
 * **The page's own controls sit at the end of the tab row.** They live in the
 * reader's toolbar while the paper shows, and the reader is hidden now — without
 * them here a phone would have no way back to the sidebar that brought it. Two
 * short tabs and the controls fit one row at a phone's width, so there is one
 * arrangement at every width.
 *
 * Semantic Scholar's credit is not here: it is in the tracker header's credits
 * (`-components/credits/credits.tsx`).
 */

const SYNCING_MESSAGE = 'loading…'
const ERROR_MESSAGE = 'could not load the citations of this paper.'

const TABS: { id: CitationTab; label: string }[] = [
  { id: 'cites', label: 'cites' },
  { id: 'cited-by', label: 'cited by' },
]

interface CitationsViewProps {
  /** The paper whose citations these are — the step a followed link records. */
  articleId: string
  state: CitationsState
  lists: CitationLists
  /** The page's controls: the sidebar sheet's trigger and the article menu. */
  actions?: ReactNode
}

export function CitationsView({
  articleId,
  state,
  lists,
  actions,
}: CitationsViewProps) {
  const counts: Record<CitationTab, number> = {
    cites: citesCount(lists),
    'cited-by': lists.citedBy.length,
  }

  return (
    <section className={styles.view} aria-label="citations">
      <Tabs.Root className={styles.tabsRoot} defaultValue={TABS[0]?.id}>
        <div className={styles.header}>
          <Tabs.List className={styles.tabs}>
            {TABS.map((tab) => (
              <Tabs.Tab key={tab.id} className={styles.tab} value={tab.id}>
                {/* `data-label` sizes the word at its bold width whether or
                    not it is selected, so choosing a tab does not push the
                    one after it sideways (see the stylesheet). */}
                <span className={styles.label} data-label={tab.label}>
                  {tab.label}
                </span>{' '}
                {/* Counts only once they mean something: "0" while syncing
                    would claim an answer that has not arrived. */}
                {state === 'ready' ? (
                  <span className={styles.count}>{counts[tab.id]}</span>
                ) : null}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {actions !== undefined && (
            <div className={styles.actions}>{actions}</div>
          )}
        </div>

        {TABS.map((tab) => (
          <Tabs.Panel key={tab.id} className={styles.panel} value={tab.id}>
            <div className={styles.column}>
              <PanelContents
                tab={tab.id}
                state={state}
                lists={lists}
                articleId={articleId}
              />
            </div>
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </section>
  )
}

interface PanelContentsProps {
  tab: CitationTab
  state: CitationsState
  lists: CitationLists
  articleId: string
}

function PanelContents({ tab, state, lists, articleId }: PanelContentsProps) {
  if (state === 'syncing') {
    return <p className={styles.notice}>{SYNCING_MESSAGE}</p>
  }
  if (state === 'error') {
    return <p className={styles.notice}>{ERROR_MESSAGE}</p>
  }

  const notice = citationNotice(tab, lists)
  const sentence =
    notice === null ? null : (
      <p className={styles.notice}>{noticeText(notice)}</p>
    )

  if (tab === 'cited-by') {
    return (
      <>
        {sentence}
        <ArticleList
          label="cited by"
          articles={lists.citedBy}
          fromId={articleId}
        />
      </>
    )
  }

  const { inCollection, elsewhere } = lists.cites
  return (
    <>
      {sentence}
      {inCollection.length > 0 && (
        <Group title="in your collection" count={inCollection.length}>
          <ArticleList
            label="cites, in your collection"
            articles={inCollection}
            fromId={articleId}
          />
        </Group>
      )}
      {elsewhere.length > 0 && (
        <Group title="elsewhere" count={elsewhere.length}>
          <OutsideList references={elsewhere} />
        </Group>
      )}
    </>
  )
}

/** A heading over one group of a tab's rows, with how many it holds. */
function Group({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <div className={styles.group}>
      <h2 className={styles.groupTitle}>
        {title} <span className={styles.count}>· {count}</span>
      </h2>
      {children}
    </div>
  )
}

/** Papers in the collection. Each one opens that paper's reader. */
function ArticleList({
  label,
  articles,
  fromId,
}: {
  label: string
  articles: CitationArticle[]
  /** The paper being left, which is the step the path records. */
  fromId: string
}) {
  if (articles.length === 0) {
    return null
  }
  return (
    <ul className={styles.list} aria-label={label}>
      {articles.map((article) => (
        <li key={article.id}>
          {/*
            A real link, so it can be opened in a new tab like any other. The
            search drops `view`, so the paper opens on its reader rather than on
            its own citations; the collection's filters ride along untouched.

            `via` records the hop: the paper being left joins the way back, and
            opening one already on it cuts the path back to it rather than
            growing a loop (`~/lit-tracker/citation-path`).
          */}
          <Link
            className={styles.row}
            to="/lit-tracker/$articleId"
            params={{ articleId: article.id }}
            search={(previous) => ({
              ...previous,
              view: undefined,
              via: nextVia(previous.via ?? [], fromId, article.id),
            })}
          >
            <span className={styles.text}>
              <span className={styles.title}>{article.title}</span>
              <Byline
                authors={article.authors}
                year={article.publicationYear}
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** References outside the collection: a way out to Semantic Scholar, or text. */
function OutsideList({ references }: { references: OutsideReference[] }) {
  return (
    <ul className={styles.list} aria-label="cites, elsewhere">
      {references.map((reference) => {
        const content = <ReferenceText reference={reference} />
        return (
          <li key={reference.id}>
            {reference.semanticScholarUrl ? (
              <a
                className={styles.row}
                href={reference.semanticScholarUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
                <span className={styles.external}>
                  <ExternalLink
                    className={styles.externalIcon}
                    aria-hidden="true"
                  />
                  <span className={styles.visuallyHidden}>
                    (opens Semantic Scholar in a new tab)
                  </span>
                </span>
              </a>
            ) : (
              // Not a link, so it must not look like one: the same row, in the
              // plain text colour, with nothing to press.
              <div className={`${styles.row} ${styles.plain}`}>{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The reference as the paper printed it when that survives, because that is the
 * text a reader recognises from the paper's last pages. Otherwise the parsed
 * title, authors and year.
 */
function ReferenceText({ reference }: { reference: OutsideReference }) {
  if (reference.rawText) {
    return <span className={styles.printed}>{reference.rawText}</span>
  }
  return (
    <span className={styles.text}>
      <span className={styles.title}>{reference.title}</span>
      <Byline authors={reference.authors} year={reference.publicationYear} />
    </span>
  )
}

function Byline({
  authors,
  year,
}: {
  authors: CitationArticle['authors']
  year: number | null
}) {
  return (
    <span className={styles.byline}>
      {year === null
        ? formatAuthors(authors)
        : `${formatAuthors(authors)} · ${year}`}
    </span>
  )
}
