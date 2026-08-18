import type { SelectionCapability } from '@embedpdf/plugin-selection'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSelectionCopy } from './use-selection-copy'

/**
 * The copy path, whose whole reason for existing is that the plugin's
 * `copyToClipboard` does not reach the clipboard on its own.
 *
 * So the assertions come in pairs: the request goes to the plugin (which is
 * where the document's permission is enforced), and the text the plugin resolves
 * gets written — with both outcomes of that write reported, because a refused
 * clipboard is ordinary and a control that lies about it is the failure this
 * task was told to design against.
 */

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

type CopyListener = (event: { documentId: string; text: string }) => void
type SelectionListener = (event: {
  documentId: string
  selection: unknown
}) => void

function fakeSelection() {
  const copyListeners: CopyListener[] = []
  const selectionListeners: SelectionListener[] = []

  const capability = {
    copyToClipboard: vi.fn(),
    onCopyToClipboard: vi.fn((listener: CopyListener) => {
      copyListeners.push(listener)
      return () => {}
    }),
    onSelectionChange: vi.fn((listener: SelectionListener) => {
      selectionListeners.push(listener)
      return () => {}
    }),
  }

  return {
    capability: capability as unknown as SelectionCapability,
    calls: capability,
    /** What the plugin does once it has resolved the selection's text. */
    resolveText(text: string, documentId = ARTICLE_ID) {
      act(() => {
        for (const listener of copyListeners) {
          listener({ documentId, text })
        }
      })
    },
    changeSelection(selection: unknown, documentId = ARTICLE_ID) {
      act(() => {
        for (const listener of selectionListeners) {
          listener({ documentId, selection })
        }
      })
    },
  }
}

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  writeText = vi.fn(() => Promise.resolve())
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  })
})

describe('useSelectionCopy', () => {
  it('asks the plugin, which is where the document’s permission is enforced', () => {
    // Deliberately not `getSelectedText` + write: going around the plugin would
    // copy from a paper that forbids extraction.
    const selection = fakeSelection()
    const { result } = renderHook(() =>
      useSelectionCopy(ARTICLE_ID, selection.capability),
    )

    act(() => result.current.copy())

    expect(selection.calls.copyToClipboard).toHaveBeenCalledWith(ARTICLE_ID)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('writes the text the plugin resolves, and says so', async () => {
    const selection = fakeSelection()
    const { result } = renderHook(() =>
      useSelectionCopy(ARTICLE_ID, selection.capability),
    )

    selection.resolveText('attention is all you need')

    expect(writeText).toHaveBeenCalledWith('attention is all you need')
    await waitFor(() => expect(result.current.state).toBe('copied'))
  })

  it('reports a refused clipboard rather than appearing to succeed', async () => {
    // Permission policy, an unfocused document, or plain HTTP. All ordinary,
    // and the library's own utility would have made each an unhandled rejection.
    writeText.mockReturnValue(Promise.reject(new Error('denied')))
    const selection = fakeSelection()
    const { result } = renderHook(() =>
      useSelectionCopy(ARTICLE_ID, selection.capability),
    )

    selection.resolveText('attention is all you need')

    await waitFor(() => expect(result.current.state).toBe('failed'))
  })

  it('ignores a copy resolved for another document', async () => {
    // The reader keys every scope by the article id, and the event is emitted
    // globally. A second reader's copy must not become this one's.
    const selection = fakeSelection()
    const { result } = renderHook(() =>
      useSelectionCopy(ARTICLE_ID, selection.capability),
    )

    selection.resolveText('someone else’s paper', 'another-article')

    expect(writeText).not.toHaveBeenCalled()
    expect(result.current.state).toBe('idle')
  })

  it('drops the confirmation as soon as a new passage is selected', async () => {
    // "copied" is a claim about a specific passage. Left standing over the next
    // one, it says text has been copied that has not.
    const selection = fakeSelection()
    const { result } = renderHook(() =>
      useSelectionCopy(ARTICLE_ID, selection.capability),
    )

    selection.resolveText('the first passage')
    await waitFor(() => expect(result.current.state).toBe('copied'))

    selection.changeSelection({ start: {}, end: {} })

    expect(result.current.state).toBe('idle')
  })

  it('reports whether there is anything to copy', () => {
    const selection = fakeSelection()
    const { result } = renderHook(() =>
      useSelectionCopy(ARTICLE_ID, selection.capability),
    )

    expect(result.current.hasSelection).toBe(false)

    selection.changeSelection({ start: {}, end: {} })
    expect(result.current.hasSelection).toBe(true)

    selection.changeSelection(null)
    expect(result.current.hasSelection).toBe(false)
  })

  it('does nothing at all before the plugin has registered', () => {
    // The scopes arrive a tick after mount, and a control pressed in that
    // window must not throw.
    const { result } = renderHook(() => useSelectionCopy(ARTICLE_ID, null))

    expect(() => act(() => result.current.copy())).not.toThrow()
    expect(result.current.state).toBe('idle')
  })
})
