import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import { useQuery } from '@rocicorp/zero/react'
import { useCallback, useEffect, useRef } from 'react'
import { authClient } from '~/auth/auth-client'
import { useAnnotationMutations } from '~/routes/lit-tracker/-hooks/use-annotation-mutations'
import { queries } from '~/zero/queries'
import { toAnnotation } from './annotation-row'
import type { AppliedAnnotation } from './annotation-sync'
import { changesForRows, writeForEvent } from './annotation-sync'

/**
 * Keeps the marks on the paper and the rows in the database saying the same
 * thing, in both directions.
 *
 * The decisions are next door in `annotation-sync.ts`, which is pure and
 * tested; this is the wiring — subscribe to the engine, subscribe to sync, and
 * carry out whatever those functions decide. The only thing it adds is
 * **ordering**, and that part is load-bearing: the record of what the two sides
 * agree on is updated *before* the action that will be echoed back, so the echo
 * arrives to find itself already accounted for. Doing it after would mean every
 * change made a second change, forever.
 */
export function useAnnotationSync(articleId: string): void {
  const { provides: scope } = useAnnotation(articleId)
  const [rows, details] = useQuery(queries.annotations.forArticle(articleId))
  const mutations = useAnnotationMutations()
  const { data: session } = authClient.useSession()

  /**
   * What the engine and the database are believed to agree on.
   *
   * A ref rather than state, and this is not a shortcut: nothing renders from
   * it, and it must be readable by an event handler that was subscribed several
   * renders ago. As state it would either go stale in that closure or force a
   * resubscribe on every mark made.
   */
  const applied = useRef(new Map<string, AppliedAnnotation>())

  /**
   * Everything that changes but must not re-subscribe.
   *
   * The engine subscription below has to be made once per document — tearing it
   * down and remaking it on every delivery of rows would drop events made in
   * between — but the handler needs today's mutations and today's article. A ref
   * updated on each render is how it gets both.
   */
  const latest = useRef({ articleId, mutations })

  /**
   * A different paper is a different set of marks, so the record starts empty
   * again — whatever the last article's engine and rows agreed on says nothing
   * about this one's.
   *
   * During the render rather than in an effect, which is the React-documented
   * way to adjust state when a prop changes and is also the only correct timing
   * here: an effect would run *after* the effects below, so the first delivery of
   * the new article's rows would be compared against the old article's record.
   */
  if (latest.current.articleId !== articleId) {
    applied.current = new Map()
  }
  latest.current = { articleId, mutations }

  /**
   * Marks a write as no longer in flight, once the server has answered it.
   *
   * `pending` is what stops a delivery of rows from overruling a change the
   * reader has just made, and the row coming back is what normally clears it.
   * This is the other way out, and it exists so a write the server *refused* —
   * or one whose stored form differs from what was sent — cannot leave a mark
   * frozen, ignoring sync for as long as the page stays open.
   *
   * The fingerprint guard matters: by the time a write settles the reader may
   * have moved the mark again, and clearing the flag on that newer write would
   * let a stale row snap the mark back — the exact defect `pending` exists to
   * prevent.
   */
  const settle = useCallback((id: string, written: string) => {
    const entry = applied.current.get(id)
    if (entry?.pending && entry.fingerprint === written) {
      applied.current.set(id, { ...entry, pending: false })
    }
  }, [])

  /** Engine → database. */
  useEffect(() => {
    if (!scope) {
      return
    }

    return scope.onAnnotationEvent((event) => {
      const write = writeForEvent(
        event,
        latest.current.articleId,
        applied.current,
      )
      if (!write) {
        return
      }

      switch (write.kind) {
        case 'create':
          applied.current.set(write.row.id, write.applied)
          void latest.current.mutations
            .create(write.row)
            .finally(() => settle(write.row.id, write.applied.fingerprint))
          break
        case 'update':
          applied.current.set(write.row.id, write.applied)
          void latest.current.mutations
            .update(write.row)
            .finally(() => settle(write.row.id, write.applied.fingerprint))
          break
        case 'delete':
          applied.current.delete(write.id)
          void latest.current.mutations.remove(write.id)
          break
      }
    })
    // `settle` is stable — it closes over nothing but the ref — so naming it
    // here costs nothing and keeps the subscription tied to the scope alone.
  }, [scope, settle])

  /** Database → engine. */
  useEffect(() => {
    // `'unknown'` means the query has not finished its first round trip, so its
    // emptiness is not evidence that this paper has no marks. Acting on it would
    // erase from the engine every mark this client had just made.
    if (!scope || details.type !== 'complete') {
      return
    }

    const author = session?.user.name
    const { changes, applied: settled } = changesForRows(rows, applied.current)

    // Adopted before the engine is touched, for the same ordering reason the
    // handler above updates the record first: each of these changes comes back
    // as an event, and it has to arrive to find itself already accounted for.
    applied.current = settled

    for (const change of changes) {
      switch (change.kind) {
        case 'add':
          // Queued by the plugin until the document has finished loading, so
          // this needs no readiness check of its own — a paper opens with its
          // marks already on it rather than acquiring them a moment later.
          scope.importAnnotations([
            { annotation: toAnnotation(change.annotation, author) },
          ])
          break
        case 'replace':
          scope.updateAnnotation(
            change.annotation.pageIndex,
            change.annotation.id,
            toAnnotation(change.annotation, author),
          )
          break
        case 'remove':
          scope.deleteAnnotation(change.pageIndex, change.id)
          break
      }
    }
  }, [scope, rows, details.type, session?.user.name])
}
