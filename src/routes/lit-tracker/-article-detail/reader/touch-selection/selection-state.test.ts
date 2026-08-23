import type { SelectionRangeX } from '@embedpdf/plugin-selection'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  beginDrag,
  endDrag,
  markTouchApply,
  moveDrag,
  noteSelection,
  readTouchSelection,
  resetTouchSelection,
  subscribeTouchSelection,
} from './selection-state'

/**
 * The document's answer to three questions: what is selected, whether a finger
 * selected it, and which handle is being dragged.
 *
 * The middle one is the reason this exists at all — the library reports every
 * selection identically, so "a finger made this" is a fact only this reader can
 * know, and before this task it was known per page, where the page that
 * inherited a boundary did not know it.
 */

const RANGE: SelectionRangeX = {
  start: { page: 0, index: 0 },
  end: { page: 0, index: 8 },
}

const ACROSS_PAGES: SelectionRangeX = {
  start: { page: 0, index: 40 },
  end: { page: 1, index: 6 },
}

beforeEach(() => {
  resetTouchSelection()
})

describe('what is selected', () => {
  it('remembers the range the library reported', () => {
    noteSelection(RANGE)

    expect(readTouchSelection().range).toEqual(RANGE)
  })

  it('counts a selection as touch-made only when this reader said so first', () => {
    markTouchApply()
    noteSelection(RANGE)
    expect(readTouchSelection().madeByTouch).toBe(true)

    // A mouse drag: the same event, from the same plugin, unannounced.
    noteSelection(RANGE)
    expect(readTouchSelection().madeByTouch).toBe(false)
  })

  it('spends the mark on one change, not on every change after it', () => {
    markTouchApply()
    noteSelection(RANGE)
    noteSelection(ACROSS_PAGES)

    expect(readTouchSelection().madeByTouch).toBe(false)
  })

  it('is not touch-made when nothing is selected', () => {
    // Escape, or a click on the paper. There is nothing for a handle to bound,
    // and the flag must not survive to describe the next selection.
    markTouchApply()
    noteSelection(null)

    expect(readTouchSelection()).toMatchObject({
      range: null,
      madeByTouch: false,
    })
  })

  it('keeps a range that spans pages exactly as it was given', () => {
    // The state this task exists to hold: both pages read the same range, and
    // each draws the end that falls on it.
    markTouchApply()
    noteSelection(ACROSS_PAGES)

    expect(readTouchSelection().range).toEqual(ACROSS_PAGES)
    expect(readTouchSelection().madeByTouch).toBe(true)
  })
})

describe('the drag in flight', () => {
  it('holds which end was grabbed, and by which pointer', () => {
    beginDrag({ end: 'end', finger: { x: 10, y: 20 }, pointerId: 7 })

    expect(readTouchSelection().drag).toEqual({
      end: 'end',
      finger: { x: 10, y: 20 },
      pointerId: 7,
    })
  })

  it('follows the finger, and the end it may have swapped to', () => {
    beginDrag({ end: 'end', finger: { x: 10, y: 20 }, pointerId: 7 })
    moveDrag({ x: 40, y: 60 }, 'start')

    expect(readTouchSelection().drag).toEqual({
      end: 'start',
      finger: { x: 40, y: 60 },
      pointerId: 7,
    })
  })

  it('ignores movement when no handle is held', () => {
    // Every pointer move in the window reaches the drag's listener; almost none
    // of them belong to a drag.
    moveDrag({ x: 40, y: 60 }, 'start')

    expect(readTouchSelection().drag).toBeNull()
  })

  it('ends, and keeps the selection the drag made', () => {
    markTouchApply()
    noteSelection(ACROSS_PAGES)
    beginDrag({ end: 'end', finger: { x: 10, y: 20 }, pointerId: 7 })

    endDrag()

    expect(readTouchSelection()).toMatchObject({
      drag: null,
      range: ACROSS_PAGES,
      madeByTouch: true,
    })
  })
})

describe('watching it', () => {
  it('tells every watcher, with the state as it now stands', () => {
    const watcher = vi.fn()
    subscribeTouchSelection(watcher)

    beginDrag({ end: 'start', finger: { x: 1, y: 2 }, pointerId: 3 })

    expect(watcher).toHaveBeenCalledWith(
      expect.objectContaining({
        drag: { end: 'start', finger: { x: 1, y: 2 }, pointerId: 3 },
      }),
    )
  })

  it('stops telling one that has unsubscribed', () => {
    const watcher = vi.fn()
    subscribeTouchSelection(watcher)()

    noteSelection(RANGE)

    expect(watcher).not.toHaveBeenCalled()
  })

  it('forgets everything when the reader closes the paper', () => {
    // The state outlives any one component's module, so a second paper must not
    // inherit the first one's selection.
    markTouchApply()
    noteSelection(RANGE)
    beginDrag({ end: 'end', finger: { x: 1, y: 2 }, pointerId: 3 })

    resetTouchSelection()

    expect(readTouchSelection()).toEqual({
      range: null,
      madeByTouch: false,
      drag: null,
    })
  })

  it('drops a mark that was never spent', () => {
    // A selection applied as the reader closed the paper: the flag must not
    // survive to describe the next document's first selection.
    markTouchApply()
    resetTouchSelection()

    noteSelection(RANGE)

    expect(readTouchSelection().madeByTouch).toBe(false)
  })
})
