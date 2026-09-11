import type { AnnotationTool } from '@embedpdf/plugin-annotation'
import type { FormattedSelection } from '@embedpdf/plugin-selection'
import { describe, expect, it } from 'vitest'
import { marksFor } from './markup-marks'

/**
 * What a text tool makes of a selected passage.
 *
 * The shape is asserted against a tool of the same form the plugin ships rather
 * than a hand-made fixture, because the point of taking `defaults` from the tool
 * is that this cannot drift from the library on colour, opacity or flags — and a
 * fixture that invented its own defaults would assert the drift rather than
 * catch it.
 */

/** A highlight tool, shaped as `plugin-annotation`'s own default tools are. */
const HIGHLIGHT = {
  id: 'highlight',
  name: 'Highlight',
  matchScore: () => 0,
  defaults: {
    type: 9,
    color: '#FFCD45',
    opacity: 0.6,
    blendMode: 1,
    flags: ['print'],
  },
  interaction: { exclusive: false, textSelection: true },
} as unknown as AnnotationTool

/** A drawing tool: same shape, no business marking text. */
const RECTANGLE = {
  ...HIGHLIGHT,
  id: 'square',
  interaction: { exclusive: false, textSelection: false },
} as unknown as AnnotationTool

/** A passage running off the bottom of one page and onto the next. */
const ACROSS_PAGES: FormattedSelection[] = [
  {
    pageIndex: 0,
    rect: { origin: { x: 10, y: 700 }, size: { width: 400, height: 20 } },
    segmentRects: [
      { origin: { x: 10, y: 700 }, size: { width: 400, height: 20 } },
    ],
  },
  {
    pageIndex: 1,
    rect: { origin: { x: 10, y: 40 }, size: { width: 300, height: 44 } },
    segmentRects: [
      { origin: { x: 10, y: 40 }, size: { width: 300, height: 20 } },
      { origin: { x: 10, y: 64 }, size: { width: 200, height: 20 } },
    ],
  },
]

const CREATED = new Date('2026-09-11T12:00:00Z')

describe('marksFor', () => {
  it('makes one mark per page the passage covers', () => {
    // The library's own shape: a rectangle cannot span the gap between two
    // pages, so a passage crossing a break is two marks.
    const marks = marksFor({
      tool: HIGHLIGHT,
      selection: ACROSS_PAGES,
      text: 'attention is all you need',
      ids: ['one', 'two'],
      created: CREATED,
    })

    expect(marks.map((mark) => mark.pageIndex)).toEqual([0, 1])
  })

  it('gives each mark the rectangles belonging to its own page', () => {
    const marks = marksFor({
      tool: HIGHLIGHT,
      selection: ACROSS_PAGES,
      text: 'x',
      ids: ['one', 'two'],
      created: CREATED,
    })

    expect(marks[1]?.annotation).toMatchObject({
      pageIndex: 1,
      rect: ACROSS_PAGES[1]?.rect,
      segmentRects: ACROSS_PAGES[1]?.segmentRects,
    })
  })

  it('takes its appearance from the tool, not from anything of its own', () => {
    // The reason this duplication is affordable: everything that could drift
    // from the library comes from the tool the library itself defines.
    const marks = marksFor({
      tool: HIGHLIGHT,
      selection: [ACROSS_PAGES[0] as FormattedSelection],
      text: 'x',
      ids: ['one'],
      created: CREATED,
    })

    expect(marks[0]?.annotation).toMatchObject({
      type: 9,
      color: '#FFCD45',
      opacity: 0.6,
      blendMode: 1,
      flags: ['print'],
    })
  })

  it('quotes the passage, which is what the sidebar shows', () => {
    const marks = marksFor({
      tool: HIGHLIGHT,
      selection: [ACROSS_PAGES[0] as FormattedSelection],
      text: 'attention is all you need',
      ids: ['one'],
      created: CREATED,
    })

    expect(marks[0]?.annotation).toMatchObject({
      custom: { text: 'attention is all you need' },
    })
  })

  it('omits the quote rather than inventing an empty one', () => {
    // A document may withhold permission to extract its text. The passage is
    // still worth marking; the mark simply quotes nothing.
    const marks = marksFor({
      tool: HIGHLIGHT,
      selection: [ACROSS_PAGES[0] as FormattedSelection],
      text: undefined,
      ids: ['one'],
      created: CREATED,
    })

    expect(marks[0]?.annotation).not.toHaveProperty('custom')
  })

  it('uses the ids it was given, in page order', () => {
    // Supplied rather than generated so the caller can record them, and so this
    // stays assertable.
    const marks = marksFor({
      tool: HIGHLIGHT,
      selection: ACROSS_PAGES,
      text: 'x',
      ids: ['first', 'second'],
      created: CREATED,
    })

    expect(marks.map((mark) => mark.annotation.id)).toEqual(['first', 'second'])
  })

  it('makes nothing for a tool that does not act on text', () => {
    expect(
      marksFor({
        tool: RECTANGLE,
        selection: ACROSS_PAGES,
        text: 'x',
        ids: ['one', 'two'],
        created: CREATED,
      }),
    ).toEqual([])
  })

  it('makes nothing when there are no ids to go round', () => {
    // Defensive, and cheap: a mark with an undefined id would be written to the
    // database and be unaddressable afterwards.
    expect(
      marksFor({
        tool: HIGHLIGHT,
        selection: ACROSS_PAGES,
        text: 'x',
        ids: [],
        created: CREATED,
      }),
    ).toEqual([])
  })
})
