import { Popover } from '@base-ui/react/popover'
import { MoreHorizontal } from 'lucide-react'
import type { ArticleTagControlsProps } from './article-tag-controls'
import { ArticleTagControls } from './article-tag-controls'
import styles from './article-menu.module.css'

// Re-exported from where the controls now live, so the many modules that name a
// tag keep one import rather than following the split.
export type { CollectionTag } from './article-tag-controls'
export { EMPTY_TAGS_MESSAGE } from './article-tag-controls'

interface ArticleMenuProps extends ArticleTagControlsProps {
  /** Names the trigger, so twenty cards do not all announce "options". */
  articleTitle: string
}

/**
 * The card's three-dot control: a popover holding reading status and tags.
 *
 * The decided entry point for editing an article
 * (research/ui-ux/pages/lit-tracker/components/article-edit.md), which is why
 * everything lands here — #11 adds "edit…" and "delete…" to *this* rather than
 * building a second control beside it. #9's detail page mounts this same menu
 * beside its title, for the same reason.
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
export function ArticleMenu({ articleTitle, ...controls }: ArticleMenuProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={styles.trigger}
        aria-label={`Options for ${articleTitle}`}
      >
        <MoreHorizontal className={styles.triggerIcon} aria-hidden="true" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          className={styles.positioner}
          sideOffset={4}
          align="end"
        >
          <Popover.Popup className={styles.popup}>
            <ArticleTagControls {...controls} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
