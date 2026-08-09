// @vitest-environment node
//
// Server module: no DOM, and the mocks below stand in for Garage and pg-boss.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { storeUpload } from './store-upload'

/**
 * The **ordering** inside an upload, which is the part of this module with a
 * design decision in it rather than a call to make.
 *
 * The integration tier proves the transaction really commits together against a
 * real Postgres and a real Garage. What it cannot show cheaply is the sequence:
 * that the PDF is written *before* the transaction opens, and the enqueue
 * *inside* it. Both matter for what a crash leaves behind — an orphan object is
 * garbage, a job whose PDF does not exist is a failure the extract stage can
 * only discover by failing.
 */

const putArticlePdf = vi.hoisted(() => vi.fn())
vi.mock('~/storage/pdf-storage', () => ({ putArticlePdf }))

const ALLOCATED_ID = '01930000-0000-7000-8000-00000000abcd'

/** Records the order of the steps a store performs. */
let steps: string[]

function fakeDatabase(): DatabaseHandle {
  const tx = {
    insert: () => ({
      values: async () => {
        steps.push('insert-row')
      },
    }),
  }
  const db = {
    execute: async () => {
      steps.push('allocate-id')
      return { rows: [{ id: ALLOCATED_ID }] }
    },
    transaction: async (run: (tx: unknown) => Promise<void>) => {
      steps.push('begin')
      await run(tx)
      steps.push('commit')
    },
  }
  return { db, pool: {} } as unknown as DatabaseHandle
}

const queue = {
  send: vi.fn(async (..._args: unknown[]) => {
    steps.push('enqueue')
    return 'job-id'
  }),
}

const upload = {
  userId: 'user-a',
  filename: 'paper.pdf',
  bytes: new TextEncoder().encode('%PDF-1.7'),
}

beforeEach(() => {
  steps = []
  putArticlePdf.mockReset()
  putArticlePdf.mockImplementation(async () => {
    steps.push('put-pdf')
  })
  queue.send.mockClear()
})

describe('storeUpload', () => {
  it('writes the PDF before opening the transaction, and enqueues inside it', async () => {
    await storeUpload(fakeDatabase(), queue, upload)

    // The whole ordering argument, as one assertion. A crash between `put-pdf`
    // and `commit` leaves an object nothing points at; the reverse order would
    // leave a job pointing at an object that was never written.
    expect(steps).toEqual([
      'allocate-id',
      'put-pdf',
      'begin',
      'insert-row',
      'enqueue',
      'commit',
    ])
  })

  it('files the PDF under the id the job will carry', async () => {
    const stored = await storeUpload(fakeDatabase(), queue, upload)

    expect(stored.id).toBe(ALLOCATED_ID)
    // The pre-allocated id, so task 4's article adopts it with no blob move.
    expect(putArticlePdf).toHaveBeenCalledWith(
      `lit-tracker/user-a/${ALLOCATED_ID}/source.pdf`,
      upload.bytes,
    )
  })

  it('enqueues the job on the upload transaction, not on pg-boss own connection', async () => {
    await storeUpload(fakeDatabase(), queue, upload)

    // The `db` option is what puts the enqueue inside the transaction. Without
    // it a rolled-back upload would still leave a job behind.
    const [, , options] = queue.send.mock.calls[0] as unknown as [
      string,
      unknown,
      { db?: unknown },
    ]
    expect(options?.db).toBeDefined()
  })

  it('tells the queue which upload to extract', async () => {
    await storeUpload(fakeDatabase(), queue, upload)

    const [name, job] = queue.send.mock.calls[0] as unknown as [
      string,
      Record<string, string>,
    ]
    expect(name).toBe('lit-tracker.extract')
    expect(job).toEqual({
      uploadJobId: ALLOCATED_ID,
      userId: 'user-a',
      pdfObjectKey: `lit-tracker/user-a/${ALLOCATED_ID}/source.pdf`,
    })
  })

  it('fails loudly if Postgres hands back no id', async () => {
    const database = fakeDatabase()
    // biome-ignore lint/suspicious/noExplicitAny: replacing one method on the stub
    ;(database.db as any).execute = async () => ({ rows: [] })

    await expect(storeUpload(database, queue, upload)).rejects.toThrow(/id/)
    // Nothing was written under a missing id.
    expect(putArticlePdf).not.toHaveBeenCalled()
  })
})
