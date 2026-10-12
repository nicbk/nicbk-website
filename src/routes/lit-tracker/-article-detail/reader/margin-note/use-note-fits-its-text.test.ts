import { PdfAnnotationSubtype } from '@embedpdf/models'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { READER_PAGE_ATTRIBUTE } from '../note-editing/note-being-edited'
import { useNoteFitsItsText } from './use-note-fits-its-text'

/**
 * The pairing of a measurement with a save, and what follows from it. jsdom lays
 * nothing out, so the editor's measured size is stood in for; the conversion is
 * `note-height.test.ts`'s and the measurement itself is checked in the browser.
 */

const NOTE = {
  id: 'n',
  type: PdfAnnotationSubtype.FREETEXT,
  pageIndex: 0,
  rect: { origin: { x: 32, y: 300 }, size: { width: 72, height: 40 } },
  inReplyToId: 'h',
  flags: ['print', 'locked'],
  fontSize: 8,
}
const BELOW = {
  ...NOTE,
  id: 'below',
  rect: { ...NOTE.rect, origin: { x: 32, y: 344 } },
}

let listener: ((event: unknown) => void) | null
let editor: HTMLElement
const scope = {
  onAnnotationEvent: vi.fn((fn: (event: unknown) => void) => {
    listener = fn
    return () => {
      listener = null
    }
  }),
  getState: () => ({
    pages: { 0: ['n', 'below'] },
    byUid: {
      n: { commitState: 'synced', object: NOTE },
      below: { commitState: 'synced', object: BELOW },
    },
  }),
  updateAnnotations: vi.fn(),
}
const document = { pages: [{ index: 0, size: { width: 612, height: 792 } }] }

/** The editor, laid out at 1:1 with `textHeight` of text in it. */
function stubLayout(textHeight: number) {
  // jsdom implements no layout, ranges included, so the methods are supplied
  // rather than spied on.
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ height: textHeight }) as DOMRect,
  })
  Object.defineProperty(editor, 'getBoundingClientRect', {
    value: () => ({ width: 72 }) as DOMRect,
  })
}

function blur() {
  editor.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

function save(contents: string) {
  listener?.({
    type: 'update',
    committed: false,
    pageIndex: 0,
    annotation: NOTE,
    patch: { contents },
  })
}

beforeEach(() => {
  window.document.body.innerHTML = `<div ${READER_PAGE_ATTRIBUTE}="0"><span contenteditable="true">x</span></div>`
  editor = window.document.querySelector('span') as HTMLElement
  // jsdom does not implement isContentEditable.
  Object.defineProperty(editor, 'isContentEditable', { value: true })
  scope.updateAnnotations.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect')
  window.document.body.innerHTML = ''
})

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('useNoteFitsItsText', () => {
  it('grows a note to its text and pushes the note below it down', async () => {
    renderHook(() => useNoteFitsItsText(scope as never, document as never))
    stubLayout(80)
    blur()
    save('a long note')
    await settle()

    expect(scope.updateAnnotations).toHaveBeenCalledWith([
      {
        pageIndex: 0,
        id: 'n',
        patch: {
          rect: { origin: { x: 32, y: 300 }, size: { width: 72, height: 80 } },
        },
      },
      {
        pageIndex: 0,
        id: 'below',
        patch: {
          rect: { origin: { x: 32, y: 384 }, size: { width: 72, height: 40 } },
        },
      },
    ])
  })

  // The defect found in the browser: the browser drains microtasks between one
  // listener and the next, so the measurement must outlive them.
  it('keeps the measurement past the microtasks between two listeners', async () => {
    renderHook(() => useNoteFitsItsText(scope as never, document as never))
    stubLayout(80)
    blur()
    await settle()
    save('a long note')
    await settle()
    expect(scope.updateAnnotations).toHaveBeenCalled()
  })

  it('forgets the measurement once the task is over', async () => {
    vi.useFakeTimers()
    renderHook(() => useNoteFitsItsText(scope as never, document as never))
    stubLayout(80)
    blur()
    vi.runAllTimers()
    save('a long note')
    vi.useRealTimers()
    await settle()
    expect(scope.updateAnnotations).not.toHaveBeenCalled()
  })

  it('changes nothing when the note already fits', async () => {
    renderHook(() => useNoteFitsItsText(scope as never, document as never))
    stubLayout(39.5)
    blur()
    save('four lines')
    await settle()
    expect(scope.updateAnnotations).not.toHaveBeenCalled()
  })

  it('leaves an empty save to the removal', async () => {
    renderHook(() => useNoteFitsItsText(scope as never, document as never))
    stubLayout(80)
    blur()
    save('   ')
    await settle()
    expect(scope.updateAnnotations).not.toHaveBeenCalled()
  })

  it('ignores a blur outside the reader’s pages', async () => {
    renderHook(() => useNoteFitsItsText(scope as never, document as never))
    const elsewhere = window.document.createElement('div')
    Object.defineProperty(elsewhere, 'isContentEditable', { value: true })
    window.document.body.append(elsewhere)
    elsewhere.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    save('a long note')
    await settle()
    expect(scope.updateAnnotations).not.toHaveBeenCalled()
  })

  it('waits for the plugin and the document', () => {
    expect(() => renderHook(() => useNoteFitsItsText(null, null))).not.toThrow()
  })
})
