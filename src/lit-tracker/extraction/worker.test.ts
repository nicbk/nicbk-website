// @vitest-environment node
import type { PgBoss } from 'pg-boss'
import { describe, expect, it, vi } from 'vitest'
import type { ExtractionServices } from './services'
import { registerExtractionHandlers } from './worker'

/**
 * The wiring: which queue runs which stage.
 *
 * Invisible when wrong — every queue exists, every handler runs, and the only
 * symptom is uploads that never resolve. The stages themselves are tested in
 * their own files, and that a worker starts at all is `jobs/worker.test.ts`.
 */

describe('registerExtractionHandlers', () => {
  it('binds a handler to every queue in the chain', async () => {
    const work = vi.fn(async (_name: string, _handler: unknown) => 'worker-id')
    const services = {} as ExtractionServices

    await registerExtractionHandlers({ work } as unknown as PgBoss, services)

    expect(work.mock.calls.map(([name]) => name)).toEqual([
      'lit-tracker.extract',
      // A dead-letter queue needs a handler as much as the others do: an
      // unhandled one would collect jobs nobody ever resolves. The two have
      // opposite jobs — an exhausted extract becomes a visible failure, an
      // exhausted enrich becomes an ordinary success.
      'lit-tracker.extract-exhausted',
      'lit-tracker.enrich',
      'lit-tracker.enrich-exhausted',
      'lit-tracker.finalize',
    ])
  })

  it('hands each job in a batch to its stage', async () => {
    const handlers = new Map<string, (jobs: unknown[]) => Promise<void>>()
    const work = vi.fn(
      async (name: string, handler: (jobs: unknown[]) => Promise<void>) => {
        handlers.set(name, handler)
        return 'worker-id'
      },
    )
    const deleted: string[] = []
    const services = {
      database: {
        db: {
          delete: () => ({
            where: async () => {
              deleted.push('deleted')
            },
          }),
        },
      },
    } as unknown as ExtractionServices

    await registerExtractionHandlers({ work } as unknown as PgBoss, services)
    // pg-boss hands a worker an array even at the default batch size of one.
    await handlers.get('lit-tracker.finalize')?.([
      { data: { uploadJobId: 'a' } },
      { data: { uploadJobId: 'b' } },
    ])

    expect(deleted).toHaveLength(2)
  })
})
