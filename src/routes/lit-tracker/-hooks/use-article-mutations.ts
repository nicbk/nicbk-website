import { useZero } from '@rocicorp/zero/react'
import { useMemo } from 'react'
import type { ArticleStatus } from '~/db/schema/lit-tracker'
import type { ArticleDetails } from '~/routes/lit-tracker/-components/article-edit/article-draft'
import { mutators } from '~/zero/mutators'
import type { MutationFailure } from './use-mutation-runner'
import { useMutationReporter, useMutationRunner } from './use-mutation-runner'

/**
 * Every write the tracker can make against an article, in the shape the UI
 * wants them.
 *
 * **It lives here, above both pages, because two of them write.** It was
 * `useCollectionMutations` under `-collection-page/` when the collection was
 * the only surface that could change anything; #9's detail page sets the same
 * status, applies the same tags, and adds notes, and reaching into the
 * collection's folder for that would tie one page to another page's internals.
 * The alternative — a second hook — is two write paths that authorize, await,
 * and report failures slightly differently by the second time somebody touches
 * one.
 *
 * Two things this adds over calling `zero.mutate(...)` at each call site, and
 * both are the reason it exists rather than being inlined:
 *
 * **It waits for the server's answer and reports a refusal**, through the
 * shared `useMutationRunner` — see that file for why the client's promise is the
 * wrong one to believe.
 *
 * **It generates the ids.** Rows created from the browser carry client-generated
 * UUIDv7 primary keys (research/data-modeling/zero-schema-conventions.md), and
 * `crypto.randomUUID()` is a v4 — time-ordered is the whole point, so the
 * generator is here, once, rather than in each component that creates a row.
 *
 * The mutation itself is optimistic regardless: the card redraws before any of
 * these promises settle, because Zero has already applied the write locally.
 * What the awaiting buys is knowing when to say it did not stick.
 */
export interface ArticleMutations {
  /** Creates a tag and applies it to an article in one step. */
  createAndApplyTag: (articleId: string, name: string) => Promise<void>
  /** Applies a tag the user already has. */
  applyTag: (articleId: string, tagId: string) => Promise<void>
  /** Takes a tag off one article, leaving the tag itself. */
  removeTag: (articleId: string, tagId: string) => Promise<void>
  /** Deletes a tag everywhere it is applied. */
  deleteTag: (tagId: string) => Promise<void>
  /** Sets where the reader has got to. */
  setStatus: (articleId: string, status: ArticleStatus) => Promise<void>
  /**
   * Replaces an article's free-text notes.
   *
   * The whole value each time rather than a patch: the field is one textarea
   * bound to one column, and Zero's last-write-wins is the same answer a diff
   * would arrive at for a single editor. Callers debounce — see
   * `use-synced-text.ts` for why that is the caller's job and not this one's.
   */
  setNotes: (articleId: string, notes: string) => Promise<void>
  /**
   * Corrects an article's bibliographic details — #11's edit form.
   *
   * **The one write here that answers back.** Every other returns `void` and
   * lets a refusal become a toast, which is right for a control with no form
   * behind it. This one has a form, and the decided rule puts an error inside
   * the form that caused it (research/ui-ux/design-system.md) — so the failure
   * is handed to the caller instead. It is also what tells the dialog to stay
   * open rather than closing over a change that did not save.
   */
  updateDetails: (
    articleId: string,
    details: ArticleDetails,
  ) => Promise<MutationFailure | null>
}

export function useArticleMutations(): ArticleMutations {
  const zero = useZero()
  const run = useMutationRunner()
  const report = useMutationReporter()

  return useMemo(
    () => ({
      createAndApplyTag: (articleId, name) =>
        // Two mutations rather than one, deliberately: a "create and attach"
        // mutator would need its own authorization path for a case the two
        // existing ones already cover between them. They are separate writes,
        // so a refused attach can leave a created tag — which is the same state
        // the reader would be in had they made the tag and then failed to apply
        // it, and the tag is theirs to delete.
        run(() => {
          const tagId = timeOrderedId()
          return [
            zero.mutate(mutators.tags.create({ id: tagId, name })),
            zero.mutate(
              mutators.tags.attach({ id: timeOrderedId(), articleId, tagId }),
            ),
          ]
        }),

      applyTag: (articleId, tagId) =>
        run(() =>
          zero.mutate(
            mutators.tags.attach({ id: timeOrderedId(), articleId, tagId }),
          ),
        ),

      removeTag: (articleId, tagId) =>
        run(() => zero.mutate(mutators.tags.detach({ articleId, tagId }))),

      deleteTag: (tagId) =>
        run(() => zero.mutate(mutators.tags.delete({ id: tagId }))),

      setStatus: (articleId, status) =>
        run(() =>
          zero.mutate(mutators.articles.setStatus({ id: articleId, status })),
        ),

      setNotes: (articleId, notes) =>
        run(() =>
          zero.mutate(mutators.articles.setNotes({ id: articleId, notes })),
        ),

      updateDetails: (articleId, details) =>
        report(() =>
          zero.mutate(
            mutators.articles.updateDetails({
              id: articleId,
              ...details,
              // The form hands back a readonly list, which is right for
              // everything that reads it; the mutator's schema wants a mutable
              // one. Copying here is the honest conversion, and it is one array
              // of author names.
              authors: [...details.authors],
            }),
          ),
        ),
    }),
    [report, run, zero],
  )
}

/**
 * A UUIDv7 — time-ordered, so a table of these stays index-friendly as it grows,
 * which `crypto.randomUUID()`'s v4 does not
 * (research/data-modeling/zero-schema-conventions.md).
 *
 * Hand-rolled because the platform has no v7 generator and the project has no
 * uuid dependency: 48 bits of millisecond timestamp, the version and variant
 * nibbles, and randomness for the rest. Uniqueness rests on the 74 random bits,
 * not on the clock, so two ids minted in the same millisecond still differ.
 */
function timeOrderedId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const timestamp = Date.now()

  for (let index = 0; index < 6; index += 1) {
    // Big-endian: the most significant byte of the 48-bit timestamp first, so
    // lexical order over the hex matches chronological order.
    bytes[index] = Math.floor(timestamp / 256 ** (5 - index)) % 256
  }
  // Version 7 in the high nibble of byte 6, and the RFC 4122 variant in the top
  // two bits of byte 8. The rest of both bytes stays random.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

export { timeOrderedId }
