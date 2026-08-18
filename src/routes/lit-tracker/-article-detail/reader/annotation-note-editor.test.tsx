import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYNCED_TEXT_DEBOUNCE_MS } from '../use-synced-text'
import { AnnotationNoteEditor } from './annotation-note-editor'

/**
 * The note on a mark, and the two properties that keep it from being a defect.
 *
 * The mechanics belong to `useSyncedText`, which has its own tests over the
 * whole debounce-and-don't-clobber rule. What is asserted here is that this
 * surface is wired to them — because the failure it prevents is this task's
 * likeliest one, and it is invisible on screen: a field bound straight to the
 * mutator writes a row per keystroke, through an optimistic client, a websocket
 * and Postgres, and looks perfectly fine while doing it.
 */

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

function typeInto(text: string) {
  return userEvent.type(screen.getByRole('textbox', { name: 'note' }), text)
}

describe('AnnotationNoteEditor', () => {
  it('is a named field carrying what the mark already says', () => {
    render(<AnnotationNoteEditor contents="already here" onSave={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue(
      'already here',
    )
  })

  it('takes the cursor, the reader having just asked for it', () => {
    render(<AnnotationNoteEditor contents={null} onSave={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'note' })).toHaveFocus()
  })

  it('writes once when the reader pauses, not once per keystroke', async () => {
    const onSave = vi.fn()
    render(<AnnotationNoteEditor contents={null} onSave={onSave} />)

    await typeInto('note')

    expect(onSave).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(SYNCED_TEXT_DEBOUNCE_MS))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('note')
  })

  it('does not overwrite what is being typed when sync delivers', async () => {
    // Another window edits the same mark, or this client's own write comes
    // back. Either way the reader's half-written sentence must survive.
    const { rerender } = render(
      <AnnotationNoteEditor contents={null} onSave={vi.fn()} />,
    )

    await typeInto('half a th')
    rerender(
      <AnnotationNoteEditor contents="from elsewhere" onSave={vi.fn()} />,
    )

    expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue(
      'half a th',
    )
  })

  it('adopts a synced value while nothing is being typed', () => {
    // The other half of the same rule: an idle field is live, which is what
    // makes a note written in another window appear here.
    const { rerender } = render(
      <AnnotationNoteEditor contents={null} onSave={vi.fn()} />,
    )

    rerender(
      <AnnotationNoteEditor contents="from elsewhere" onSave={vi.fn()} />,
    )

    expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue(
      'from elsewhere',
    )
  })

  it('removes the note by emptying it, there being no separate control', async () => {
    const onSave = vi.fn()
    render(<AnnotationNoteEditor contents="written earlier" onSave={onSave} />)

    await userEvent.clear(screen.getByRole('textbox', { name: 'note' }))
    act(() => void vi.advanceTimersByTime(SYNCED_TEXT_DEBOUNCE_MS))

    expect(onSave).toHaveBeenCalledWith('')
  })

  it('keeps what was typed when the editor closes straight after', async () => {
    // Closing the popover — or putting the mark down — within the debounce
    // window would otherwise drop the tail of the note silently.
    const onSave = vi.fn()
    const { unmount } = render(
      <AnnotationNoteEditor contents={null} onSave={onSave} />,
    )

    await typeInto('typed and gone')
    unmount()

    expect(onSave).toHaveBeenCalledWith('typed and gone')
  })
})
