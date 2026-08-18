import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReaderCopyShortcut } from './use-reader-copy-shortcut'

/**
 * ⌘C over the paper, and the three cases where it must keep its hands off.
 *
 * Taking the key is only defensible because the browser has nothing to copy —
 * the reader's selection is drawn, not selected. The moment that stops being
 * true, intercepting turns a working copy into a broken one, so each of these
 * three is a case where the default must be left alone.
 */

function press(
  key: string,
  { meta = false, ctrl = false, target = document.body } = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    metaKey: meta,
    ctrlKey: ctrl,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
  window.getSelection()?.removeAllRanges()
})

describe('useReaderCopyShortcut', () => {
  it('copies on ⌘C while a passage is selected', () => {
    const copy = vi.fn()
    renderHook(() => useReaderCopyShortcut({ hasSelection: true, copy }))

    const event = press('c', { meta: true })

    expect(copy).toHaveBeenCalledTimes(1)
    // The default would be a copy of nothing, which on some platforms empties
    // the clipboard rather than leaving it alone.
    expect(event.defaultPrevented).toBe(true)
  })

  it('copies on Ctrl+C too', () => {
    const copy = vi.fn()
    renderHook(() => useReaderCopyShortcut({ hasSelection: true, copy }))

    press('c', { ctrl: true })

    expect(copy).toHaveBeenCalledTimes(1)
  })

  it('ignores the key with nothing selected', () => {
    const copy = vi.fn()
    renderHook(() => useReaderCopyShortcut({ hasSelection: false, copy }))

    const event = press('c', { meta: true })

    expect(copy).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores a bare c, which is somebody typing', () => {
    const copy = vi.fn()
    renderHook(() => useReaderCopyShortcut({ hasSelection: true, copy }))

    press('c')

    expect(copy).not.toHaveBeenCalled()
  })

  it('leaves the key alone inside a text field', () => {
    // The page-number field, the note editor on a mark, the sidebar's notes.
    // A selection on the paper easily outlives focus moving into one of them,
    // and copying the paper's words from a textarea is indistinguishable from
    // the clipboard being broken.
    const copy = vi.fn()
    renderHook(() => useReaderCopyShortcut({ hasSelection: true, copy }))

    const field = document.createElement('textarea')
    field.value = 'a note in progress'
    document.body.append(field)

    const event = press('c', { meta: true, target: field })

    expect(copy).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('leaves the key alone inside a contenteditable', () => {
    const copy = vi.fn()
    renderHook(() => useReaderCopyShortcut({ hasSelection: true, copy }))

    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    // jsdom does not derive `isContentEditable` from the attribute.
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    document.body.append(editable)

    press('c', { meta: true, target: editable })

    expect(copy).not.toHaveBeenCalled()
  })

  it('leaves the key alone when the browser has its own selection', () => {
    // Text outside the canvas — a sidebar row, the article's title — selects
    // normally, and that selection belongs to the browser to copy.
    const copy = vi.fn()
    renderHook(() => useReaderCopyShortcut({ hasSelection: true, copy }))

    const paragraph = document.createElement('p')
    paragraph.textContent = 'a title the reader dragged across'
    document.body.append(paragraph)
    const range = document.createRange()
    range.selectNodeContents(paragraph)
    window.getSelection()?.addRange(range)

    const event = press('c', { meta: true })

    expect(copy).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('stops listening once the reader is gone', () => {
    const copy = vi.fn()
    const { unmount } = renderHook(() =>
      useReaderCopyShortcut({ hasSelection: true, copy }),
    )

    unmount()
    press('c', { meta: true })

    expect(copy).not.toHaveBeenCalled()
  })
})
