import { Menu } from '@base-ui/react/menu'
import { Check, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import {
  ARTICLE_STATUS_LABELS,
  ARTICLE_STATUSES,
} from '~/lit-tracker/article-status'
import { NewTagDialog } from './new-tag-dialog'
import styles from './article-menu.module.css'

/** A tag as this menu needs it: something to name and something to identify. */
export interface CollectionTag {
  id: string
  name: string
}

interface ArticleMenuProps {
  /** Names the trigger, so twenty cards do not all announce "options". */
  articleTitle: string
  status: ArticleStatus
  /** Every tag the reader has, whether or not this article carries it. */
  allTags: readonly CollectionTag[]
  /** Which of them this article carries. */
  appliedTagIds: ReadonlySet<string>
  onSetStatus: (status: ArticleStatus) => void
  onToggleTag: (tagId: string, applied: boolean) => void
  onCreateTag: (name: string) => void
}

/**
 * The card's three-dot menu: where reading status is set and tags are applied.
 *
 * The decided entry point for editing an article
 * (research/ui-ux/pages/lit-tracker/components/article-edit.md), which is why
 * this is a menu and not a bespoke panel — #11 adds "edit…" and "delete…" to
 * *this* rather than building a second control beside it.
 *
 * **Why the parts are what they are.** The task's plan proposed a `ToggleGroup`
 * for status and a `Combobox` for tag entry, placed inside the menu. Both were
 * replaced during implementation, for one reason: a menu's children are
 * `menuitem`s, and putting a toolbar or a textbox inside one breaks the role
 * contract that makes the whole thing keyboard-navigable in the first place.
 * Base UI has menu-native equivalents that carry the same semantics —
 * `RadioGroup`/`RadioItem` for a mutually-exclusive choice, `CheckboxItem` for
 * a toggle — and they say what a toggle group and a combobox would only have
 * looked like. Creating a tag needs a text field, which no menu can host, so
 * it uses Base UI's own documented menu-opens-a-dialog pattern.
 *
 * Nothing here writes. Every branch calls a prop, which is what lets the menu's
 * behaviour be asserted without a Zero client anywhere near it.
 */
export function ArticleMenu({
  articleTitle,
  status,
  allTags,
  appliedTagIds,
  onSetStatus,
  onToggleTag,
  onCreateTag,
}: ArticleMenuProps) {
  const [isNamingTag, setIsNamingTag] = useState(false)

  /**
   * What a typed tag name means, which is the reason there is no separate
   * "manage tags" screen: a name the reader already has **applies that tag**,
   * and one they do not **creates it**. Typing "attention" twice must not leave
   * two tags called "attention".
   *
   * Matched case-insensitively, because "Attention" and "attention" are the same
   * label to the person typing them. The existing tag keeps its own spelling —
   * the reader is picking it, not renaming it.
   */
  function submitTagName(name: string) {
    const existing = allTags.find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase(),
    )
    if (existing) {
      onToggleTag(existing.id, true)
      return
    }
    onCreateTag(name)
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className={styles.trigger}
          aria-label={`Options for ${articleTitle}`}
        >
          <MoreHorizontal className={styles.triggerIcon} aria-hidden="true" />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner
            className={styles.positioner}
            sideOffset={4}
            align="end"
          >
            <Menu.Popup className={styles.popup}>
              {/*
                Radio, not checkbox: the three statuses are one column's value,
                so choosing one clears the previous with no second write and no
                constraint enforcing it. `closeOnClick` defaults to false on
                these items, which is what lets a reader set a status and go on
                to pick tags without reopening the menu.
              */}
              <Menu.RadioGroup
                value={status}
                onValueChange={(next) => onSetStatus(next as ArticleStatus)}
              >
                <Menu.GroupLabel className={styles.groupLabel}>
                  reading status
                </Menu.GroupLabel>
                {ARTICLE_STATUSES.map((option) => (
                  <Menu.RadioItem
                    key={option}
                    value={option}
                    className={styles.item}
                  >
                    <Menu.RadioItemIndicator className={styles.indicator}>
                      <Check className={styles.indicatorIcon} />
                    </Menu.RadioItemIndicator>
                    <span className={styles.itemLabel}>
                      {ARTICLE_STATUS_LABELS[option]}
                    </span>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>

              <Menu.Separator className={styles.separator} />

              <Menu.Group>
                <Menu.GroupLabel className={styles.groupLabel}>
                  tags
                </Menu.GroupLabel>

                {allTags.map((tag) => (
                  <Menu.CheckboxItem
                    key={tag.id}
                    checked={appliedTagIds.has(tag.id)}
                    onCheckedChange={(applied) => onToggleTag(tag.id, applied)}
                    className={styles.item}
                  >
                    <Menu.CheckboxItemIndicator className={styles.indicator}>
                      <Check className={styles.indicatorIcon} />
                    </Menu.CheckboxItemIndicator>
                    <span className={styles.itemLabel}>{tag.name}</span>
                  </Menu.CheckboxItem>
                ))}

                {/*
                  Opens the naming dialog rather than doing anything itself. The
                  menu closes as it goes — that is `Menu.Item`'s default and the
                  right one here, because focus is about to move into a text
                  field somewhere else entirely.
                */}
                <Menu.Item
                  className={styles.item}
                  onClick={() => setIsNamingTag(true)}
                >
                  <span className={styles.indicator} aria-hidden="true" />
                  <span className={styles.itemLabel}>new tag…</span>
                </Menu.Item>
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <NewTagDialog
        open={isNamingTag}
        onOpenChange={setIsNamingTag}
        articleTitle={articleTitle}
        onSubmit={submitTagName}
      />
    </>
  )
}
