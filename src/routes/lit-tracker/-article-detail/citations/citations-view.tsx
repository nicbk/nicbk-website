import { Tabs } from '@base-ui/react/tabs'
import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { ExternalLink, Globe, Library, Quote } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatAuthors } from '~/routes/lit-tracker/-collection-page/authors'
import type {
  CitationArticle,
  CitationLists,
  CitationTab,
  OutsideReference,
} from './citation-lists'
import { citationNotices, noticeText } from './citation-lists'
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
 * **Three tabs, the reader's three questions**: which of my papers does it
 * build on, which of my papers build on it, and what else does it cite. Each
 * says how many, so an empty tab is known before it is opened.
 *
 * **The page's own controls come with it.** They live in the reader's toolbar
 * while the paper shows, and the reader is hidden now — without them here a
 * phone would have no way back to the sidebar that brought it. At the end of
 * the tab row where there is room; on a narrow panel, at the end of the credit
 * row instead, where they cost no height (user-decided 2026-09-15).
 */

const SYNCING_MESSAGE = 'loading…'
const ERROR_MESSAGE = 'could not load the citations of this paper.'
const SEMANTIC_SCHOLAR_HOME = 'https://www.semanticscholar.org'

/**
 * The three tabs.
 *
 * **A narrow panel shows each tab's glyph, count and short word instead of its
 * full words** (user-decided 2026-09-15). The full labels need about fifty
 * characters, and a phone's panel has room for about forty, so they wrapped to
 * four lines a tab. The glyph carries what the short word leaves out — the
 * library is your collection, the quotation mark is others citing it, the globe
 * is the literature beyond it — and the full label stays the tab's accessible
 * name at every width.
 */
const TABS: {
  id: CitationTab
  label: string
  shortLabel: string
  icon: LucideIcon
}[] = [
  {
    id: 'in-collection',
    label: 'in your collection',
    shortLabel: 'collection',
    icon: Library,
  },
  { id: 'cited-by', label: 'cited by', shortLabel: 'cited by', icon: Quote },
  {
    id: 'outside',
    label: 'not in your collection',
    shortLabel: 'elsewhere',
    icon: Globe,
  },
]

interface CitationsViewProps {
  state: CitationsState
  lists: CitationLists
  /** Semantic Scholar's count of this paper's references, when it has one. */
  referenceCount: number | null
  /** The page's controls: the sidebar sheet's trigger and the article menu. */
  actions?: ReactNode
}

export function CitationsView({
  state,
  lists,
  referenceCount,
  actions,
}: CitationsViewProps) {
  const counts: Record<CitationTab, number> = {
    'in-collection': lists.inCollection.length,
    'cited-by': lists.citedBy.length,
    outside: lists.outside.length,
  }

  return (
    <section className={styles.view} aria-label="citations">
      {/*
        The root lays nothing out (`display: contents`): the tab list, the
        controls, the panels and the credit are placed by the section's grid,
        which is what lets the controls change rows at a narrow width without
        being rendered twice — they hold the sheet, and two would be two sheets.
      */}
      <Tabs.Root className={styles.tabsRoot} defaultValue={TABS[0]?.id}>
        <Tabs.List className={styles.tabs}>
          {TABS.map((tab) => {
            // Counts only once they mean something: "0" while syncing would
            // claim an answer that has not arrived.
            const count = state === 'ready' ? counts[tab.id] : null
            return (
              <Tabs.Tab
                key={tab.id}
                className={styles.tab}
                value={tab.id}
                aria-label={
                  count === null ? tab.label : `${tab.label} ${count}`
                }
              >
                <tab.icon className={styles.tabIcon} aria-hidden="true" />
                {/* `data-label` sizes the word at its bold width whether or
                    not it is selected, so choosing a tab does not push the
                    ones after it sideways (see the stylesheet). */}
                <span className={styles.label} data-label={tab.label}>
                  {tab.label}
                </span>
                <span className={styles.shortLabel}>{tab.shortLabel}</span>
                {count === null ? null : (
                  <span className={styles.count}>{count}</span>
                )}
              </Tabs.Tab>
            )
          })}
        </Tabs.List>

        {actions !== undefined && (
          <div className={styles.actions}>{actions}</div>
        )}

        {TABS.map((tab) => (
          <Tabs.Panel key={tab.id} className={styles.panel} value={tab.id}>
            <div className={styles.column}>
              <PanelContents
                tab={tab.id}
                state={state}
                lists={lists}
                referenceCount={referenceCount}
              />
            </div>
          </Tabs.Panel>
        ))}

        {/*
          The credit Semantic Scholar's licence asks for, wherever its data is
          shown (research/licensing/third-party-attribution-requirements.md).
          Outside the panels so it is visible whichever tab is open.
        */}
        <p className={styles.credit}>
          data from{' '}
          <a
            href={SEMANTIC_SCHOLAR_HOME}
            target="_blank"
            rel="noopener noreferrer"
          >
            Semantic Scholar
          </a>
        </p>
      </Tabs.Root>
    </section>
  )
}

interface PanelContentsProps {
  tab: CitationTab
  state: CitationsState
  lists: CitationLists
  referenceCount: number | null
}

function PanelContents({
  tab,
  state,
  lists,
  referenceCount,
}: PanelContentsProps) {
  if (state === 'syncing') {
    return <p className={styles.notice}>{SYNCING_MESSAGE}</p>
  }
  if (state === 'error') {
    return <p className={styles.notice}>{ERROR_MESSAGE}</p>
  }

  const notices = citationNotices(tab, lists, referenceCount)

  return (
    <>
      {notices.map((notice) => (
        <p key={notice.kind} className={styles.notice}>
          {noticeText(notice)}
        </p>
      ))}
      {tab === 'outside' ? (
        <OutsideList references={lists.outside} />
      ) : (
        <ArticleList
          label={tab === 'cited-by' ? 'cited by' : 'cites, in your collection'}
          articles={tab === 'cited-by' ? lists.citedBy : lists.inCollection}
        />
      )}
    </>
  )
}

/** Papers in the collection. Each one opens that paper's reader. */
function ArticleList({
  label,
  articles,
}: {
  label: string
  articles: CitationArticle[]
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
          */}
          <Link
            className={styles.row}
            to="/lit-tracker/$articleId"
            params={{ articleId: article.id }}
            search={(previous) => ({ ...previous, view: undefined })}
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
  if (references.length === 0) {
    return null
  }
  return (
    <ul className={styles.list} aria-label="cites, not in your collection">
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
