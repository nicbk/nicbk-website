import { Checkbox } from '@base-ui/react/checkbox'
import { Popover } from '@base-ui/react/popover'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Check, MoreHorizontal, Plus } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useId, useState } from 'react'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import {
  ARTICLE_STATUS_LABELS,
  ARTICLE_STATUSES,
} from '~/lit-tracker/article-status'
// Shared with the filter rail, which lists the same tags for the opposite
// purpose and has to find them the same way.
import { matchingTags } from '~/lit-tracker/tag-matching'
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
 * The card's three-dot control: where reading status is set and tags are
 * applied.
 *
 * The decided entry point for editing an article
 * (research/ui-ux/pages/lit-tracker/components/article-edit.md), which is why
 * everything lands here — #11 adds "edit…" and "delete…" to *this* rather than
 * building a second control beside it.
 *
 * **Why a popover rather than a menu.** It was a `Menu` first, built from
 * `RadioItem`s and `CheckboxItem`s, and that was the right shape until a reader
 * with a real number of tags used it. Three things broke at once, and all three
 * are the same problem: a menu is one flat list of items, so it scrolls as one.
 * Scrolling to a tag scrolled the reading status out of view; "new tag" sat past
 * the end of the tag list, so making one meant scrolling to the bottom first;
 * and there was nowhere to put a filter field, because a `menu` role's children
 * are `menuitem`s and a textbox among them breaks the keyboard model that makes
 * a menu a menu. A popover has no such contract, so the three regions below can
 * behave differently — and only one of them scrolls.
 *
 * Nothing here writes. Every branch calls a prop, which is what lets this be
 * asserted without a Zero client anywhere near it.
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
  const [query, setQuery] = useState('')
  const statusLabelId = useId()
  const filterId = useId()

  const trimmed = query.trim()
  /**
   * What the list shows: everything the query matches, **plus every tag already
   * on this article**, in the tag list's own alphabetical order.
   *
   * An applied tag that stops matching must not disappear, for the same reason
   * it must not in the filter rail: the ticked boxes are how the reader knows
   * what this article already carries, and searching for one more tag should not
   * make the others look like they came off. It also keeps the un-tick within
   * reach — otherwise removing a tag means first clearing the field to find it.
   */
  const matchedIds = new Set(
    matchingTags(allTags, trimmed).map((tag) => tag.id),
  )
  const matching = allTags.filter(
    (tag) => matchedIds.has(tag.id) || appliedTagIds.has(tag.id),
  )
  const exact = exactMatch(allTags, trimmed)
  /** Only when the reader has typed something that is not already a tag. */
  const creatable = trimmed !== '' && exact === undefined

  /**
   * What Enter in the filter field means, which is the whole reason there is no
   * separate "manage tags" screen: a name the reader already has **applies that
   * tag**, and one they do not **creates it**. Typing "attention" twice must not
   * leave two tags called "attention", so the exact match wins over creating.
   */
  function submitQuery(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || trimmed === '') {
      return
    }
    // The field sits inside a popover; without this, Enter would also reach any
    // form the card is ever placed in.
    event.preventDefault()

    if (exact) {
      onToggleTag(exact.id, true)
    } else {
      onCreateTag(trimmed)
    }
    setQuery('')
  }

  function create() {
    onCreateTag(trimmed)
    setQuery('')
  }

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
            {/*
              Region one: never scrolls, because a reader hunting through tags
              should not lose sight of what the article's status is.

              Single-select by construction — `ToggleGroup` is single unless told
              otherwise — which mirrors the column underneath: one value, so
              choosing one clears the previous with no second write and no
              constraint enforcing it.
            */}
            <div className={styles.section}>
              <p className={styles.sectionLabel} id={statusLabelId}>
                reading status
              </p>
              <ToggleGroup
                className={styles.statusGroup}
                aria-labelledby={statusLabelId}
                value={[status]}
                onValueChange={(next) => {
                  const [chosen] = next
                  // An empty array means the reader pressed the status that was
                  // already set. Reading status cannot be *unset* — every
                  // article has one — so that is a no-op rather than a write.
                  if (chosen !== undefined) {
                    onSetStatus(chosen as ArticleStatus)
                  }
                }}
              >
                {ARTICLE_STATUSES.map((option) => (
                  <Toggle
                    key={option}
                    value={option}
                    className={styles.statusOption}
                  >
                    {ARTICLE_STATUS_LABELS[option]}
                  </Toggle>
                ))}
              </ToggleGroup>
            </div>

            <div className={styles.separator} />

            <div className={styles.section}>
              <label className={styles.sectionLabel} htmlFor={filterId}>
                tags
              </label>
              {/*
                Region two: also fixed. It is both the filter and the way a tag
                is created, so it has to stay reachable however long the list
                below it grows.
              */}
              <input
                id={filterId}
                className={styles.filter}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={submitQuery}
                placeholder="filter or add…"
                autoComplete="off"
                // Tag names are labels, not prose — "seq2seq" is not a typo,
                // and a red squiggle under one suggests it is.
                spellCheck={false}
                maxLength={MAX_TAG_NAME_LENGTH}
              />

              {/* Region three, and the only one that scrolls. */}
              {matching.length > 0 && (
                // Named apart from the "tags" label above, which belongs to the
                // filter field: two things called "tags" one line apart is
                // ambiguous to anyone listening rather than looking.
                <ul className={styles.tagList} aria-label="matching tags">
                  {matching.map((tag) => (
                    <li key={tag.id}>
                      {/*
                        The whole row *is* the checkbox, rather than a `<label>`
                        wrapped around one. Base UI renders a checkbox as a
                        `<button role="checkbox">`, and a label does not name a
                        button — so wrapping it produced a control whose
                        accessible name came from nowhere reliable. As the
                        control itself, its own text is its name, and the entire
                        row is the hit target.
                      */}
                      <Checkbox.Root
                        className={styles.tagOption}
                        checked={appliedTagIds.has(tag.id)}
                        onCheckedChange={(applied) =>
                          onToggleTag(tag.id, applied)
                        }
                      >
                        <span className={styles.checkbox} aria-hidden="true">
                          <Checkbox.Indicator className={styles.checkIcon}>
                            <Check />
                          </Checkbox.Indicator>
                        </span>
                        <span className={styles.tagName}>{tag.name}</span>
                      </Checkbox.Root>
                    </li>
                  ))}
                </ul>
              )}

              {/*
                Outside the scrolling list on purpose: creating a tag was the
                last item of the tag list once, and with thirty tags that meant
                scrolling to the bottom to reach it. It shows only when what was
                typed is not already a tag, so it never competes with the match
                the reader was looking for.
              */}
              {creatable && (
                <button
                  type="button"
                  className={styles.create}
                  onClick={create}
                >
                  <Plus className={styles.createIcon} aria-hidden="true" />
                  <span className={styles.tagName}>create “{trimmed}”</span>
                </button>
              )}

              {matching.length === 0 && !creatable && (
                <p className={styles.empty}>{EMPTY_TAGS_MESSAGE}</p>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** The longest tag name the mutator will accept — kept in step with its schema. */
const MAX_TAG_NAME_LENGTH = 64

/** Shown when the reader has no tags at all and has typed nothing. */
export const EMPTY_TAGS_MESSAGE = 'no tags yet. type a name to make one.'

/**
 * The tag whose name *is* what was typed, if there is one.
 *
 * Case-insensitive, because "Attention" and "attention" are the same label to
 * the person typing them. The existing tag keeps its own spelling — the reader
 * is picking it, not renaming it.
 */
function exactMatch(
  tags: readonly CollectionTag[],
  query: string,
): CollectionTag | undefined {
  const needle = query.toLowerCase()
  return tags.find((tag) => tag.name.toLowerCase() === needle)
}
