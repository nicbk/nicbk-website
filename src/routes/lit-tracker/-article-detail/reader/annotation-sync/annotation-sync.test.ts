import type { PdfAnnotationObject } from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { AnnotationEvent } from '@embedpdf/plugin-annotation'
import { describe, expect, it } from 'vitest'
import type { SyncedAnnotation } from './annotation-row'
import type { AppliedAnnotation } from './annotation-sync'
import { changesForRows, fingerprint, writeForEvent } from './annotation-sync'

/**
 * The two rules that keep the bridge from writing in a loop.
 *
 * Both failures this file exists for are silent and expensive rather than
 * visible: persisting uncommitted events writes a row per animation frame while
 * an ink stroke is dragged, and persisting the engine's echo of an import
 * rewrites every mark on a paper each time it is opened. Neither throws, and
 * neither is visible in the reader — the only place either shows up is the row
 * count in the database, which is why they are asserted here against a fake
 * event source with no engine anywhere.
 */

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'
const RECT = { origin: { x: 0, y: 0 }, size: { width: 10, height: 10 } }

function highlight(id: string, overrides: Partial<PdfAnnotationObject> = {}) {
  return {
    id,
    type: PdfAnnotationSubtype.HIGHLIGHT,
    pageIndex: 2,
    rect: RECT,
    color: '#ffd400',
    ...overrides,
  } as PdfAnnotationObject
}

function event(
  type: 'create' | 'update' | 'delete',
  annotation: PdfAnnotationObject,
  committed: boolean,
): AnnotationEvent {
  return {
    type,
    documentId: ARTICLE_ID,
    annotation,
    pageIndex: annotation.pageIndex,
    patch: {},
    committed,
  } as AnnotationEvent
}

/** The record of agreement, as it stands after one mark has been stored. */
function applied(
  annotation: PdfAnnotationObject,
): Map<string, AppliedAnnotation> {
  const row = {
    pageIndex: annotation.pageIndex,
    contents: annotation.contents ?? null,
    // The same payload `toRow` would build for `highlight()` above.
    payload: { rect: RECT, color: '#ffd400' },
  }
  return new Map([
    [
      annotation.id,
      { fingerprint: fingerprint(row), pageIndex: row.pageIndex },
    ],
  ])
}

describe('the committed-only rule', () => {
  it('writes nothing for a change still being made', () => {
    expect(
      writeForEvent(
        event('create', highlight('a1'), false),
        ARTICLE_ID,
        new Map(),
      ),
    ).toBeNull()
  })

  it('writes once for the commit that follows', () => {
    const write = writeForEvent(
      event('create', highlight('a1'), true),
      ARTICLE_ID,
      new Map(),
    )

    expect(write).toMatchObject({ kind: 'create', row: { id: 'a1' } })
  })

  it('writes one row for a burst of in-progress changes and one commit', () => {
    // The test that would have caught the defect the rule exists to prevent:
    // dragging one ink stroke emits a change per animation frame, and only the
    // last of them is committed.
    const record = new Map<string, AppliedAnnotation>()
    const writes = []

    for (let frame = 0; frame < 40; frame += 1) {
      const write = writeForEvent(
        event('update', highlight('a1', { rect: RECT }), false),
        ARTICLE_ID,
        record,
      )
      if (write) {
        writes.push(write)
      }
    }

    const committed = writeForEvent(
      event('create', highlight('a1'), true),
      ARTICLE_ID,
      record,
    )
    if (committed) {
      writes.push(committed)
    }

    expect(writes).toHaveLength(1)
  })

  it('ignores the load event, which reports a count rather than a change', () => {
    const loaded = {
      type: 'loaded',
      documentId: ARTICLE_ID,
      total: 4,
    } as AnnotationEvent

    expect(writeForEvent(loaded, ARTICLE_ID, new Map())).toBeNull()
  })
})

describe('the echo check', () => {
  it('does not rewrite a mark it has just put on the paper', () => {
    // `importAnnotations` dispatches a create per item and then commits, so
    // restoring stored marks makes the engine report every one of them as a
    // committed creation. Without this, opening a paper rewrites every mark on
    // it — once per open, forever.
    const mark = highlight('a1')

    expect(
      writeForEvent(event('create', mark, true), ARTICLE_ID, applied(mark)),
    ).toBeNull()
  })

  it('writes a real change to a mark it knows', () => {
    const mark = highlight('a1')
    const moved = highlight('a1', {
      rect: { origin: { x: 50, y: 50 }, size: { width: 10, height: 10 } },
    })

    expect(
      writeForEvent(event('update', moved, true), ARTICLE_ID, applied(mark)),
    ).toMatchObject({ kind: 'update', row: { id: 'a1' } })
  })

  it('deletes only what it stored', () => {
    const mark = highlight('a1')

    expect(
      writeForEvent(event('delete', mark, true), ARTICLE_ID, applied(mark)),
    ).toEqual({ kind: 'delete', id: 'a1' })
    expect(
      writeForEvent(event('delete', mark, true), ARTICLE_ID, new Map()),
    ).toBeNull()
  })

  it('does not adopt a mark the PDF itself carried', () => {
    // Editing a free-text annotation a preprint arrived with must not create a
    // row: the file would go on drawing its own copy, and the paper would open
    // with the mark twice.
    const embedded = {
      id: 'pdf-1',
      type: PdfAnnotationSubtype.FREETEXT,
      pageIndex: 0,
      rect: RECT,
    } as PdfAnnotationObject

    expect(
      writeForEvent(event('update', embedded, true), ARTICLE_ID, new Map()),
    ).toBeNull()
  })

  it('never writes a type outside the twelve', () => {
    const link = {
      id: 'l1',
      type: PdfAnnotationSubtype.LINK,
      pageIndex: 0,
      rect: RECT,
    } as PdfAnnotationObject

    expect(
      writeForEvent(event('create', link, true), ARTICLE_ID, new Map()),
    ).toBeNull()
  })
})

describe('applying what sync delivered', () => {
  const row: SyncedAnnotation = {
    id: 'a1',
    type: 'highlight',
    pageIndex: 2,
    contents: null,
    payload: { rect: RECT, color: '#ffd400' },
    createdAt: 1,
    updatedAt: 1,
  }

  it('puts a paper’s stored marks on it when nothing is known yet', () => {
    expect(changesForRows([row], new Map()).changes).toEqual([
      { kind: 'add', annotation: row, applied: expect.anything() },
    ])
  })

  it('leaves alone what the engine already agrees with', () => {
    const record = new Map([
      [row.id, { fingerprint: fingerprint(row), pageIndex: row.pageIndex }],
    ])

    expect(changesForRows([row], record).changes).toEqual([])
  })

  it('replaces a mark another window changed', () => {
    const record = new Map([
      [row.id, { fingerprint: fingerprint(row), pageIndex: row.pageIndex }],
    ])
    const edited = { ...row, contents: 'edited elsewhere', updatedAt: 2 }

    expect(changesForRows([edited], record).changes).toEqual([
      { kind: 'replace', annotation: edited, applied: expect.anything() },
    ])
  })

  it('takes off a mark another window deleted', () => {
    const record = new Map([
      [row.id, { fingerprint: fingerprint(row), pageIndex: row.pageIndex }],
    ])

    expect(changesForRows([], record).changes).toEqual([
      { kind: 'remove', id: 'a1', pageIndex: 2 },
    ])
  })

  it('does not take off a mark the reader has just made', () => {
    // The defect this exists for, and it is the one a reader sees: a highlight
    // appears, flickers, and vanishes (user-reported). A local create records
    // the mark as applied and sends the write; if *any* delivery of rows arrives
    // before that row is in it — which it does, since a query result and an
    // optimistic write land on their own schedules — the reconciliation below
    // sees "recorded, but not in the rows" and concludes the mark was deleted
    // elsewhere. It then takes the reader's new mark off the paper.
    //
    // A mark written by this client is not evidence of anything until the
    // database has confirmed it, so it is not removable until then.
    const justCreated = new Map([
      [
        row.id,
        {
          fingerprint: fingerprint(row),
          pageIndex: row.pageIndex,
          pending: true,
        },
      ],
    ])

    expect(changesForRows([], justCreated).changes).toEqual([])
  })

  it('removes it once the database has confirmed it and then lost it', () => {
    // The other half: once a row has been seen, its absence is real — that is
    // another window deleting it, which must reach this one.
    const confirmed = changesForRows(
      [row],
      new Map([
        [
          row.id,
          {
            fingerprint: fingerprint(row),
            pageIndex: row.pageIndex,
            pending: true,
          },
        ],
      ]),
    ).applied

    expect(changesForRows([], confirmed).changes).toEqual([
      { kind: 'remove', id: 'a1', pageIndex: 2 },
    ])
  })

  it('does not snap a mark back to where a stale delivery still has it', () => {
    // The rubber-banding a reader sees when dragging a mark quickly
    // (user-reported). Two writes go out; a delivery carrying the *first* one
    // arrives between them. Applying it would move the mark back to a position
    // the reader has already left — and the engine would report that move as a
    // change of its own, so the stale position could be the one that sticks.
    const movedTwice = new Map([
      [
        row.id,
        {
          fingerprint: fingerprint({ ...row, pageIndex: 9 }),
          pageIndex: 9,
          pending: true,
        },
      ],
    ])

    expect(changesForRows([row], movedTwice).changes).toEqual([])
  })

  it('settles when the row it wrote comes back, and follows sync again after', () => {
    // The confirmation, and the reason ignoring deliveries while pending is safe
    // rather than permanent: the matching row clears the flag, and the next
    // delivery is authoritative again.
    const inFlight = new Map([
      [
        row.id,
        {
          fingerprint: fingerprint(row),
          pageIndex: row.pageIndex,
          pending: true,
        },
      ],
    ])

    const settled = changesForRows([row], inFlight).applied
    expect(settled.get(row.id)?.pending).toBeFalsy()

    const edited = { ...row, contents: 'edited elsewhere', updatedAt: 2 }
    expect(changesForRows([edited], settled).changes).toEqual([
      { kind: 'replace', annotation: edited, applied: expect.anything() },
    ])
  })

  it('never removes a mark the PDF itself carried', () => {
    // Removals come from the record of what this bridge applied, not from the
    // engine's contents — so however this article's rows change, the file's own
    // annotations are not this bridge's to take away.
    expect(changesForRows([], new Map()).changes).toEqual([])
  })
})

describe('the fingerprint', () => {
  it('ignores the timestamps the server sets', () => {
    // Including `updatedAt` would make every stored mark differ from its own
    // echo the moment it came back from sync, which is the loop this breaks.
    const row: SyncedAnnotation = {
      id: 'a1',
      type: 'highlight',
      pageIndex: 0,
      contents: null,
      payload: { rect: RECT },
      createdAt: 1,
      updatedAt: 1,
    }

    const later: SyncedAnnotation = { ...row, updatedAt: 9999 }

    expect(fingerprint(row)).toBe(fingerprint(later))
  })

  it('does not care what order the keys are in', () => {
    /*
     * The defect this exists for, and it is the one that made a dragged mark
     * rubber-band no matter how the races above were handled (user-reported).
     *
     * The two sides of every comparison come from different places: one is the
     * object EmbedPDF just reported, the other is that object after a trip
     * through a `jsonb` column. **Postgres `jsonb` does not preserve key order**
     * — it stores keys sorted by length, then bytewise — so the same mark
     * stringifies two different ways. Every delivery then looked like a remote
     * edit: replace the mark, the engine reports the replacement, write it,
     * receive it re-sorted, replace again. A loop, visible as jitter.
     */
    const engineOrder = {
      pageIndex: 0,
      contents: null,
      payload: {
        segmentRects: [
          { origin: { x: 1, y: 2 }, size: { width: 3, height: 4 } },
        ],
        rect: RECT,
        color: '#ffd400',
      },
    }
    const jsonbOrder = {
      pageIndex: 0,
      contents: null,
      payload: {
        rect: { size: { height: 10, width: 10 }, origin: { y: 0, x: 0 } },
        color: '#ffd400',
        segmentRects: [
          { size: { height: 4, width: 3 }, origin: { y: 2, x: 1 } },
        ],
      },
    }

    expect(fingerprint(engineOrder)).toBe(fingerprint(jsonbOrder))
  })

  it('still distinguishes a different array order, which is data', () => {
    // Key order is representation; element order is meaning. An ink stroke's
    // points reversed is a different stroke.
    const first = {
      pageIndex: 0,
      contents: null,
      payload: {
        points: [
          { x: 0, y: 0 },
          { x: 9, y: 9 },
        ],
      },
    }
    const reversed = {
      pageIndex: 0,
      contents: null,
      payload: {
        points: [
          { x: 9, y: 9 },
          { x: 0, y: 0 },
        ],
      },
    }

    expect(fingerprint(first)).not.toBe(fingerprint(reversed))
  })

  it('changes when the mark does', () => {
    const row: SyncedAnnotation = {
      id: 'a1',
      type: 'highlight',
      pageIndex: 0,
      contents: null,
      payload: { rect: RECT },
      createdAt: 1,
      updatedAt: 1,
    }

    expect(fingerprint(row)).not.toBe(
      fingerprint({ ...row, contents: 'a thought' }),
    )
    expect(fingerprint(row)).not.toBe(fingerprint({ ...row, pageIndex: 1 }))
    expect(fingerprint(row)).not.toBe(
      fingerprint({ ...row, payload: { rect: RECT, color: '#000000' } }),
    )
  })
})
