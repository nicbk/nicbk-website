import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AccountPurgeServices } from './purge-stage'
import {
  queueAccountPurge,
  queueDeletedAccountPurges,
  registerAccountPurgeHandler,
  runAccountPurge,
} from './purge-stage'

/**
 * The decisions an account purge makes, against fakes: whether to delete at
 * all, what it deletes, and which folders the start-time sweep sends it to.
 * That the listing and deletes really happen against Garage is
 * `pdf.integration.test.ts`'s.
 */

const GONE = 'goneUserId0000000000000000000000'
const LIVING = 'livingUserId00000000000000000000'

function fakeServices(
  overrides: Partial<AccountPurgeServices> = {},
): AccountPurgeServices & { deleted: [string, string][] } {
  const deleted: [string, string][] = []
  return {
    deleted,
    userExists: async (userId) => userId === LIVING,
    listKeys: async (userId) => [
      `lit-tracker/${userId}/a/source.pdf`,
      `lit-tracker/${userId}/b/source.pdf`,
    ],
    deletePdf: async (key, userId) => {
      deleted.push([key, userId])
    },
    listOwners: async () => [GONE, LIVING],
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('runAccountPurge', () => {
  it('deletes every PDF in a deleted account’s folder, as that user', async () => {
    const services = fakeServices()

    expect(await runAccountPurge({ userId: GONE }, services)).toBe(2)
    expect(services.deleted).toEqual([
      [`lit-tracker/${GONE}/a/source.pdf`, GONE],
      [`lit-tracker/${GONE}/b/source.pdf`, GONE],
    ])
  })

  it('deletes nothing while the account still exists', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const listKeys = vi.fn(async () => ['anything'])
    const services = fakeServices({ listKeys })

    expect(await runAccountPurge({ userId: LIVING }, services)).toBe(0)
    expect(listKeys).not.toHaveBeenCalled()
    expect(services.deleted).toEqual([])
  })

  it('passes a refusal from the ownership check up, so the job fails loudly', async () => {
    const services = fakeServices({
      deletePdf: async () => {
        throw new Error('not owned')
      },
    })

    await expect(runAccountPurge({ userId: GONE }, services)).rejects.toThrow(
      'not owned',
    )
  })

  it('is done when the folder is already empty', async () => {
    const services = fakeServices({ listKeys: async () => [] })

    expect(await runAccountPurge({ userId: GONE }, services)).toBe(0)
  })
})

describe('queueDeletedAccountPurges', () => {
  it('queues a purge for each folder whose account is gone, and no other', async () => {
    const send = vi.fn(async () => 'job-id')

    const queued = await queueDeletedAccountPurges({ send }, fakeServices())

    expect(queued).toBe(1)
    expect(send).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith(
      'lit-tracker.purge-account',
      { userId: GONE },
      { singletonKey: GONE },
    )
  })
})

describe('queueAccountPurge', () => {
  it('keys the job by the user, so a deletion and a sweep make one purge', async () => {
    const send = vi.fn(async () => 'job-id')

    await queueAccountPurge({ send }, GONE)

    expect(send).toHaveBeenCalledWith(
      'lit-tracker.purge-account',
      { userId: GONE },
      { singletonKey: GONE },
    )
  })
})

describe('registerAccountPurgeHandler', () => {
  it('binds the purge to its queue and runs each job', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const handlers = new Map<string, (jobs: unknown[]) => Promise<unknown>>()
    const boss = {
      work: vi.fn(async (name: string, handler: never) => {
        handlers.set(name, handler)
        return 'worker-id'
      }),
    }
    const services = fakeServices()

    await registerAccountPurgeHandler(boss as never, services)
    await handlers.get('lit-tracker.purge-account')?.([
      { id: 'job-1', data: { userId: GONE } },
    ])

    expect(services.deleted).toHaveLength(2)
  })
})
