import type { Rect } from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIRMATION_MS } from '../use-selection-copy'
import { MARGIN_INSET } from './placement'
import { useMarginNote } from './use-margin-note'

/**
 * The action end to end, with the engine and plugins stood in for: that it
 * decides before it makes anything, highlights and then answers the highlight,
 * and reports a refusal on the button for as long as *copy* reports *copied*.
 *
 * The geometry itself is `placement.test.ts`'s; here a page is one the note
 * either fits on or does not.
 */

const PAGE = { width: 612, height: 792 }

function rect(x: number, y: number, width: number, height: number): Rect {
  return { origin: { x, y }, size: { width, height } }
}

/** The passage: one line in the left half of a 108pt-margin page. */
const PASSAGE = rect(120, 300, 150, 10)

/** A run of body text spanning 108 → 504pt, the text block. */
const BODY_RUNS = [
  { text: 'Attention mechanisms have become', rect: rect(108, 300, 396, 10) },
]

/** A synchronous stand-in for an engine `Task`. */
function task<T>(value: T, fails = false) {
  return {
    wait: (ok: (v: T) => void, fail: (e: unknown) => void) =>
      fails ? fail(new Error('engine')) : ok(value),
  }
}

function setup({
  runs = BODY_RUNS,
  runsFail = false,
  obstacles = [] as Rect[],
  selection = [{ pageIndex: 0, rect: PASSAGE, segmentRects: [PASSAGE] }],
  pluginOpens = true,
}: {
  runs?: { text: string; rect: Rect }[]
  runsFail?: boolean
  obstacles?: Rect[]
  selection?: { pageIndex: number; rect: Rect; segmentRects: Rect[] }[]
  pluginOpens?: boolean
} = {}) {
  const engine = {
    getPageTextRuns: vi.fn(() => task({ runs }, runsFail)),
  }
  const document = { pages: [{ index: 0, size: PAGE }] }
  const selectionScope = {
    getFormattedSelection: vi.fn(() => selection),
    getSelectedText: vi.fn(() => task(['the passage'])),
    clear: vi.fn(),
  }
  const tools: Record<string, unknown> = {
    highlight: {
      id: 'highlight',
      interaction: { textSelection: true },
      defaults: { type: PdfAnnotationSubtype.HIGHLIGHT, color: '#FFCD45' },
    },
    freeText: {
      id: 'freeText',
      defaults: { fontSize: 8, fontColor: '#E44234' },
    },
  }
  const annotations = { getTool: vi.fn((id: string) => tools[id]) }
  const scope = {
    getState: () => ({
      pages: { 0: obstacles.map((_, i) => `o${i}`) },
      byUid: Object.fromEntries(
        obstacles.map((r, i) => [
          `o${i}`,
          { commitState: 'synced', object: { rect: r } },
        ]),
      ),
    }),
    createAnnotation: vi.fn(),
    selectAnnotation: vi.fn(),
  }
  const pluginCreate = vi.fn()
  // A real five-parameter method, as the installed plugin's is — `vi.fn`
  // reports an arity of 0 and would take the fallback path.
  const plugin = pluginOpens
    ? {
        createAnnotation(
          a: unknown,
          b: unknown,
          c: unknown,
          d: unknown,
          e: unknown,
        ) {
          pluginCreate(a, b, c, d, e)
        },
      }
    : {}

  const hook = renderHook(() =>
    useMarginNote({
      documentId: 'doc',
      engine: engine as never,
      document: document as never,
      selection: selectionScope as never,
      annotations: annotations as never,
      scope: scope as never,
      plugin,
    }),
  )
  return { hook, engine, selectionScope, scope, pluginCreate }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useMarginNote', () => {
  it('highlights the passage, then opens a note answering it', () => {
    const { hook, scope, selectionScope, pluginCreate } = setup()

    act(() => hook.result.current.writeNote())

    // The highlight, through the menu's own marking path.
    expect(scope.createAnnotation).toHaveBeenCalledTimes(1)
    const [page, highlight] = scope.createAnnotation.mock.calls[0] as [
      number,
      { id: string; type: number },
    ]
    expect(page).toBe(0)
    expect(highlight.type).toBe(PdfAnnotationSubtype.HIGHLIGHT)
    expect(selectionScope.clear).toHaveBeenCalled()

    // The note: a locked reply, in the left margin, opened for typing.
    expect(pluginCreate).toHaveBeenCalledTimes(1)
    const [notePage, note, , documentId, options] = pluginCreate.mock
      .calls[0] as [
      number,
      { id: string; inReplyToId: string; flags: string[]; rect: Rect },
      unknown,
      string,
      { editAfterCreate: boolean },
    ]
    expect(notePage).toBe(0)
    expect(documentId).toBe('doc')
    expect(options).toEqual({ editAfterCreate: true })
    expect(note.inReplyToId).toBe(highlight.id)
    expect(note.flags).toContain('locked')
    expect(note.rect.origin.x + note.rect.size.width).toBe(108 - MARGIN_INSET)
    expect(note.rect.origin.y).toBe(PASSAGE.origin.y)

    // Selected, as a text box placed by a click is.
    expect(scope.selectAnnotation).toHaveBeenCalledWith(0, note.id)
    expect(hook.result.current.state).toBe('idle')
  })

  it('still makes the note, closed, when the plugin is not as expected', () => {
    const { hook, scope } = setup({ pluginOpens: false })
    act(() => hook.result.current.writeNote())
    // The highlight and the note, both through the public method.
    expect(scope.createAnnotation).toHaveBeenCalledTimes(2)
  })

  it('refuses, and makes nothing, when the spot is taken', () => {
    const { hook, scope, selectionScope } = setup({
      obstacles: [rect(40, 310, 50, 10)],
    })

    act(() => hook.result.current.writeNote())

    expect(hook.result.current.state).toBe('no-room')
    expect(scope.createAnnotation).not.toHaveBeenCalled()
    // The selection is left for the reader to do something else with.
    expect(selectionScope.clear).not.toHaveBeenCalled()
  })

  it('refuses a margin too narrow to write in', () => {
    const { hook, scope } = setup({
      runs: [{ text: 'a body of text', rect: rect(30, 300, 540, 10) }],
    })
    act(() => hook.result.current.writeNote())
    expect(hook.result.current.state).toBe('too-narrow')
    expect(scope.createAnnotation).not.toHaveBeenCalled()
  })

  it('refuses when the page has no text to measure a margin from', () => {
    const { hook, scope } = setup({ runs: [] })
    act(() => hook.result.current.writeNote())
    expect(hook.result.current.state).toBe('no-room')
    expect(scope.createAnnotation).not.toHaveBeenCalled()
  })

  it('refuses when the engine cannot read the page', () => {
    const { hook, scope } = setup({ runsFail: true })
    act(() => hook.result.current.writeNote())
    expect(hook.result.current.state).toBe('no-room')
    expect(scope.createAnnotation).not.toHaveBeenCalled()
  })

  it('reports a refusal for as long as copy reports copied', () => {
    const { hook } = setup({ obstacles: [rect(40, 310, 50, 10)] })
    act(() => hook.result.current.writeNote())
    act(() => {
      vi.advanceTimersByTime(CONFIRMATION_MS - 1)
    })
    expect(hook.result.current.state).toBe('no-room')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(hook.result.current.state).toBe('idle')
  })

  // A second refusal restarts the clock rather than being cut short by the first.
  it('restarts the report when refused again', () => {
    const { hook } = setup({ obstacles: [rect(40, 310, 50, 10)] })
    act(() => hook.result.current.writeNote())
    act(() => {
      vi.advanceTimersByTime(CONFIRMATION_MS - 100)
    })
    act(() => hook.result.current.writeNote())
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(hook.result.current.state).toBe('no-room')
  })

  it('does nothing when nothing is selected', () => {
    const { hook, engine } = setup({ selection: [] })
    act(() => hook.result.current.writeNote())
    expect(engine.getPageTextRuns).not.toHaveBeenCalled()
  })

  it('does nothing before the plugins exist', () => {
    const { result } = renderHook(() =>
      useMarginNote({
        documentId: 'doc',
        engine: null,
        document: null,
        selection: null,
        annotations: null,
        scope: null,
        plugin: null,
      }),
    )
    act(() => result.current.writeNote())
    expect(result.current.state).toBe('idle')
  })

  it('leaves no timer running when the reader goes', () => {
    const { hook } = setup({ obstacles: [rect(40, 310, 50, 10)] })
    act(() => hook.result.current.writeNote())
    hook.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
