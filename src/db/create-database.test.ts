import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from './create-database'

const CONNECTION_STRING = 'postgres://reader:secret@localhost:5432/unit-tests'

let handles: Awaited<ReturnType<typeof createDatabase>>[] = []

afterEach(async () => {
  await Promise.all(handles.map((handle) => handle.pool.end()))
  handles = []
})

describe('createDatabase', () => {
  it('builds a client for the given connection string without connecting', () => {
    // `pg` opens connections lazily, on first query — so constructing a handle
    // is safe in a test (and at import time in the app) even when no database
    // is reachable.
    const handle = createDatabase(CONNECTION_STRING)
    handles.push(handle)

    expect(handle.db).toBeDefined()
    expect(handle.pool.totalCount).toBe(0)
  })

  it('gives each caller its own pool', () => {
    // The app keeps one shared handle; tests build their own against a
    // throwaway database, and the two must not share connections.
    const first = createDatabase(CONNECTION_STRING)
    const second = createDatabase(CONNECTION_STRING)
    handles.push(first, second)

    expect(first.pool).not.toBe(second.pool)
  })
})
