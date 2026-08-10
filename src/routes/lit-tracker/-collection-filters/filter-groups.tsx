import { Toggle } from '@base-ui/react/toggle'
import { Menu, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import {
  ARTICLE_STATUS_LABELS,
  ARTICLE_STATUSES,
} from '~/lit-tracker/article-status'
import { matchingTags } from '~/lit-tracker/tag-matching'
import { TagToggle } from '~/routes/-shared/components/tag-toggle/tag-toggle'
import type { CollectionTag } from '../-collection-page/article-card/article-menu/article-menu'
import styles from './filter-groups.module.css'

/** Shown in place of the tag group when the reader has not made any tags. */
export const NO_TAGS_MESSAGE = 'no tags yet.'

/** Shown when the reader has tags but none of them match what was typed. */
export const NO_MATCHING_TAGS_MESSAGE = 'no tags match.'

/** Names the control that reveals and hides the per-tag deletes. */
export const EDIT_TAGS_LABEL = 'edit tags'

/** The find field's label, and what a screen reader announces it as. */
export const FIND_TAGS_LABEL = 'find a tag'

interface FilterGroupsProps {
  /** Every tag the reader has, alphabetically (the query sorts them). */
  tags: readonly CollectionTag[]
  /** Selected tag names. */
  selectedTags: readonly string[]
  /** The selected reading status, or `undefined` for any. */
  selectedStatus: ArticleStatus | undefined
  onToggleTag: (name: string) => void
  onToggleStatus: (status: ArticleStatus) => void
  /** Asks to delete a tag. Confirmation is the caller's — this only requests. */
  onRequestDelete: (tag: CollectionTag) => void
}

/**
 * The filter list itself: reading status, then the reader's own tags.
 *
 * **One mechanism, two groups.** The decided model puts reading status in the
 * same filter list as user tags rather than in a control of its own
 * (research/ui-ux/pages/lit-tracker/pages/collection-view.md), and that is why
 * both groups are the same `TagToggle` in the same layout. What differs is the
 * selection rule — status is single-select, tags accumulate — and a reader
 * cannot see a rule. So each group carries a quiet heading: same treatment,
 * visible grouping, and the exclusive three are told apart from the many before
 * the reader discovers it by surprise.
 *
 * **Three regions, and only one of them scrolls.** The same shape, and for the
 * same reason, as the card menu next door: a reader hunting through thirty tags
 * must not scroll the reading statuses out of the rail, and the control that
 * finds a tag must not be somewhere down the list it is meant to shorten. So the
 * statuses are fixed, the find field is fixed, and the tag list alone moves.
 * That was learned the expensive way in `article-menu.tsx` — this list inherited
 * the same fault by being written to look like the version of that one which had
 * already been replaced.
 *
 * **Deleting is a mode, not a control per row.** An `×` beside every tag put a
 * column of destructive buttons down a list whose job is filtering, and doubled
 * the number of tab stops between the top of the rail and the bottom of it. The
 * arrangement here is the one list interfaces have settled on: one control that
 * turns removal on, and while it is on, a red `×` per row. Off is the resting
 * state, so the rail is a filter list until the reader says otherwise, and the
 * deletes are not merely hidden — they are not rendered, so they are not in the
 * tab order either.
 *
 * Presentational apart from that one piece of local state: every branch calls a
 * prop, so the whole list is assertable with spies and no router, no Zero
 * client, and no dialog.
 */
export function FilterGroups({
  tags,
  selectedTags,
  selectedStatus,
  onToggleTag,
  onToggleStatus,
  onRequestDelete,
}: FilterGroupsProps) {
  /**
   * Whether the per-tag deletes are showing. Transient and personal to this
   * copy of the list — nothing to link to and nothing to survive a refresh — so
   * local state rather than a search param
   * (research/coding-conventions/state-management-conventions.md).
   */
  const [editing, setEditing] = useState(false)
  /** What has been typed into the find field. Transient, for the same reason. */
  const [query, setQuery] = useState('')
  const statusLabelId = useId()
  const tagsLabelId = useId()
  const findId = useId()

  /**
   * What the list shows: everything the query matches, **plus everything
   * currently selected**, in the query's own alphabetical order.
   *
   * A selected tag that stops matching must not disappear. It is still
   * narrowing the collection, and a filter you cannot see is one you cannot
   * turn off — the reader would be left looking at three articles with no
   * visible reason why. So searching for one tag never hides the ones already
   * doing work.
   */
  const matchedIds = new Set(matchingTags(tags, query).map((tag) => tag.id))
  const visible = tags.filter(
    (tag) => matchedIds.has(tag.id) || selectedTags.includes(tag.name),
  )
  /** Whether the query itself found nothing, regardless of what stays pinned. */
  const nothingMatched = matchedIds.size === 0

  // A reader who deletes their way to an empty list should not be left in a
  // mode with nothing to act on, and the control that leaves it is about to
  // disappear with the list it belongs to.
  const showDeletes = editing && tags.length > 0

  return (
    <div className={styles.groups}>
      <section className={styles.group} aria-labelledby={statusLabelId}>
        <h2 className={styles.groupLabel} id={statusLabelId}>
          status
        </h2>
        <ul className={styles.list}>
          {ARTICLE_STATUSES.map((status) => (
            <li key={status} className={styles.row}>
              <TagToggle
                pressed={selectedStatus === status}
                onPressedChange={() => onToggleStatus(status)}
                // The visible label is the bare word, matching a tag exactly.
                // Heard on its own, out of the group it sits in, "read" is a
                // verb and an ambiguous one — so the spoken name says what
                // pressing it does.
                label={`only articles marked ${ARTICLE_STATUS_LABELS[status]}`}
              >
                {ARTICLE_STATUS_LABELS[status]}
              </TagToggle>
            </li>
          ))}
        </ul>
      </section>

      {/* The group that takes the leftover height, so its list is the part that
          runs out of room and therefore the part that scrolls. */}
      <section className={styles.tagGroup} aria-labelledby={tagsLabelId}>
        <div className={styles.groupHeader}>
          <h2 className={styles.groupLabel} id={tagsLabelId}>
            tags
          </h2>
          {/*
            Rendered only when there is something to edit, so an empty rail
            offers no control that would do nothing.
          */}
          {tags.length > 0 && (
            <Toggle
              className={styles.editToggle}
              pressed={editing}
              onPressedChange={setEditing}
              aria-label={EDIT_TAGS_LABEL}
            >
              <Menu className={styles.editIcon} aria-hidden="true" />
            </Toggle>
          )}
        </div>

        {/*
          Region two: fixed, like the statuses above it. A field that finds
          things in a list cannot live inside the list it shortens — with thirty
          tags it would be somewhere below the fold, which is precisely when it
          is wanted. Shown only when there is a list to search.
        */}
        {tags.length > 0 && (
          <input
            id={findId}
            className={styles.find}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={FIND_TAGS_LABEL}
            aria-label={FIND_TAGS_LABEL}
            autoComplete="off"
            // Tag names are labels, not prose — "seq2seq" is not a typo, and a
            // red squiggle under one suggests it is.
            spellCheck={false}
          />
        )}

        {tags.length === 0 && <p className={styles.empty}>{NO_TAGS_MESSAGE}</p>}

        {/*
          Said even when selected tags are still listed below: the reader asked
          a question about the whole list and the answer is "nothing", which the
          pinned selections would otherwise disguise.
        */}
        {tags.length > 0 && nothingMatched && (
          <p className={styles.empty}>{NO_MATCHING_TAGS_MESSAGE}</p>
        )}

        {visible.length > 0 && (
          // Region three, and the only one that scrolls.
          <ul className={`${styles.list} ${styles.tagList}`}>
            {visible.map((tag) => (
              <li key={tag.id} className={styles.row}>
                <TagToggle
                  pressed={selectedTags.includes(tag.name)}
                  onPressedChange={() => onToggleTag(tag.name)}
                >
                  {/* A name too long for the rail is elided by the toggle's own
                      styling; the title is what makes the whole of it reachable
                      without widening the rail to fit the longest one. */}
                  <span title={tag.name}>{tag.name}</span>
                </TagToggle>
                {showDeletes && (
                  <button
                    type="button"
                    className={styles.delete}
                    aria-label={`Delete tag ${tag.name}`}
                    onClick={() => onRequestDelete(tag)}
                  >
                    <X className={styles.deleteIcon} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
