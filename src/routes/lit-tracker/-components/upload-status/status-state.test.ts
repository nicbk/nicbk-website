import { describe, expect, it } from 'vitest'
import { uploadStatusLabel, uploadStatusState } from './status-state'

describe('uploadStatusState', () => {
  it('is synced when there are no unresolved jobs', () => {
    // Resolved jobs are deleted rather than marked, so an empty list means
    // "nothing outstanding" and never "nothing loaded".
    expect(uploadStatusState([])).toBe('synced')
  })

  it('is in-progress while a job is processing', () => {
    expect(uploadStatusState([{ status: 'processing' }])).toBe('in-progress')
  })

  it('is failed when a job has failed', () => {
    expect(uploadStatusState([{ status: 'failed' }])).toBe('failed')
  })

  it('reports failure even while other uploads are still running', () => {
    // The state that asks for attention wins: otherwise a broken upload would
    // stay hidden behind the spinner until the queue happened to drain.
    expect(
      uploadStatusState([
        { status: 'processing' },
        { status: 'failed' },
        { status: 'processing' },
      ]),
    ).toBe('failed')
  })

  it('treats a null status as processing', () => {
    // Zero types every synced column nullable; the column itself is NOT NULL
    // with a 'processing' default, so this is the only consistent reading.
    expect(uploadStatusState([{ status: null }])).toBe('in-progress')
  })
})

describe('uploadStatusLabel', () => {
  it('gives the synced state the tooltip text the spec names', () => {
    expect(uploadStatusLabel('synced')).toBe('All articles synced')
  })

  it('names all three states distinctly, without relying on color', () => {
    const labels = [
      uploadStatusLabel('synced'),
      uploadStatusLabel('in-progress'),
      uploadStatusLabel('failed'),
    ]

    expect(new Set(labels).size).toBe(3)
    for (const label of labels) {
      expect(label.length).toBeGreaterThan(0)
    }
  })
})
