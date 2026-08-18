import type { PdfAnnotationObject } from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import { ANNOTATION_TYPES } from '~/lit-tracker/annotation-type'
import type { SyncedAnnotation } from './annotation-row'
import {
  annotationIntent,
  quotedText,
  toAnnotation,
  toRow,
} from './annotation-row'

/**
 * The translation, in both directions and for every type.
 *
 * This is the file the task's testing plan calls the part that can be wrong
 * quietly: nothing throws when a field is dropped — an ink stroke simply comes
 * back without its points, and only a reader reopening the paper finds out. So
 * the load-bearing test here is the round trip over all twelve types, carrying
 * the fields each type actually needs to be redrawn.
 */

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'
const RECT = { origin: { x: 10, y: 20 }, size: { width: 100, height: 40 } }

/**
 * One annotation of each of the twelve types, each carrying the fields that
 * type genuinely uses.
 *
 * Written out rather than generated, because the point is the type-specific
 * fields — `inkList` for ink, `segmentRects` for the markups, `vertices` for the
 * shapes, `fontSize` for free text. A generated fixture would round-trip a
 * shared skeleton and prove nothing about any of them.
 */
const EXAMPLES: PdfAnnotationObject[] = [
  {
    id: 'a1',
    type: PdfAnnotationSubtype.HIGHLIGHT,
    pageIndex: 0,
    rect: RECT,
    contents: 'the passage itself',
    color: '#ffd400',
    opacity: 0.5,
    segmentRects: [RECT],
  },
  {
    id: 'a2',
    type: PdfAnnotationSubtype.UNDERLINE,
    pageIndex: 1,
    rect: RECT,
    color: '#2563eb',
    segmentRects: [RECT, RECT],
  },
  {
    id: 'a3',
    type: PdfAnnotationSubtype.STRIKEOUT,
    pageIndex: 1,
    rect: RECT,
    color: '#dc2626',
    segmentRects: [RECT],
  },
  {
    id: 'a4',
    type: PdfAnnotationSubtype.SQUIGGLY,
    pageIndex: 2,
    rect: RECT,
    color: '#16a34a',
    segmentRects: [RECT],
  },
  {
    id: 'a5',
    type: PdfAnnotationSubtype.INK,
    pageIndex: 3,
    rect: RECT,
    color: '#111111',
    strokeWidth: 2,
    inkList: [
      {
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
          { x: 5, y: 6 },
        ],
      },
    ],
  },
  {
    id: 'a6',
    type: PdfAnnotationSubtype.SQUARE,
    pageIndex: 3,
    rect: RECT,
    strokeColor: '#111111',
    strokeWidth: 1,
  },
  {
    id: 'a7',
    type: PdfAnnotationSubtype.CIRCLE,
    pageIndex: 4,
    rect: RECT,
    strokeColor: '#111111',
    strokeWidth: 3,
  },
  {
    id: 'a8',
    type: PdfAnnotationSubtype.LINE,
    pageIndex: 4,
    rect: RECT,
    linePoints: { start: { x: 0, y: 0 }, end: { x: 10, y: 10 } },
    strokeWidth: 1,
  },
  {
    id: 'a9',
    type: PdfAnnotationSubtype.POLYLINE,
    pageIndex: 5,
    rect: RECT,
    vertices: [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ],
    strokeWidth: 1,
  },
  {
    id: 'a10',
    type: PdfAnnotationSubtype.POLYGON,
    pageIndex: 5,
    rect: RECT,
    vertices: [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ],
    strokeWidth: 1,
  },
  {
    id: 'a11',
    type: PdfAnnotationSubtype.FREETEXT,
    pageIndex: 6,
    rect: RECT,
    contents: 'a note in the margin',
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontColor: '#111111',
  },
  {
    id: 'a12',
    type: PdfAnnotationSubtype.TEXT,
    pageIndex: 7,
    rect: RECT,
    contents: 'ask about this figure',
    color: '#ffd400',
  },
] as PdfAnnotationObject[]

describe('toRow', () => {
  it('promotes exactly the four things stored as columns', () => {
    const row = toRow(EXAMPLES[0] as PdfAnnotationObject, ARTICLE_ID)

    expect(row).toMatchObject({
      id: 'a1',
      articleId: ARTICLE_ID,
      type: 'highlight',
      pageIndex: 0,
      contents: 'the passage itself',
    })
  })

  it('keeps everything type-specific in the payload, and nothing else', () => {
    const row = toRow(EXAMPLES[0] as PdfAnnotationObject, ARTICLE_ID)

    expect(row?.payload).toEqual({
      rect: RECT,
      color: '#ffd400',
      opacity: 0.5,
      segmentRects: [RECT],
    })
  })

  it('does not store the author or EmbedPDF’s own timestamps', () => {
    // Decided in research/data-modeling/annotations-schema.md: the row's own
    // `user_id` and timestamps serve both, so a stored copy would be a duplicate
    // free to disagree. It is also what keeps the payload JSON — a `Date` is not.
    const row = toRow(
      {
        ...(EXAMPLES[0] as PdfAnnotationObject),
        author: 'someone',
        created: new Date('2026-01-01'),
        modified: new Date('2026-02-02'),
      },
      ARTICLE_ID,
    )

    expect(row?.payload).not.toHaveProperty('author')
    expect(row?.payload).not.toHaveProperty('created')
    expect(row?.payload).not.toHaveProperty('modified')
    expect(JSON.parse(JSON.stringify(row?.payload))).toEqual(row?.payload)
  })

  it('does not carry an appearance-stream claim into a fresh PDF', () => {
    // `appearanceModes` describes the binary an annotation was read out of. This
    // reader never rewrites the binary, so storing it would claim an appearance
    // stream the next freshly-fetched PDF does not contain.
    const row = toRow(
      { ...(EXAMPLES[0] as PdfAnnotationObject), appearanceModes: 1 },
      ARTICLE_ID,
    )

    expect(row?.payload).not.toHaveProperty('appearanceModes')
  })

  it('stores an empty contents as absent rather than as a string', () => {
    // A shape or an ink stroke has nothing to say. This is expected, not a
    // defect — task 5 renders a fallback for it.
    const row = toRow(EXAMPLES[5] as PdfAnnotationObject, ARTICLE_ID)

    expect(row?.contents).toBeNull()
  })

  it('refuses a stamp', () => {
    // Out of scope by decision: the one type whose payload is a binary image.
    // The boundary is asserted rather than assumed.
    const stamp = {
      id: 's1',
      type: PdfAnnotationSubtype.STAMP,
      pageIndex: 0,
      rect: RECT,
    } as PdfAnnotationObject

    expect(toRow(stamp, ARTICLE_ID)).toBeNull()
  })

  it('refuses the annotations a PDF arrives carrying', () => {
    // A published paper is full of link annotations, and the engine reports
    // events about them like any other. Storing them would fill this table with
    // the file's own furniture — and draw each one twice on the next load.
    for (const subtype of [
      PdfAnnotationSubtype.LINK,
      PdfAnnotationSubtype.POPUP,
      PdfAnnotationSubtype.WIDGET,
      PdfAnnotationSubtype.CARET,
    ]) {
      const annotation = {
        id: 'x',
        type: subtype,
        pageIndex: 0,
        rect: RECT,
      } as PdfAnnotationObject

      expect(toRow(annotation, ARTICLE_ID)).toBeNull()
    }
  })

  it('covers every stored type, and only those', () => {
    const stored = EXAMPLES.map(
      (annotation) => toRow(annotation, ARTICLE_ID)?.type,
    )

    expect(new Set(stored)).toEqual(new Set(ANNOTATION_TYPES))
  })
})

describe('toAnnotation', () => {
  it('fills the author and the dates in from the row', () => {
    const row: SyncedAnnotation = {
      id: 'a1',
      type: 'highlight',
      pageIndex: 0,
      contents: null,
      payload: { rect: RECT },
      createdAt: Date.UTC(2026, 0, 1),
      updatedAt: Date.UTC(2026, 1, 2),
    }

    const annotation = toAnnotation(row, 'nicolás')

    expect(annotation.author).toBe('nicolás')
    expect(annotation.created).toEqual(new Date(Date.UTC(2026, 0, 1)))
    expect(annotation.modified).toEqual(new Date(Date.UTC(2026, 1, 2)))
  })

  it('leaves the dates off when the row has none', () => {
    // Nullable only because the column carries a database default; honoured
    // rather than asserted away.
    const annotation = toAnnotation(
      {
        id: 'a1',
        type: 'highlight',
        pageIndex: 0,
        contents: null,
        payload: { rect: RECT },
        createdAt: null,
        updatedAt: null,
      },
      undefined,
    )

    expect(annotation.created).toBeUndefined()
    expect(annotation.modified).toBeUndefined()
  })
})

describe('the round trip', () => {
  it.each(
    EXAMPLES.map((annotation) => [annotation.type, annotation] as const),
  )('loses nothing the engine needs to redraw type %i', (_subtype, annotation) => {
    const row = toRow(annotation, ARTICLE_ID)
    expect(row).not.toBeNull()

    const restored = toAnnotation(
      {
        ...(row as NonNullable<typeof row>),
        createdAt: Date.UTC(2026, 0, 1),
        updatedAt: Date.UTC(2026, 0, 1),
      },
      undefined,
    )

    // Every field the original carried is back, with the same value. The
    // restored object also carries `created`/`modified`, which is the point of
    // storing neither.
    expect(restored).toMatchObject(annotation)
  })

  it('survives the JSON the payload column actually stores', () => {
    // The row does not go into Postgres as a JavaScript object: it is serialized
    // to `jsonb` and parsed back. A payload holding anything JSON cannot carry
    // would round-trip in memory and lose a field in the database, which is
    // exactly the failure this project would notice last.
    for (const annotation of EXAMPLES) {
      const row = toRow(annotation, ARTICLE_ID)
      const throughJson = JSON.parse(JSON.stringify(row?.payload))

      expect(throughJson).toEqual(row?.payload)
    }
  })
})

describe('quotedText', () => {
  it('finds the passage the engine captured at creation', () => {
    // EmbedPDF's own text-markup handler writes the selected text here, and
    // `toPayload` carries it through. It has been arriving in every highlight
    // since task 4; task 5's list showed a type name because it read `contents`.
    expect(
      quotedText({
        payload: { custom: { text: 'Label Smoothing During training' } },
      }),
    ).toBe('Label Smoothing During training')
  })

  it('finds nothing on a mark that was not drawn over text', () => {
    // The ordinary case for ink, shapes and the sticky note.
    expect(quotedText({ payload: {} })).toBeNull()
    expect(quotedText({ payload: { custom: {} } })).toBeNull()
  })

  it('treats blank as absent, a quote of nothing not being a quote', () => {
    expect(quotedText({ payload: { custom: { text: '   ' } } })).toBeNull()
    expect(quotedText({ payload: { custom: { text: '' } } })).toBeNull()
  })

  it('does not trust the shape, the payload being EmbedPDF’s to define', () => {
    expect(quotedText({ payload: { custom: null } })).toBeNull()
    expect(quotedText({ payload: { custom: ['text'] } })).toBeNull()
    expect(quotedText({ payload: { custom: 'text' } })).toBeNull()
    expect(quotedText({ payload: { custom: { text: 42 } } })).toBeNull()
  })
})

describe('annotationIntent', () => {
  it('reads the field that separates two marks of one subtype', () => {
    // A highlight box and a plain rectangle are both stored as `square`.
    expect(annotationIntent({ payload: { intent: 'SquareHighlight' } })).toBe(
      'SquareHighlight',
    )
  })

  it('is null when the mark carries none, which is most of them', () => {
    expect(annotationIntent({ payload: {} })).toBeNull()
    expect(annotationIntent({ payload: { intent: 7 } })).toBeNull()
  })
})
