import { useCallback } from 'react'
import type { ErrorToast } from '~/routes/-shared/components/toast/use-error-toast'
import { useErrorToast } from '~/routes/-shared/components/toast/use-error-toast'

/**
 * How this tracker sends a write and what it does when the server says no.
 *
 * Extracted from `use-article-mutations.ts` when #9's reader gained a second
 * group of writes with the same requirements — a refusal has to reach the
 * reader, and a transport failure has to be worded differently from one. Two
 * copies of this would be two subtly different answers to "did that save?" by
 * the second time somebody touched one.
 *
 * Two properties, and both are the reason this exists rather than being inlined
 * at each `zero.mutate` call:
 *
 * **It waits for the server's answer, not the client's.** `zero.mutate` returns
 * two promises. `client` settles as soon as the write is applied to the local
 * copy, which is essentially always and says nothing about whether it was
 * allowed; `server` settles when the authoritative answer arrives. Reporting on
 * `client` would mean a write refused by `/mutate` looked successful, and the
 * reader would watch their change appear and then quietly vanish on the next
 * sync.
 *
 * **Nothing here rethrows.** A rejected write is a message to the reader, not an
 * exception for an event handler to have opinions about.
 */
export type MutationRunner = (
  mutate: () => MutationResult | MutationResult[],
) => Promise<void>

export function useMutationRunner(): MutationRunner {
  const showError = useErrorToast()

  return useCallback(
    async (mutate: () => MutationResult | MutationResult[]) => {
      try {
        const results = [mutate()].flat()
        // Every result is awaited, including ones whose outcome is already
        // decided by an earlier failure: an un-awaited `server` promise that
        // rejects is an unhandled rejection, so "we already know this went
        // wrong" is not a reason to walk away from the second one.
        const outcomes = await Promise.all(
          results.map((result) => result.server),
        )
        const failure = outcomes.find((outcome) => outcome.type === 'error')
        if (failure) {
          showError(toastFor(failure.error))
        }
      } catch {
        // A promise rejects, rather than resolving to an error outcome, only
        // when something went wrong before Zero could form an outcome at all.
        // Whatever it was, it is not something to put in front of a reader.
        showError(NOT_SAVED_YET)
      }
    },
    [showError],
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
export interface MutationResult {
  server: Promise<MutationOutcome>
}

type MutationOutcome = { type: 'success' } | { type: 'error'; error: ZeroError }

/**
 * `'app'` is a throw from one of this project's mutators; `'zero'` is the sync
 * engine's own failure — it could not reach the server, or the server answered
 * with something it did not understand.
 */
interface ZeroError {
  type: 'app' | 'zero'
  message: string
}

/**
 * Shown when the write never reached the server, rather than being refused by
 * it.
 *
 * The wording matters, and both halves of it were corrected after watching the
 * real thing. Stopping the app server and changing a status produced a toast
 * reading *"that did not save — Fetch from API server threw error: fetch
 * failed"*: the description was Zero's internal wording, true and unactionable,
 * and the title was **wrong**, because Zero had queued the mutation and applied
 * it the moment the server came back. A reader told their change did not save
 * would reasonably make it again.
 */
const NOT_SAVED_YET: ErrorToast = {
  title: 'not saved yet',
  message:
    'the server could not be reached. this change is queued and will be sent when the connection returns.',
}

/**
 * What to put in front of the reader, which is not always what Zero said.
 *
 * A mutator's own message is written to be read — "that item is not available
 * to this account." — so it is passed through, and it is final: an application
 * refusal is never retried. Anything Zero raises itself is a transport problem
 * wearing developer wording, and is not.
 */
function toastFor(error: ZeroError): ErrorToast {
  if (error.type === 'app' && error.message !== '') {
    return { title: 'that did not save', message: error.message }
  }
  return NOT_SAVED_YET
}
