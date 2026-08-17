import { Tabs } from '@base-ui/react/tabs'
import { ArticleTagControls } from '~/routes/lit-tracker/-components/article-menu/article-tag-controls'
import { useArticleMutations } from '~/routes/lit-tracker/-hooks/use-article-mutations'
import { AnnotationsPanel } from './annotations-panel'
import { NotesPanel } from './notes-panel'
import { useReaderJump } from './reader-jump'
import { useArticleAnnotations } from './use-article-annotations'
import { useArticleDetail } from './use-article-detail'
import styles from './article-sidebar.module.css'

/**
 * The tabs, in the decided order.
 *
 * Declared as data rather than as JSX so the two things that must agree — the
 * tab and its panel — cannot drift apart, and so #10's Citations tab is one
 * entry rather than two edits in two places.
 *
 * The decided sidebar has **four** tabs (Tags, Notes, Citations, Annotations).
 * Three exist now; **Citations arrives with the citation graph it opens**
 * (#10), because a tab is not rendered before its contents exist — a disabled
 * "Citations" would be a promise the page cannot keep, and an empty one is
 * worse. Annotations sits where the decided order puts it, which will be after
 * Citations once that tab exists between them.
 */
const TABS = ['tags', 'notes', 'annotations'] as const

interface ArticleSidebarProps {
  articleId: string
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

export function ArticleSidebar({ articleId }: ArticleSidebarProps) {
  const { state, article, tags, allTags } = useArticleDetail(articleId)
  const mutations = useArticleMutations()
  const annotations = useArticleAnnotations(articleId)
  const jumpToPage = useReaderJump()

  // Nothing to edit until the row is here. Rendering the tabs against an absent
  // article would offer controls that write to an id whose ownership has not
  // been confirmed yet, and would flash an empty tag list on every cold load.
  if (state !== 'ready' || article === undefined) {
    return null
  }

  const appliedTagIds = new Set(tags.map((tag) => tag.id))

  return (
    <Tabs.Root className={styles.sidebar} defaultValue={TABS[0]}>
      {/*
        **Manual activation** — arrow keys move focus, Enter or Space selects —
        which is Base UI's default and is kept deliberately rather than by
        accident. WAI-ARIA prefers automatic activation only while every panel
        displays "without noticeable latency", and this tab list is about to
        stop qualifying: #10's Citations tab swaps the *main content area* for
        the citation graph, so arrowing past it would build a graph nobody asked
        to see. Choosing the model now means the keyboard behaviour does not
        change under readers when that tab lands.
      */}
      <Tabs.List className={styles.tabs}>
        {TABS.map((tab) => (
          <Tabs.Tab key={tab} className={styles.tab} value={tab}>
            {tab}
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

      <Tabs.Panel className={styles.panel} value="annotations">
        {/*
          Selecting this tab must not swap the main content area — the decided
          contrast with #10's Citations tab. Upholding it costs nothing here
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
