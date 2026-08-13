import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOTES_DEBOUNCE_MS, useArticleNotes } from './use-article-notes'

/**
 * The notes field's text, and when it is written.
 *
 * The clobber tests are the reason this hook exists as a hook rather than as
 * three lines inside the panel: the field is bound to a column that also arrives
 * by sync, and the naive binding loses characters as soon as the reader's own
 * write comes back. Everything else here is the debounce.
 */

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderNotes(synced: string | null, onSave = vi.fn()) {
  const view = renderHook(
    ({ synced: value }: { synced: string | null }) =>
      useArticleNotes({ synced: value, onSave }),
    { initialProps: { synced } },
  )
  return { ...view, onSave }
}

describe('useArticleNotes', () => {
  it('starts from the stored value', () => {
    const { result } = renderNotes('what I think of this paper')

    expect(result.current.notes).toBe('what I think of this paper')
  })

  it('treats a null column as an empty field', () => {
    // `null` and `''` both mean "no notes"; the field cannot show either.
    const { result } = renderNotes(null)

    expect(result.current.notes).toBe('')
  })

  it('shows what is typed immediately, before anything is written', () => {
    const { result, onSave } = renderNotes('')

    act(() => result.current.onNotesChange('half a th'))

    expect(result.current.notes).toBe('half a th')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('writes once the reader pauses, not once per keystroke', () => {
    const { result, onSave } = renderNotes('')

    act(() => result.current.onNotesChange('a'))
    act(() => result.current.onNotesChange('ab'))
    act(() => result.current.onNotesChange('abc'))
    expect(onSave).not.toHaveBeenCalled()

    act(() => void vi.advanceTimersByTime(NOTES_DEBOUNCE_MS))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('abc')
  })

  it('adopts a synced value while the field is idle', () => {
    // What makes the field live: notes written in another window show up here.
    const { result, rerender } = renderNotes('first')

    rerender({ synced: 'written elsewhere' })

    expect(result.current.notes).toBe('written elsewhere')
  })

  it('does not clobber what the reader is typing', () => {
    // The defect this hook exists to prevent. A synced value arriving mid-edit —
    // the reader's own debounced write coming back, or a second window — must
    // not replace the draft under the cursor.
    const { result, rerender } = renderNotes('first')

    act(() => result.current.onNotesChange('what I am in the middle of'))
    rerender({ synced: 'written elsewhere' })

    expect(result.current.notes).toBe('what I am in the middle of')
  })

  it('adopts synced values again once the write has gone out', () => {
    // The other half of the rule: "editing" is a state the field leaves, not a
    // latch. A field that never adopted another value again would be stale for
    // the rest of the session.
    const { result, rerender, onSave } = renderNotes('first')

    act(() => result.current.onNotesChange('mine'))
    act(() => void vi.advanceTimersByTime(NOTES_DEBOUNCE_MS))
    expect(onSave).toHaveBeenCalledWith('mine')

    rerender({ synced: 'theirs' })

    expect(result.current.notes).toBe('theirs')
  })

  it('writes the pending value on unmount', () => {
    // Switching to another tab in the sidebar, or navigating away, within the
    // debounce window must not silently drop the tail of what was typed.
    const { result, unmount, onSave } = renderNotes('')

    act(() => result.current.onNotesChange('typed and gone'))
    unmount()

    expect(onSave).toHaveBeenCalledWith('typed and gone')
  })

  it('writes nothing on unmount when nothing is pending', () => {
    const { unmount, onSave } = renderNotes('untouched')

    unmount()

    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves a cleared field as an empty string', () => {
    // Clearing notes is a thing a reader does, and it has to reach the mutator
    // as `''` rather than being treated as "nothing to save".
    const { result, onSave } = renderNotes('something')

    act(() => result.current.onNotesChange(''))
    act(() => void vi.advanceTimersByTime(NOTES_DEBOUNCE_MS))

    expect(onSave).toHaveBeenCalledWith('')
  })
})
