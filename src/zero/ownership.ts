import type { Transaction } from '@rocicorp/zero'
import type { ZeroContext } from './context'
import { zql } from './schema.gen'

/**
 * The ownership checks every mutator runs before it writes.
 *
 * `queries.ts` is the read half of this site's authorization boundary; this is
 * the write half's, and it exists as its own module for the same reason that one
 * does — the decisions are small, they are the whole security model for user
 * data, and they are worth reading and testing on their own rather than buried
 * inside five mutator bodies
 * (research/system-architecture/data-sharing-boundaries.md).
 *
 * **Why a check is needed at all.** Zero's CRUD operations address a row by its
 * primary key: `tx.mutate.tags.delete({id})` deletes whatever row has that id,
 * with no notion of who is asking. There is no row-level-security layer behind
 * this, and the client sends the id. So a mutator that takes an id and writes is
 * a mutator that writes anyone's row — the guard is what turns the id into "a
 * row *you* own", by reading it back under the server-derived context first.
 *
 * **Why throwing is the right refusal.** Zero rolls a mutator's transaction back
 * when it throws, so a refused mutation leaves nothing behind, and the failure
 * travels to the client as an application error the UI can show. Returning
 * quietly would report success for a write that never happened — and the
 * client's optimistic copy would keep showing it until the next sync silently
 * took it away.
 */

/**
 * Thrown when a mutation names a row its caller does not own, or arrives with no
 * session at all.
 *
 * One type for both, and deliberately one message: "no such row" and "not
 * yours" are the same answer to anyone who is not the owner, and telling the two
 * apart would confirm that a given id exists in someone else's collection.
 */
export class MutationRefusedError extends Error {
  constructor() {
    super('that item is not available to this account.')
    this.name = 'MutationRefusedError'
  }
}

/**
 * The context, or a refusal.
 *
 * `ZeroContext | undefined` is `undefined` for a signed-out, expired, or
 * tampered-with session (`context.ts`). The endpoint already answers such a
 * request with 401, so reaching a mutator without one should not happen — this
 * is the guarantee underneath that rather than a substitute for it, exactly as
 * `queries.ts`'s `.limit(0)` is.
 */
export function requireSession(ctx: ZeroContext | undefined): ZeroContext {
  if (!ctx) {
    throw new MutationRefusedError()
  }
  return ctx
}

/**
 * Asserts the article exists **and** belongs to the caller.
 *
 * The ownership filter is applied in addition to the id, not instead of it —
 * the same shape as `queries.articles.byId`, and for the same reason: naming
 * another user's row must find nothing rather than find that row.
 */
export async function requireOwnedArticle(
  tx: Transaction,
  ctx: ZeroContext,
  articleId: string,
): Promise<void> {
  const [article] = await tx.run(
    zql.articles.where('id', articleId).where('userId', ctx.id).limit(1),
  )
  if (!article) {
    throw new MutationRefusedError()
  }
}

/**
 * Asserts the annotation exists and belongs to the caller. As above.
 *
 * Ownership is read from the annotation's own `user_id` rather than through the
 * article it is on. Both are true of every row — the two cascade from the same
 * account — but the direct column is the one the decided model puts on every
 * user-owned table for exactly this check
 * (research/system-architecture/data-sharing-boundaries.md), and reading it
 * through a join would make the guard depend on a second row being consistent.
 */
export async function requireOwnedAnnotation(
  tx: Transaction,
  ctx: ZeroContext,
  annotationId: string,
): Promise<void> {
  const [annotation] = await tx.run(
    zql.annotations.where('id', annotationId).where('userId', ctx.id).limit(1),
  )
  if (!annotation) {
    throw new MutationRefusedError()
  }
}

/** Asserts the tag exists and belongs to the caller. As above. */
export async function requireOwnedTag(
  tx: Transaction,
  ctx: ZeroContext,
  tagId: string,
): Promise<void> {
  const [tag] = await tx.run(
    zql.tags.where('id', tagId).where('userId', ctx.id).limit(1),
  )
  if (!tag) {
    throw new MutationRefusedError()
  }
}
