import { describe, expect, it } from 'vitest'
import { contentsView } from './contents-view'

const ENTRY = { title: '1 Introduction', depth: 1, pageIndex: 0, top: 90 }

describe('contentsView', () => {
  it('waits for sync before saying anything about the paper', () => {
    expect(contentsView('syncing', undefined, 'enriched')).toEqual({
      kind: 'loading',
    })
  })

  it('says sync failed when it did', () => {
    expect(contentsView('error', undefined, 'enriched')).toEqual({
      kind: 'error',
    })
  })

  it('says the paper is being read when it has no row yet', () => {
    expect(contentsView('ready', undefined, 'grobid_only')).toEqual({
      kind: 'reading',
    })
    expect(contentsView('ready', undefined, 'pending')).toEqual({
      kind: 'reading',
    })
  })

  // Nothing reads a paper whose extraction failed, so "reading…" would wait
  // forever.
  it('says reading failed for a paper whose extraction did', () => {
    expect(contentsView('ready', undefined, 'failed')).toEqual({
      kind: 'failed',
    })
  })

  it('tells none apart from failed', () => {
    expect(
      contentsView('ready', { source: 'none', entries: [] }, 'enriched'),
    ).toEqual({ kind: 'none' })
    expect(
      contentsView('ready', { source: 'failed', entries: [] }, 'enriched'),
    ).toEqual({ kind: 'failed' })
  })

  it('shows the entries of an outline or of headings', () => {
    for (const source of ['outline', 'headings'] as const) {
      expect(
        contentsView('ready', { source, entries: [ENTRY] }, 'enriched'),
      ).toEqual({ kind: 'entries', entries: [ENTRY] })
    }
  })

  it('treats a source with no entries as none', () => {
    expect(
      contentsView('ready', { source: 'outline', entries: [] }, 'enriched'),
    ).toEqual({ kind: 'none' })
  })
})
