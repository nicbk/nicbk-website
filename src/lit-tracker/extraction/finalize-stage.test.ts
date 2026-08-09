// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { runFinalizeStage } from './finalize-stage'
import type { ExtractionServices } from './services'

/**
 * The stage that makes a resolved upload disappear.
 *
 * Small, but it is the half of the decided row lifecycle the status popup
 * depends on: the list holds only jobs still needing attention because a
 * resolved one stops existing, not because anything filters it out.
 */

describe('runFinalizeStage', () => {
  it('deletes the job row', async () => {
    const deleted: unknown[] = []
    const database = {
      db: {
        delete: () => ({
          where: async (condition: unknown) => {
            deleted.push(condition)
          },
        }),
      },
      pool: {},
    } as unknown as DatabaseHandle

    await runFinalizeStage(
      { uploadJobId: '01930000-0000-7000-8000-0000000000aa' },
      { database } as unknown as ExtractionServices,
    )

    // Deleted rather than marked complete: there is no terminal status value
    // for every query to filter back out
    // (research/data-modeling/upload-jobs-schema.md).
    expect(deleted).toHaveLength(1)
  })
})
