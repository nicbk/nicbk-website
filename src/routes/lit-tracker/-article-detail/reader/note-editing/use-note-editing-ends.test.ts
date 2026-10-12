import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOLD_MOVEMENT_TOLERANCE_PX } from '../touch-selection/hold'
import { READER_PAGE_ATTRIBUTE } from './note-being-edited'
import { useNoteEditingEnds } from './use-note-editing-ends'

/**
 * The lifecycle half: which presses end an edit, that the end waits for the
 * press to finish, and that the editor is blurred before it goes — the engine
 * saves the text on blur and at no other time.
 *
 * The engine's editor is stood in for by the one thing this reads of it, a
 * `contenteditable="true"` element inside a reader page. The remount itself is
 * React's, and is checked in the browser (see the task's status).
 */

let editor: HTMLDivElement
let elsewhere: HTMLDivElement

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = `
    <div ${READER_PAGE_ATTRIBUTE}="0"><div id="paper"></div></div>
    <div ${READER_PAGE_ATTRIBUTE}="1"><div id="editor" contenteditable="true" tabindex="0"></div></div>
  `
  editor = document.getElementById('editor') as HTMLDivElement
  elsewhere = document.getElementById('paper') as HTMLDivElement
  editor.focus()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function press(
  target: Element,
  kind = 'mouse',
  { travel = 0, cancel = false } = {},
): void {
  const at = { clientX: 50, clientY: 50, pointerId: 7, pointerType: kind }
  act(() => {
    target.dispatchEvent(
      new PointerEvent('pointerdown', { ...at, bubbles: true }),
    )
    target.dispatchEvent(
      new PointerEvent(cancel ? 'pointercancel' : 'pointerup', {
        ...at,
        clientY: at.clientY + travel,
        bubbles: true,
      }),
    )
  })
}

/** Lets the deferred end run — it waits for the press's click. */
function afterTheClick(): void {
  act(() => {
    vi.runAllTimers()
  })
}

describe('useNoteEditingEnds', () => {
  it('ends the edit on the note’s page when the reader presses elsewhere', () => {
    const { result } = renderHook(() => useNoteEditingEnds())
    press(elsewhere)
    afterTheClick()
    expect(result.current.generationOf(1)).toBe(1)
    expect(result.current.generationOf(0)).toBe(0)
  })

  it('blurs the editor first, so the engine saves what was typed', () => {
    const blurred = vi.fn()
    editor.addEventListener('blur', blurred)
    renderHook(() => useNoteEditingEnds())
    press(elsewhere)
    afterTheClick()
    expect(blurred).toHaveBeenCalledOnce()
  })

  // The press may be on the note's own delete control, which a remount would
  // replace before its click arrived.
  it('waits for the press to be over before ending anything', () => {
    const { result } = renderHook(() => useNoteEditingEnds())
    press(elsewhere)
    expect(result.current.generationOf(1)).toBe(0)
    afterTheClick()
    expect(result.current.generationOf(1)).toBe(1)
  })

  it('leaves the edit alone for a press inside the note', () => {
    const { result } = renderHook(() => useNoteEditingEnds())
    press(editor)
    afterTheClick()
    expect(result.current.generationOf(1)).toBe(0)
  })

  it('leaves the edit alone for a press the browser took as a scroll', () => {
    const { result } = renderHook(() => useNoteEditingEnds())
    press(elsewhere, 'touch', { cancel: true })
    afterTheClick()
    expect(result.current.generationOf(1)).toBe(0)
  })

  it('leaves the edit alone for a finger that travelled', () => {
    const { result } = renderHook(() => useNoteEditingEnds())
    press(elsewhere, 'touch', { travel: HOLD_MOVEMENT_TOLERANCE_PX + 1 })
    afterTheClick()
    expect(result.current.generationOf(1)).toBe(0)
  })

  it('does nothing when no note is being written', () => {
    editor.setAttribute('contenteditable', 'false')
    const { result } = renderHook(() => useNoteEditingEnds())
    press(elsewhere)
    afterTheClick()
    expect(result.current.generationOf(1)).toBe(0)
  })

  // The press deleted the note, or the engine ended the edit itself.
  it('does nothing when the edit is already over by the time it would end', () => {
    const { result } = renderHook(() => useNoteEditingEnds())
    press(elsewhere)
    editor.remove()
    afterTheClick()
    expect(result.current.generationOf(1)).toBe(0)
  })

  it('ends the edit at once when asked — Escape', () => {
    const { result } = renderHook(() => useNoteEditingEnds())
    act(() => result.current.endNoteEditing())
    expect(result.current.generationOf(1)).toBe(1)
    expect(document.activeElement).not.toBe(editor)
  })

  it('stops listening when the reader goes', () => {
    const { result, unmount } = renderHook(() => useNoteEditingEnds())
    const before = result.current
    unmount()
    press(elsewhere)
    afterTheClick()
    expect(before.generationOf(1)).toBe(0)
  })
})
