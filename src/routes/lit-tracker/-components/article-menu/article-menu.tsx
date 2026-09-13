import { Popover } from '@base-ui/react/popover'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { ArticleDeleteDialog } from '~/routes/lit-tracker/-components/article-delete/article-delete-dialog'
import type {
  ArticleDetails,
  EditableArticle,
} from '~/routes/lit-tracker/-components/article-edit/article-draft'
import { ArticleEditDialog } from '~/routes/lit-tracker/-components/article-edit/article-edit-dialog'
import type { MutationFailure } from '~/routes/lit-tracker/-hooks/use-mutation-runner'
import type { ArticleTagControlsProps } from './article-tag-controls'
import { ArticleTagControls } from './article-tag-controls'
import styles from './article-menu.module.css'

// Re-exported from where the controls now live, so the many modules that name a
// tag keep one import rather than following the split.
export type { CollectionTag } from './article-tag-controls'
export { EMPTY_TAGS_MESSAGE } from './article-tag-controls'

/**
 * Saving a correction, as every surface that mounts this menu must supply it.
 *
 * Named here rather than spelled out three times: the card and the detail page
 * both pass it straight through from `useArticleMutations`, and a shape written
 * out at each is a shape that can disagree at one of them.
 */
export type SaveArticleDetails = (
  details: ArticleDetails,
) => Promise<MutationFailure | null>

interface ArticleMenuProps extends ArticleTagControlsProps {
  /**
   * The article this menu is about — what names the trigger, so twenty cards do
   * not all announce "options", and what "edit…" opens on.
   *
   * The whole editable row rather than just its title, because the menu is the
   * decided entry point for correcting one and a second prop carrying the same
   * article's other five fields would be the same thing said twice.
   */
  article: EditableArticle
  /**
   * Saves a correction, answering with what to tell the reader if it did not
   * land. The dialog stays open on a failure and shows it inline, which is why
   * this reports rather than raising a toast.
   */
  onSaveDetails: SaveArticleDetails
  /**
   * Deletes the article, once the reader has confirmed.
   *
   * Returns nothing, unlike `onSaveDetails`: the confirmation closes as the
   * write is sent rather than waiting for it (see `ArticleDeleteDialog`), so
   * there is no form left for a refusal to be shown in and the shared runner's
   * toast is where it goes. The two surfaces do differ in what they do *next* —
   * the detail page has to leave the page it is on — which is why this is a
   * callback rather than something this menu performs itself.
   */
  onDelete: () => void
  /**
   * What the paper *is*, shown above the controls that change it.
   *
   * Optional because only one surface has anything to put here. A card already
   * shows its own title, authors and venue, so repeating them in its menu would
   * be noise; the detail page no longer shows them anywhere else, so this is
   * where they live (`~/routes/lit-tracker/-article-detail/article-details.tsx`).
   * Taken as an element so this shared component stays free of any one page's
   * idea of what an article's details are.
   */
  details?: ReactNode
  /**
   * Dim and disable what is behind the menu while it is open.
   *
   * Off by default, and on for the article page. On the collection grid the menu
   * floats over cards, which are inert anyway — a dimming overlay there would be
   * weight for nothing. Over the reader it floats above a toolbar that stays
   * visible and clickable through a popup otherwise, which reads as two live
   * surfaces at once (user-decided 2026-08-13).
   */
  modal?: boolean
}

/**
 * The card's three-dot control: a popover holding reading status and tags.
 *
 * The decided entry point for editing an article
 * (research/ui-ux/pages/lit-tracker/components/article-edit.md), which is why
 * everything lands here — #11 adds "edit…" and "delete…" to *this* rather than
 * building a second control beside it. #9's detail page mounts this same menu
 * beside its title, for the same reason. "edit…" is here now; "delete…" arrives
 * with #11's second task and belongs below it, separated, because an
 * irreversible action must never be one stray press from an everyday one.
 *
 * **Why a popover rather than a menu.** It was a `Menu` first, built from
 * `RadioItem`s and `CheckboxItem`s, and that was the right shape until a reader
 * with a real number of tags used it. Three things broke at once, and all three
 * are the same problem: a menu is one flat list of items, so it scrolls as one.
 * Scrolling to a tag scrolled the reading status out of view; "new tag" sat past
 * the end of the tag list, so making one meant scrolling to the bottom first;
 * and there was nowhere to put a filter field, because a `menu` role's children
 * are `menuitem`s and a textbox among them breaks the keyboard model that makes
 * a menu a menu. A popover has no such contract, so the regions inside can
 * behave differently — and only one of them scrolls.
 *
 * **What is left in this file is the popover and nothing else.** The controls
 * moved out when #9's sidebar needed the identical ones inline
 * (`article-tag-controls.tsx`); this is now the card's way of reaching them.
 */
export function ArticleMenu({
  article,
  onSaveDetails,
  onDelete,
  details,
  modal = false,
  ...controls
}: ArticleMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    // A fragment, and the dialog is the popover's *sibling* rather than its
    // child. Rendered inside, it would inherit the popover's lifetime — and the
    // popover closes on the way into the dialog, which would unmount the form
    // the moment it opened. This is also why the dialog is told where to put
    // focus afterwards: the button that opened it no longer exists by then, and
    // the trigger it belongs to does.
    <>
      <Popover.Root modal={modal}>
        <Popover.Trigger
          ref={triggerRef}
          className={styles.trigger}
          aria-label={`Options for ${article.title}`}
        >
          <MoreHorizontal className={styles.triggerIcon} aria-hidden="true" />
        </Popover.Trigger>

        <Popover.Portal>
          {/* Only in the modal case: without it the surface behind stays fully
              lit, and nothing says the menu is the only live thing on screen. */}
          {modal && <Popover.Backdrop className={styles.backdrop} />}
          <Popover.Positioner
            className={styles.positioner}
            sideOffset={4}
            align="end"
          >
            <Popover.Popup className={styles.popup}>
              {/* Wrapped rather than styled in place: the height limit belongs
                  to this menu, not to any page's idea of what an article's
                  details are. */}
              {details !== undefined && (
                <div className={styles.details}>{details}</div>
              )}
              <ArticleTagControls {...controls} />

              {/* Below the everyday controls, because correcting the record is
                  the rarer errand. */}
              <Popover.Close
                className={styles.action}
                onClick={() => setEditing(true)}
              >
                <Pencil className={styles.actionIcon} aria-hidden="true" />
                edit…
              </Popover.Close>

              {/* Last, alone, and in the error colour. It is the only
                  irreversible thing on this menu, so it is the furthest from
                  the controls a reader touches every day and never shares a
                  hairline with one of them. */}
              <Popover.Close
                className={styles.destructiveAction}
                onClick={() => setDeleting(true)}
              >
                <Trash2 className={styles.actionIcon} aria-hidden="true" />
                delete…
              </Popover.Close>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <ArticleEditDialog
        article={article}
        open={editing}
        onOpenChange={setEditing}
        onSave={onSaveDetails}
        finalFocus={triggerRef}
      />

      <ArticleDeleteDialog
        articleTitle={article.title}
        open={deleting}
        onOpenChange={setDeleting}
        onDelete={onDelete}
        finalFocus={triggerRef}
      />
    </>
  )
}
