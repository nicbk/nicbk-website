import { Tabs } from '@base-ui/react/tabs'
import { Highlighter, ListTree, Network, NotebookPen, Tag } from 'lucide-react'
import { useState } from 'react'
import type { ContentsEntry } from '~/lit-tracker/contents/contents'
import { ArticleTagControls } from '~/routes/lit-tracker/-components/article-menu/article-tag-controls'
import { useArticleMutations } from '~/routes/lit-tracker/-hooks/use-article-mutations'
import { AnnotationsPanel } from './annotations-panel'
import type { ArticleView } from './article-view'
import { ContentsPanel } from './contents/contents-panel'
import { useArticleContents } from './contents/use-article-contents'
import { useContentsFolds } from './contents/use-contents-folds'
import { NotesPanel } from './notes-panel'
import type { JumpToPage } from './reader-jump'
import { useReaderJump } from './reader-jump'
import { useSidebarTabRequests } from './sidebar-request'
import { useArticleAnnotations } from './use-article-annotations'
import { useArticleDetail } from './use-article-detail'
import styles from './article-sidebar.module.css'

/**
 * The tabs, in the decided order.
 *
 * Declared as data rather than as JSX so the things that must agree — the tab,
 * its panel, its glyph — cannot drift apart, and so #10's Citations tab is one
 * entry rather than edits in three places.
 *
 * The decided sidebar has **five** tabs, in this order. Citations arrived with
 * the citation graph it opens (#10) — until then it was absent rather than
 * disabled, because a tab is not rendered before its contents exist. Contents
 * arrived with #29 (features/a-paper-shows-its-contents), between Citations and
 * Annotations, so the two tabs that steer the reader sit together.
 *
 * **Each tab is a word or a glyph, by container width** (user-decided
 * 2026-08-17): the strip shows the words where they fit on one line — the
 * narrow-screen sheet — and in the rail, which cannot fit three words in one
 * row, every tab drops its word for its glyph, keeping the word as its
 * accessible name and its tooltip. The same trade the reader's toolbar
 * triggers already make at their narrow breakpoint, chosen here over a
 * wrapped two-line strip, which read as ragged.
 */
const TABS = [
  { id: 'tags', icon: Tag },
  { id: 'notes', icon: NotebookPen },
  { id: 'citations', icon: Network },
  { id: 'contents', icon: ListTree },
  { id: 'annotations', icon: Highlighter },
] as const

type TabId = (typeof TABS)[number]['id']

/** The tabs whose panel is the sidebar's own, rather than the page's main area. */
export type PanelTab = Exclude<TabId, 'citations'>

/** The tab a sidebar opens on, and returns to for each new article. */
const DEFAULT_TAB: PanelTab = 'tags'

/** A paper with no entries to fold, as one stable value. */
const NO_ENTRIES: readonly ContentsEntry[] = []

interface ArticleSidebarProps {
  articleId: string
  /** Which main view the page is showing; Citations is selected exactly when it is that one. */
  view: ArticleView
  /**
   * Asks for the other main view. Called only when the choice changes it:
   * choosing Citations, or leaving Citations for any other tab.
   */
  onViewChange: (view: ArticleView) => void
  /**
   * The tab to open on, for a sidebar opened to show one thing — the sheet the
   * toolbar's *contents* button opens. The default tab otherwise.
   */
  initialTab?: PanelTab
  /**
   * Called after one of the lists has moved the reader. The sheet closes on it:
   * on a phone the sheet covers the reader, and the reader is what the reader
   * chose an entry to see.
   */
  onReaderJump?: () => void
}

/**
 * The article's own sidebar: what the reader keeps *about* the paper, beside the
 * paper itself.
 *
 * **It queries for itself rather than taking props**, because it renders in two
 * places that cannot both be reached by a prop path — the shell's rail, which is
 * outside the page entirely (see `route.tsx`), and the narrow-screen sheet the
 * summary row opens. That is the same arrangement the collection's filters live
 * with. Zero keys its views by query hash, so two callers asking the same
 * question share one subscription rather than making two.
 *
 * Only one of the two is ever showing: the rail hides itself below the
 * breakpoint and the sheet's trigger is hidden above it, so the tab state being
 * per-instance is not a state that can be observed twice.
 *
 * **The Tags tab is the card menu's controls, unwrapped.** The decided spec
 * describes it as this article's tags "edited via toggle (including its
 * reading-status tag)" — which is precisely what the card's popover already
 * holds, so the popover and this panel render the same component with different
 * things around it (`article-tag-controls.tsx`).
 */
/**
 * Names the sheet and its trigger, and the rail on wide screens.
 *
 * It lives beside the sidebar it names rather than beside the control that
 * opens it — that control has now moved twice, and the label should not travel
 * with it.
 */
export const SIDEBAR_LABEL = 'article'

export function ArticleSidebar({
  articleId,
  view,
  onViewChange,
  initialTab,
  onReaderJump,
}: ArticleSidebarProps) {
  const { state, article } = useArticleDetail(articleId)

  // Nothing to edit until the row is here. Rendering the tabs against an absent
  // article would offer controls that write to an id whose ownership has not
  // been confirmed yet, and would flash an empty tag list on every cold load.
  if (state !== 'ready' || article === undefined) {
    return null
  }

  return (
    // Keyed by the article, so following a citation to another paper opens its
    // sidebar on the default tab rather than on whatever the last paper had
    // showing (features/citation-graph-traversal, task 4).
    <SidebarTabs
      key={articleId}
      articleId={articleId}
      view={view}
      onViewChange={onViewChange}
      initialTab={initialTab}
      onReaderJump={onReaderJump}
    />
  )
}

/**
 * The tabs themselves, once there is an article to show them for.
 *
 * **Which tab is selected is partly this instance's and partly the URL's.**
 * Tags, Notes, Contents and Annotations are panels inside the sidebar, and
 * which of them is open is nobody else's business — each copy of the sidebar
 * keeps its own.
 * Citations is different: it swaps the page's main area, so it is selected
 * exactly when the URL says the citations view is showing, in every copy at
 * once. Leaving Citations for another tab is what brings the reader back; there
 * is no separate control for that.
 */
function SidebarTabs({
  articleId,
  view,
  onViewChange,
  initialTab = DEFAULT_TAB,
  onReaderJump,
}: ArticleSidebarProps) {
  const { article, tags, allTags } = useArticleDetail(articleId)
  const mutations = useArticleMutations()
  const annotations = useArticleAnnotations(articleId)
  const contents = useArticleContents(articleId, article?.extractionStatus)
  const folds = useContentsFolds(
    articleId,
    contents.kind === 'entries' ? contents.entries : NO_ENTRIES,
  )
  const readerJump = useReaderJump()
  const [panel, setPanel] = useState<PanelTab>(initialTab)

  // The toolbar's *contents* button, reaching the rail's copy of this sidebar
  // (`sidebar-request.tsx`). Choosing it here as a reader would, so a request
  // made while the citation graph shows brings the paper back too.
  useSidebarTabRequests((tab) => choose(tab))

  // Both lists move the reader the same way, and either may close a sheet.
  const jumpToPage: JumpToPage = (pageIndex, top) => {
    if (top === undefined) {
      readerJump(pageIndex)
    } else {
      readerJump(pageIndex, top)
    }
    onReaderJump?.()
  }

  // Checked by the caller already; narrowed again here for the types.
  if (article === undefined) {
    return null
  }

  const selected: TabId = view === 'citations' ? 'citations' : panel

  function choose(tab: TabId) {
    if (tab === 'citations') {
      onViewChange('citations')
      return
    }
    setPanel(tab)
    if (view === 'citations') {
      onViewChange('reader')
    }
  }

  const appliedTagIds = new Set(tags.map((tag) => tag.id))

  return (
    <Tabs.Root
      className={styles.sidebar}
      value={selected}
      onValueChange={(value: TabId) => choose(value)}
    >
      {/*
        **Manual activation** — arrow keys move focus, Enter or Space selects —
        which is Base UI's default and is kept deliberately rather than by
        accident. WAI-ARIA prefers automatic activation only while every panel
        displays "without noticeable latency", and this tab list is about to
        stop qualifying: the Citations tab swaps the *main content area* for the
        citation graph, so arrowing past it would hide the paper nobody asked to
        stop reading.
      */}
      <Tabs.List className={styles.tabs}>
        {TABS.map((tab) => (
          <Tabs.Tab
            key={tab.id}
            className={styles.tab}
            value={tab.id}
            // The name is the word whether or not the word is drawn — in the
            // rail only the glyph is, and `title` gives pointer users the same
            // word as a tooltip that assistive tech gets from the label.
            aria-label={tab.id}
            title={tab.id}
          >
            <tab.icon className={styles.tabIcon} aria-hidden="true" />
            <span className={styles.tabLabel}>{tab.id}</span>
          </Tabs.Tab>
        ))}
      </Tabs.List>

      <Tabs.Panel className={styles.panel} value="tags">
        <ArticleTagControls
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
      </Tabs.Panel>

      <Tabs.Panel className={styles.panel} value="notes">
        {/*
          Keyed by the article, so navigating from one paper to another gives
          the field a fresh instance rather than carrying an unwritten draft
          across — and the unmount that entails flushes that draft through the
          old article's own `onSave`, which is where it belongs.
        */}
        <NotesPanel
          key={articleId}
          notes={article.notes}
          onSave={(notes) => mutations.setNotes(articleId, notes)}
        />
      </Tabs.Panel>

      <Tabs.Panel className={styles.panel} value="citations">
        {/*
          Nothing in the sidebar: what this tab opens is the page's main area
          (`citations/citations-view.tsx`). Saying so here keeps the panel from
          reading as an empty tab to someone arriving by keyboard.
        */}
        <p className={styles.notice}>
          citations are open on the page. choose another tab to return to the
          paper.
        </p>
      </Tabs.Panel>

      <Tabs.Panel className={styles.panel} value="contents">
        {/*
          Like Annotations, this tab steers the reader and does not replace it.
          Reaching it from the citation graph has already brought the reader
          back (`choose` above), so an entry's jump always lands on a reader
          that is showing.
        */}
        <ContentsPanel view={contents} folds={folds} onJump={jumpToPage} />
      </Tabs.Panel>

      <Tabs.Panel className={styles.panel} value="annotations">
        {/*
          Selecting this tab must not swap the main content area — the decided
          contrast with the Citations tab. Upholding it costs nothing here
          (the reader is another panel entirely, and the only reach into it is
          the jump), but the invariant belongs to this tab, so it is stated
          where the tab is made.
        */}
        <AnnotationsPanel
          state={annotations.state}
          annotations={annotations.annotations}
          onJumpToPage={jumpToPage}
        />
      </Tabs.Panel>
    </Tabs.Root>
  )
}
