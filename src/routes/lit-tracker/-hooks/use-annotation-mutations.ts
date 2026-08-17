import { useZero } from '@rocicorp/zero/react'
import { useMemo } from 'react'
import type { AnnotationRow } from '~/routes/lit-tracker/-article-detail/reader/annotation-sync/annotation-row'
import { mutators } from '~/zero/mutators'
import { useMutationRunner } from './use-mutation-runner'

/**
 * The three writes the reader makes as a paper is marked up.
 *
 * Separate from `useArticleMutations` — which handles tags, status and notes —
 * rather than a fourth group inside it, because these have a different caller
 * and a different shape: those are called from event handlers on controls the
 * reader clicked, while these are called by the annotation bridge in response to
 * an engine event. They share the one thing worth sharing, `useMutationRunner`,
 * so a refused write reaches the reader the same way from either.
 *
 * **No id is generated here.** Every other create on this site mints a UUIDv7
 * (`use-article-mutations.ts`); an annotation's id is EmbedPDF's, minted inside
 * the tool that drew the mark, and adopted so that the engine, this table and
 * task 5's list all name a mark the same way. The 2026-08-13 revision to
 * research/data-modeling/zero-schema-conventions.md records that exception.
 */
export interface AnnotationMutations {
  /** Stores a mark the reader has just made. */
  create: (row: AnnotationRow) => Promise<void>
  /** Replaces a stored mark's page, contents and payload after an edit. */
  update: (row: AnnotationRow) => Promise<void>
  /** Removes a mark. */
  remove: (id: string) => Promise<void>
}

export function useAnnotationMutations(): AnnotationMutations {
  const zero = useZero()
  const run = useMutationRunner()

  return useMemo(
    () => ({
      create: (row) =>
        run(() =>
          zero.mutate(
            mutators.annotations.create({
              id: row.id,
              articleId: row.articleId,
              type: row.type,
              pageIndex: row.pageIndex,
              contents: row.contents,
              payload: row.payload,
            }),
          ),
        ),

      // `articleId` and `type` are deliberately not sent: neither can change for
      // an existing mark, and a mutator that accepted them would be a mutator
      // that could move one paper's annotation onto another.
      update: (row) =>
        run(() =>
          zero.mutate(
            mutators.annotations.update({
              id: row.id,
              pageIndex: row.pageIndex,
              contents: row.contents,
              payload: row.payload,
            }),
          ),
        ),

      remove: (id) =>
        run(() => zero.mutate(mutators.annotations.delete({ id }))),
    }),
    [run, zero],
  )
}
