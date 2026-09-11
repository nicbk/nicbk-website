import type { AnnotationTool } from '@embedpdf/plugin-annotation'
import type { SelectionRangeX } from '@embedpdf/plugin-selection'
import { render } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { MarkingTools } from './use-finish-selection'
import { useFinishSelection } from './use-finish-selection'

/**
 * The wiring: what happens when a finger or a mouse comes up on a selection the
 * library never finished.
 *
 * The plugin is stood in for — its state is a reducer over a WebAssembly engine
 * — but everything this task decides is real: when to act, what to build, and
 * which of the two endings to take.
 */

const DOCUMENT_ID = '018f5b6c-0000-7000-8000-000000000001'

const ACROSS_PAGES: SelectionRangeX = {
  start: { page: 0, index: 40 },
  end: { page: 1, index: 6 },
}

const FORMATTED = [
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

const HIGHLIGHT = {
  id: 'highlight',
  name: 'Highlight',
  matchScore: () => 0,
  defaults: { type: 9, color: '#FFCD45' },
  interaction: { exclusive: false, textSelection: true },
} as unknown as AnnotationTool

const RECTANGLE = {
  ...HIGHLIGHT,
  id: 'square',
  interaction: { exclusive: false, textSelection: false },
} as unknown as AnnotationTool

const library = {
  selecting: false,
  selection: null as SelectionRangeX | null,
  applied: [] as (SelectionRangeX | null)[],
  cleared: 0,
  created: [] as { pageIndex: number; id: string }[],
  activeTool: null as AnnotationTool | null,
  /** Whether the engine will give up the selected text. */
  textFails: false,
  throwsOnState: false,
}

/** A settled `PdfTask`, as `@embedpdf/models` builds them. */
function task<T>(value: T, fails = false) {
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
  getState: () => {
    if (library.throwsOnState) {
      throw new Error('Selection state not found')
    }
    return { selecting: library.selecting, selection: library.selection }
  },
  setSelection: (range: SelectionRangeX | null) => {
    library.applied.push(range)
    // What the real `applySelection` does, and the reason this reader calls it:
    // it dispatches END_SELECTION, so the stuck flag clears.
    library.selecting = false
  },
  getFormattedSelection: () => FORMATTED,
  getSelectedText: () =>
    task(['attention is all', 'you need'], library.textFails),
  clear: () => {
    library.cleared += 1
    library.selecting = false
    library.selection = null
  },
} as never

const annotations: MarkingTools = {
  getActiveTool: () => library.activeTool,
  createAnnotation: (pageIndex, annotation) => {
    library.created.push({
      pageIndex,
      id: (annotation as { id: string }).id,
    })
  },
}

function Reader() {
  useFinishSelection({ documentId: DOCUMENT_ID, selection, annotations })
  return null
}

/** A selection the library began and never ended. */
function leftUnfinished() {
  library.selecting = true
  library.selection = ACROSS_PAGES
}

function liftThePointer(type = 'pointerup') {
  act(() => {
    window.dispatchEvent(new PointerEvent(type, { bubbles: true }))
  })
}

beforeEach(() => {
  library.selecting = false
  library.selection = null
  library.applied = []
  library.cleared = 0
  library.created = []
  library.activeTool = null
  library.textFails = false
  library.throwsOnState = false
})

describe('a selection the library left open', () => {
  it('is finished by putting the same range back', () => {
    // Not a no-op: the re-apply dispatches END_SELECTION, which is what clears
    // the flag that suppresses the floating control.
    render(<Reader />)
    leftUnfinished()

    liftThePointer()

    expect(library.applied).toEqual([ACROSS_PAGES])
    expect(library.selecting).toBe(false)
  })

  it('is finished once, not on every pointer that follows', () => {
    render(<Reader />)
    leftUnfinished()

    liftThePointer()
    liftThePointer()
    liftThePointer()

    expect(library.applied).toHaveLength(1)
  })

  it('is finished when the browser takes the gesture away', () => {
    render(<Reader />)
    leftUnfinished()

    liftThePointer('pointercancel')

    expect(library.applied).toEqual([ACROSS_PAGES])
  })
})

describe('a selection the library finished itself', () => {
  it('is left entirely alone', () => {
    // The common case — a drag that began and ended on one page — and the one
    // that must not acquire a second code path.
    render(<Reader />)
    library.selecting = false
    library.selection = ACROSS_PAGES

    liftThePointer()

    expect(library.applied).toHaveLength(0)
    expect(library.created).toHaveLength(0)
  })

  it('is left alone mid-drag, with nothing selected yet', () => {
    render(<Reader />)
    library.selecting = true
    library.selection = null

    liftThePointer()

    expect(library.applied).toHaveLength(0)
  })
})

describe('with a text tool live', () => {
  it('marks every page the passage covers', () => {
    render(<Reader />)
    library.activeTool = HIGHLIGHT
    leftUnfinished()

    liftThePointer()

    expect(library.created.map((mark) => mark.pageIndex)).toEqual([0, 1])
  })

  it('clears the selection afterwards, as the library does', () => {
    // Marking with a tool on one page leaves nothing selected today; the two
    // paths must be indistinguishable to the reader.
    render(<Reader />)
    library.activeTool = HIGHLIGHT
    leftUnfinished()

    liftThePointer()

    expect(library.cleared).toBe(1)
  })

  it('does not also put the range back', () => {
    // The clear resets the flag by itself. Re-applying a selection that is
    // being thrown away would put the copy control up over a passage that is
    // about to stop being selected.
    render(<Reader />)
    library.activeTool = HIGHLIGHT
    leftUnfinished()

    liftThePointer()

    expect(library.applied).toHaveLength(0)
  })

  it('marks anyway when the document withholds its text', () => {
    // The passage is still worth marking; the mark simply quotes nothing.
    render(<Reader />)
    library.activeTool = HIGHLIGHT
    library.textFails = true
    leftUnfinished()

    liftThePointer()

    expect(library.created).toHaveLength(2)
    expect(library.cleared).toBe(1)
  })

  it('gives every mark an id of its own', () => {
    render(<Reader />)
    library.activeTool = HIGHLIGHT
    leftUnfinished()

    liftThePointer()

    const [first, second] = library.created
    expect(first?.id).toBeTruthy()
    expect(first?.id).not.toBe(second?.id)
  })
})

describe('with a drawing tool live', () => {
  it('marks nothing, and finishes the selection anyway', () => {
    // A rectangle has no business marking a passage — but the selection is
    // still unfinished, and the reader still wants their copy control.
    render(<Reader />)
    library.activeTool = RECTANGLE
    leftUnfinished()

    liftThePointer()

    expect(library.created).toHaveLength(0)
    expect(library.applied).toEqual([ACROSS_PAGES])
  })
})

describe('when the paper is closing', () => {
  it('says nothing when the plugin no longer knows the document', () => {
    // `getState` throws for a document it does not know, and a reader can close
    // a paper with a finger still down.
    render(<Reader />)
    library.throwsOnState = true

    expect(() => liftThePointer()).not.toThrow()
    expect(library.applied).toHaveLength(0)
  })

  it('stops listening when the reader unmounts', () => {
    const { unmount } = render(<Reader />)
    unmount()
    leftUnfinished()

    liftThePointer()

    expect(library.applied).toHaveLength(0)
  })
})
