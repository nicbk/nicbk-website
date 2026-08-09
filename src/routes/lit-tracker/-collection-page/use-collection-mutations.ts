import { useZero } from '@rocicorp/zero/react'
import { useCallback, useMemo } from 'react'
import type { ArticleStatus } from '~/db/schema/lit-tracker'
import { useErrorToast } from '~/routes/-shared/components/toast/use-error-toast'
import { mutators } from '~/zero/mutators'

/**
 * Every write the collection view can make, in the shape the UI wants them.
 *
 * Two things this adds over calling `zero.mutate(...)` at each call site, and
 * both are the reason it exists rather than being inlined:
 *
 * **It waits for the server's answer, not the client's.** `zero.mutate` returns
 * two promises. `client` settles as soon as the write is applied to the local
 * copy, which is essentially always and says nothing about whether it was
 * allowed; `server` settles when the authoritative answer arrives. Reporting on
 * `client` would mean a write refused by `/mutate` looked successful, and the
 * reader would watch their tag appear and then quietly vanish on the next sync.
 * Everything here awaits `server`.
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
export interface CollectionMutations {
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
}

export function useCollectionMutations(): CollectionMutations {
  const zero = useZero()
  const showError = useErrorToast()

  /**
   * Runs one or more mutations and reports the first refusal, without letting
   * either become the caller's problem. Nothing here rethrows: a rejected write
   * is a message to the reader, not an exception for an event handler to have
   * opinions about.
   *
   * **Every result is awaited, including ones whose outcome is already decided
   * by an earlier failure.** An un-awaited `server` promise that rejects is an
   * unhandled rejection, so "we already know this went wrong" is not a reason
   * to walk away from the second one.
   */
  const run = useCallback(
    async (mutate: () => MutationResult | MutationResult[]) => {
      try {
        const results = [mutate()].flat()
        const outcomes = await Promise.all(
          results.map((result) => result.server),
        )
        const failure = outcomes.find((outcome) => outcome.type === 'error')
        if (failure) {
          showError(failure.error.message)
        }
      } catch (error) {
        // A promise rejects, rather than resolving to an error outcome, when
        // the request itself fails — offline, or a 500 — as opposed to the
        // mutator refusing. The reader needs to know either way.
        showError(messageFor(error))
      }
    },
    [showError],
  )

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
    }),
    [run, zero],
  )
}

/**
 * What `zero.mutate` hands back, narrowed to the half this file uses.
 *
 * Zero types the outcome with more cases than matter here — an error carries a
 * `type` distinguishing an application throw from a transport failure, and both
 * mean the same thing to a reader. Naming the shape locally keeps that
 * narrowing explicit instead of spreading `as` casts through the calls.
 */
interface MutationResult {
  server: Promise<MutationOutcome>
}

type MutationOutcome =
  | { type: 'success' }
  | { type: 'error'; error: { message: string } }

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

/** The readable half of whatever a failed request threw. */
function messageFor(error: unknown): string {
  if (error instanceof Error && error.message !== '') {
    return error.message
  }
  return 'the change could not be saved. check your connection and try again.'
}

export { timeOrderedId }
