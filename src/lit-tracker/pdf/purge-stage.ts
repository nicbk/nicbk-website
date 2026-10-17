import { eq } from 'drizzle-orm'
import type { PgBoss } from 'pg-boss'
import type { DatabaseHandle } from '~/db/create-database'
import { user } from '~/db/schema'
import { handleEach } from '~/lit-tracker/jobs/handle-batch'
import type { AccountPurgeJob, JobQueue } from '~/lit-tracker/jobs/queue'
import { ACCOUNT_PURGE_QUEUE } from '~/lit-tracker/jobs/queue'
import {
  deleteArticlePdf,
  listPdfOwners,
  listUserPdfKeys,
} from '~/storage/pdf-storage'

/**
 * What deleting an account does to its files (features/what-the-research-found,
 * F2).
 *
 * Deleting an account removes the user's rows: every Literature Tracker table
 * cascades from Better Auth's `user`. The PDFs are in Garage, which no
 * transaction reaches, and until this nothing removed them: only deleting one
 * article queued its file's cleanup. So an account deleted to be forgotten
 * left every paper it had uploaded in the bucket.
 *
 * Two things queue a purge, so that neither has to be perfect:
 *
 * - **Better Auth's `afterDelete`**, the moment the account is gone (`auth.ts`).
 * - **A sweep at every worker start**, which lists the users with a folder in
 *   the bucket and queues a purge for each one that no longer exists. That
 *   catches a hook whose send failed, every account deleted before this fix,
 *   and an upload that finished writing after its account was deleted.
 *
 * **The purge refuses to run for a user who exists.** A user id is 32 random
 * characters and is never reissued
 * (research/system-architecture/roles-and-administrators.md), so a folder whose
 * user is gone can only be a deleted account's. The check is what keeps a
 * mistaken job, from anywhere, from emptying a living user's collection.
 */

/** What a purge reaches outside itself, injected so the decisions can be tested. */
export interface AccountPurgeServices {
  /** Whether Better Auth still has this user. */
  userExists: (userId: string) => Promise<boolean>
  /** Every key under the user's folder. */
  listKeys: (userId: string) => Promise<string[]>
  /** Removes one stored PDF, refusing keys the named user does not own. */
  deletePdf: (key: string, userId: string) => Promise<void>
  /** The users with a folder in the bucket. */
  listOwners: () => Promise<string[]>
}

/** The real thing, for the worker. */
export function productionAccountPurgeServices(
  database: DatabaseHandle,
): AccountPurgeServices {
  return {
    userExists: async (userId) => {
      const rows = await database.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
      return rows.length > 0
    },
    listKeys: listUserPdfKeys,
    deletePdf: deleteArticlePdf,
    listOwners: listPdfOwners,
  }
}

/**
 * Empties a deleted account's folder. Returns how many objects it removed.
 *
 * Idempotent: a retry lists what is left, which may be nothing. Every key goes
 * through the ownership check the article cleanup uses, so a listing that ever
 * strayed outside the prefix would be refused rather than obeyed.
 */
export async function runAccountPurge(
  job: AccountPurgeJob,
  services: AccountPurgeServices,
): Promise<number> {
  if (await services.userExists(job.userId)) {
    console.warn(
      `Not purging the PDFs of user ${job.userId}: the account still exists.`,
    )
    return 0
  }
  const keys = await services.listKeys(job.userId)
  for (const key of keys) {
    await services.deletePdf(key, job.userId)
  }
  return keys.length
}

/** Asks for one account's folder to be emptied. */
export async function queueAccountPurge(
  queue: JobQueue,
  userId: string,
): Promise<void> {
  const job: AccountPurgeJob = { userId }
  await queue.send(ACCOUNT_PURGE_QUEUE, job, { singletonKey: userId })
}

/**
 * Queues a purge for every folder in the bucket whose account is gone. Returns
 * how many it queued.
 */
export async function queueDeletedAccountPurges(
  queue: JobQueue,
  services: AccountPurgeServices,
): Promise<number> {
  let queued = 0
  for (const owner of await services.listOwners()) {
    if (!(await services.userExists(owner))) {
      await queueAccountPurge(queue, owner)
      queued += 1
    }
  }
  return queued
}

/** Binds the purge to its queue. */
export async function registerAccountPurgeHandler(
  boss: PgBoss,
  services: AccountPurgeServices,
): Promise<void> {
  await boss.work<AccountPurgeJob>(ACCOUNT_PURGE_QUEUE, (jobs) =>
    handleEach(jobs, async (job) => {
      const removed = await runAccountPurge(job, services)
      if (removed > 0) {
        console.log(
          `Removed ${removed} PDFs left by deleted account ${job.userId}.`,
        )
      }
    }),
  )
}
