import type { AnnotationTool } from '@embedpdf/plugin-annotation'
import { beforeEach, describe, expect, it } from 'vitest'
import type { MarkingTools } from './mark-selection'
import { markSelection } from './mark-selection'

/**
 * The one commit path, shared by the gesture that finishes a selection the
 * library left open and the action a reader chooses from the selection's menu.
 *
 * It has its own file because it has two callers: a change here reaches both,
 * and a test that lived inside either would only be watching half of what it
 * protects.
 */

const DOCUMENT_ID = '018f5b6c-0000-7000-8000-000000000001'

const HIGHLIGHT = {
  id: 'highlight',
  name: 'Highlight',
  matchScore: () => 0,
  defaults: { type: 9, color: '#FFCD45' },
  interaction: { exclusive: false, textSelection: true },
} as unknown as AnnotationTool

const ACROSS_PAGES = [
  {
    pageIndex: 0,
    rect: { origin: { x: 10, y: 700 }, size: { width: 400, height: 20 } },
    segmentRects: [
      { origin: { x: 10, y: 700 }, size: { width: 400, height: 20 } },
    ],
  },
  {
    pageIndex: 1,
    rect: { origin: { x: 10, y: 40 }, size: { width: 300, height: 20 } },
    segmentRects: [
      { origin: { x: 10, y: 40 }, size: { width: 300, height: 20 } },
    ],
  },
]

const library = {
  formatted: ACROSS_PAGES as typeof ACROSS_PAGES,
  cleared: 0,
  created: [] as { pageIndex: number; id: string; text?: string }[],
  textFails: false,
}

/** A settled `PdfTask`, as `@embedpdf/models` builds them. */
function task<T>(value: T, fails: boolean) {
  return {
    wait: (resolve: (value: T) => void, reject: (reason: unknown) => void) => {
      if (fails) {
        reject({ type: 'reject', reason: 'no permission' })
        return
      }
      resolve(value)
    },
  }
}

const selection = {
  getFormattedSelection: () => library.formatted,
  getSelectedText: () =>
    task(['attention is all', 'you need'], library.textFails),
  clear: () => {
    library.cleared += 1
  },
} as never

const tools: MarkingTools = {
  createAnnotation: (pageIndex, annotation) => {
    const mark = annotation as unknown as {
      id: string
      custom?: { text: string }
    }
    library.created.push({
      pageIndex,
      id: mark.id,
      ...(mark.custom && { text: mark.custom.text }),
    })
  },
}

function mark(overrides: { tools?: MarkingTools | null } = {}) {
  markSelection({
    selection,
    tools: overrides.tools === undefined ? tools : overrides.tools,
    tool: HIGHLIGHT,
    documentId: DOCUMENT_ID,
  })
}

beforeEach(() => {
  library.formatted = ACROSS_PAGES
  library.cleared = 0
  library.created = []
  library.textFails = false
})

describe('markSelection', () => {
  it('makes one mark per page the passage covers', () => {
    mark()

    expect(library.created.map((made) => made.pageIndex)).toEqual([0, 1])
  })

  it('quotes the passage, joined as the library joins it', () => {
    // So a mark made here reads in the sidebar exactly as one made by dragging
    // the tool does.
    mark()

    expect(library.created[0]?.text).toBe('attention is all\nyou need')
  })

  it('gives every mark an id of its own', () => {
    mark()

    const [first, second] = library.created
    expect(first?.id).toBeTruthy()
    expect(first?.id).not.toBe(second?.id)
  })

  it('clears the selection afterwards, as the library does', () => {
    // Its own markup handler ends with `selection.clear()`, which is why
    // marking on one page leaves nothing selected today.
    mark()

    expect(library.cleared).toBe(1)
  })

  it('marks anyway when the document withholds its text', () => {
    // The passage is still worth marking; the mark simply quotes nothing.
    library.textFails = true

    mark()

    expect(library.created).toHaveLength(2)
    expect(library.created[0]?.text).toBeUndefined()
  })

  it('does nothing with nothing selected', () => {
    // Reachable from the menu: a selection can go between the render that drew
    // the control and the press that used it.
    library.formatted = []

    mark()

    expect(library.created).toHaveLength(0)
    expect(library.cleared).toBe(0)
  })

  it('does nothing without somewhere to put the marks', () => {
    // The annotation scope arrives after the plugins register, and the reader
    // renders before that.
    mark({ tools: null })

    expect(library.cleared).toBe(0)
  })
})
