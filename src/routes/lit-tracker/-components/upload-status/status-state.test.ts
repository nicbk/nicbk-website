import { describe, expect, it } from 'vitest'
import {
  EMPTY_READS,
  referenceReadSummary,
  uploadStatusLabel,
  uploadStatusState,
} from './status-state'

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

describe('referenceReadSummary', () => {
  it('counts a batch as the list shows it', () => {
    expect(
      referenceReadSummary([
        { articleId: 'a', status: 'done' },
        { articleId: 'b', status: 'queued' },
        { articleId: 'c', status: 'failed' },
        { articleId: 'd', status: null },
      ]),
    ).toEqual({ done: 1, total: 4, queued: 2, failedArticleIds: ['c'] })
  })

  it('is empty with no re-reads', () => {
    expect(referenceReadSummary([])).toEqual(EMPTY_READS)
  })
})

describe('uploadStatusState with re-reads', () => {
  const reads = (rows: { articleId: string; status: string }[]) =>
    referenceReadSummary(rows)

  it('is in progress while a paper is still queued', () => {
    expect(
      uploadStatusState([], reads([{ articleId: 'a', status: 'queued' }])),
    ).toBe('in-progress')
  })

  it('is failed while a re-read has failed, however much else is running', () => {
    expect(
      uploadStatusState(
        [{ status: 'processing' }],
        reads([
          { articleId: 'a', status: 'queued' },
          { articleId: 'b', status: 'failed' },
        ]),
      ),
    ).toBe('failed')
  })

  it('is synced when every paper in the batch is done', () => {
    expect(
      uploadStatusState([], reads([{ articleId: 'a', status: 'done' }])),
    ).toBe('synced')
  })
})

describe('uploadStatusLabel with re-reads', () => {
  it('does not call a re-read an upload', () => {
    expect(uploadStatusLabel('in-progress', [])).toBe('Re-reading references')
    expect(uploadStatusLabel('failed', [])).toBe(
      'Some references could not be re-read',
    )
  })

  it('names uploads when there are any', () => {
    expect(uploadStatusLabel('in-progress', [{ status: 'processing' }])).toBe(
      'Uploads in progress',
    )
    expect(uploadStatusLabel('failed', [{ status: 'failed' }])).toBe(
      'Some uploads need attention',
    )
  })
})
