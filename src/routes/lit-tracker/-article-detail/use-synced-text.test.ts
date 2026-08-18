import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYNCED_TEXT_DEBOUNCE_MS, useSyncedText } from './use-synced-text'

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
      useSyncedText({ synced: value, onSave }),
    { initialProps: { synced } },
  )
  return { ...view, onSave }
}

describe('useSyncedText', () => {
  it('starts from the stored value', () => {
    const { result } = renderNotes('what I think of this paper')

    expect(result.current.text).toBe('what I think of this paper')
  })

  it('treats a null column as an empty field', () => {
    // `null` and `''` both mean "no notes"; the field cannot show either.
    const { result } = renderNotes(null)

    expect(result.current.text).toBe('')
  })

  it('shows what is typed immediately, before anything is written', () => {
    const { result, onSave } = renderNotes('')

    act(() => result.current.onTextChange('half a th'))

    expect(result.current.text).toBe('half a th')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('writes once the reader pauses, not once per keystroke', () => {
    const { result, onSave } = renderNotes('')

    act(() => result.current.onTextChange('a'))
    act(() => result.current.onTextChange('ab'))
    act(() => result.current.onTextChange('abc'))
    expect(onSave).not.toHaveBeenCalled()

    act(() => void vi.advanceTimersByTime(SYNCED_TEXT_DEBOUNCE_MS))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('abc')
  })

  it('adopts a synced value while the field is idle', () => {
    // What makes the field live: notes written in another window show up here.
    const { result, rerender } = renderNotes('first')

    rerender({ synced: 'written elsewhere' })

    expect(result.current.text).toBe('written elsewhere')
  })

  it('does not clobber what the reader is typing', () => {
    // The defect this hook exists to prevent. A synced value arriving mid-edit —
    // the reader's own debounced write coming back, or a second window — must
    // not replace the draft under the cursor.
    const { result, rerender } = renderNotes('first')

    act(() => result.current.onTextChange('what I am in the middle of'))
    rerender({ synced: 'written elsewhere' })

    expect(result.current.text).toBe('what I am in the middle of')
  })

  it('adopts synced values again once the write has gone out', () => {
    // The other half of the rule: "editing" is a state the field leaves, not a
    // latch. A field that never adopted another value again would be stale for
    // the rest of the session.
    const { result, rerender, onSave } = renderNotes('first')

    act(() => result.current.onTextChange('mine'))
    act(() => void vi.advanceTimersByTime(SYNCED_TEXT_DEBOUNCE_MS))
    expect(onSave).toHaveBeenCalledWith('mine')

    rerender({ synced: 'theirs' })

    expect(result.current.text).toBe('theirs')
  })

  it('writes the pending value on unmount', () => {
    // Switching to another tab in the sidebar, or navigating away, within the
    // debounce window must not silently drop the tail of what was typed.
    const { result, unmount, onSave } = renderNotes('')

    act(() => result.current.onTextChange('typed and gone'))
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

    act(() => result.current.onTextChange(''))
    act(() => void vi.advanceTimersByTime(SYNCED_TEXT_DEBOUNCE_MS))

    expect(onSave).toHaveBeenCalledWith('')
  })
})
