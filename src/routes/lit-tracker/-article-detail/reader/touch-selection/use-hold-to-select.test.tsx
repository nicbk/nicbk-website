import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOLD_DURATION_MS, HOLD_MOVEMENT_TOLERANCE_PX } from './hold'

/**
 * When a press becomes a hold, and — just as important — when it does not.
 *
 * The real dispatch belongs to a plugin over a WebAssembly engine, so the
 * handlers are captured at registration and driven directly, the same way
 * `click-away-guard.test.tsx` drives its own. What that leaves untested is the
 * library calling them, which is not this project's code; what it tests is the
 * whole of the state machine, which is.
 *
 * The window half of the gesture is exercised for real: this hook deliberately
 * watches the lift and the drift at the window rather than through the plugin,
 * because a page's handler chain can be stopped by anything registered ahead of
 * it — so the events that end a press are dispatched at the window here too.
 */

const registered = vi.hoisted(() => ({
  current: null as Record<string, (...args: unknown[]) => void> | null,
  options: null as unknown,
  unregister: vi.fn(),
  /** Who registered, in the order they did — see the ordering test below. */
  order: [] as string[],
}))

vi.mock('@embedpdf/plugin-interaction-manager/react', () => ({
  usePointerHandlers: (options: unknown) => {
    registered.options = options
    return {
      register: (handlers: Record<string, (...args: unknown[]) => void>) => {
        registered.current = handlers
        registered.order.push('hold')
        return registered.unregister
      },
    }
  },
}))

const { useHoldToSelect } = await import('./use-hold-to-select')

const DOCUMENT_ID = '018f5b6c-0000-7000-8000-000000000001'
const PAGE = 2
const ON_THE_PAGE = { x: 120, y: 340 }
const ON_THE_SCREEN = { x: 500, y: 700 }

/**
 * A pointer event jsdom will accept.
 *
 * jsdom does not implement `PointerEvent`, so the fields this hook reads are
 * put on a plain event instead — which is exactly the shape it reads them from.
 */
function pointerEvent(
  type: string,
  fields: { pointerType?: string; x?: number; y?: number } = {},
): Event {
  return Object.assign(new Event(type), {
    pointerType: fields.pointerType ?? 'touch',
    clientX: fields.x ?? ON_THE_SCREEN.x,
    clientY: fields.y ?? ON_THE_SCREEN.y,
  })
}

/** The manager's normalized event: a plain object, with no `pointerType` on it. */
function managerEvent() {
  return {
    clientX: ON_THE_SCREEN.x,
    clientY: ON_THE_SCREEN.y,
    stopImmediatePropagation: vi.fn(),
    isImmediatePropagationStopped: () => false,
  }
}

/** Presses a finger (or something else) onto the page. */
function pressDown({
  pointerType = 'touch',
  modeId = 'pointerMode',
}: {
  pointerType?: string
  modeId?: string
} = {}) {
  // The window listener that records the pointer's kind runs first, on capture,
  // exactly as it does in a browser.
  window.dispatchEvent(pointerEvent('pointerdown', { pointerType }))
  const event = managerEvent()
  registered.current?.['onPointerDown']?.(ON_THE_PAGE, event, modeId)
  return event
}

function Harness({ onHold }: { onHold: (point: unknown) => void }) {
  useHoldToSelect({ documentId: DOCUMENT_ID, pageIndex: PAGE, onHold })
  return null
}

beforeEach(() => {
  vi.useFakeTimers()
  registered.current = null
  registered.options = null
  registered.order = []
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useHoldToSelect', () => {
  it('registers where a tool can be pre-empted, and nowhere else', () => {
    /*
     * No `modeId`, which is what puts these handlers in the always-registered
     * group. Handlers bound to a mode are walked *after* that group, where
     * stopping propagation cannot keep the library's own text handler from
     * having already acted.
     */
    render(<Harness onHold={vi.fn()} />)

    expect(registered.options).toEqual({
      documentId: DOCUMENT_ID,
      pageIndex: PAGE,
    })
    expect(registered.options).not.toHaveProperty('modeId')
  })

  it('registers before a neighbour that registers in an ordinary effect', () => {
    /*
     * The ordering this hook's suppression depends on, pinned because losing it
     * fails silently: handlers registered without a mode are walked in the
     * order they were registered, and being second means stopping nothing.
     *
     * The library registers its text handler from an ordinary effect. React
     * runs *every* layout effect before *any* of those, so registering in a
     * layout effect wins regardless of where the components sit in the tree —
     * which is what this asserts, by putting the neighbour first in the tree
     * and still expecting to be registered ahead of it. Rendering earlier was
     * tried, was not enough, and the browser showed why.
     */
    function Neighbour() {
      useEffect(() => {
        registered.order.push('library')
      }, [])
      return null
    }

    render(
      <>
        <Neighbour />
        <Harness onHold={vi.fn()} />
      </>,
    )

    expect(registered.order).toEqual(['hold', 'library'])
  })

  it('selects the word under a finger that rests', () => {
    const onHold = vi.fn()
    render(<Harness onHold={onHold} />)

    pressDown()
    vi.advanceTimersByTime(HOLD_DURATION_MS)

    // The point on the *page*, not the screen: what the word is looked up with.
    expect(onHold).toHaveBeenCalledWith(ON_THE_PAGE)
  })

  it('does nothing for a mouse held still', () => {
    // A reader thinking with their hand on the trackpad. Pointer selection is
    // unchanged by this task, and a mouse has never had a long press.
    const onHold = vi.fn()
    render(<Harness onHold={onHold} />)

    pressDown({ pointerType: 'mouse' })
    vi.advanceTimersByTime(HOLD_DURATION_MS * 2)

    expect(onHold).not.toHaveBeenCalled()
  })

  it('does nothing while a tool is live', () => {
    // Press-and-pull draws a mark then, and a hold in the middle of drawing one
    // must not also select the text underneath it.
    const onHold = vi.fn()
    render(<Harness onHold={onHold} />)

    pressDown({ modeId: 'highlight' })
    vi.advanceTimersByTime(HOLD_DURATION_MS * 2)

    expect(onHold).not.toHaveBeenCalled()
  })

  it('abandons the hold when the finger wanders', () => {
    // The balance this whole feature holds: a drag that is not a hold is a
    // scroll, and task 2 gave that gesture to the browser.
    const onHold = vi.fn()
    render(<Harness onHold={onHold} />)

    pressDown()
    vi.advanceTimersByTime(HOLD_DURATION_MS / 2)
    window.dispatchEvent(
      pointerEvent('pointermove', {
        y: ON_THE_SCREEN.y + HOLD_MOVEMENT_TOLERANCE_PX + 1,
      }),
    )
    vi.advanceTimersByTime(HOLD_DURATION_MS)

    expect(onHold).not.toHaveBeenCalled()
  })

  it('keeps the hold through the drift a thumb cannot help', () => {
    const onHold = vi.fn()
    render(<Harness onHold={onHold} />)

    pressDown()
    window.dispatchEvent(
      pointerEvent('pointermove', {
        y: ON_THE_SCREEN.y + HOLD_MOVEMENT_TOLERANCE_PX,
      }),
    )
    vi.advanceTimersByTime(HOLD_DURATION_MS)

    expect(onHold).toHaveBeenCalledTimes(1)
  })

  it('abandons the hold when the finger lifts early', () => {
    /*
     * Watched at the window rather than through the plugin, and this is the
     * case that demands it: `click-away-guard.tsx` swallows the pointer-up that
     * follows a selected mark, so a hook waiting for the plugin's own would
     * keep its timer running and select a word half a second after the reader
     * let go.
     */
    const onHold = vi.fn()
    render(<Harness onHold={onHold} />)

    pressDown()
    window.dispatchEvent(pointerEvent('pointerup'))
    vi.advanceTimersByTime(HOLD_DURATION_MS * 2)

    expect(onHold).not.toHaveBeenCalled()
  })

  it('abandons the hold when the browser takes the press away', () => {
    const onHold = vi.fn()
    render(<Harness onHold={onHold} />)

    pressDown()
    window.dispatchEvent(pointerEvent('pointercancel'))
    vi.advanceTimersByTime(HOLD_DURATION_MS * 2)

    expect(onHold).not.toHaveBeenCalled()
  })

  it('treats a second finger as a pinch and not a hold', () => {
    // Two fingers mean zoom, which is task 1's gesture and stays task 1's.
    const onHold = vi.fn()
    render(<Harness onHold={onHold} />)

    pressDown()
    pressDown()
    vi.advanceTimersByTime(HOLD_DURATION_MS * 2)

    expect(onHold).not.toHaveBeenCalled()
  })

  it('keeps a scrolling thumb from selecting anything', () => {
    /*
     * The second half of what the user reported — "trying to scroll just
     * selects text". Task 2 gave the pan back to the browser; this stops the
     * library selecting during it. The press has already wandered here, so the
     * hold is off, and the movement must *still* be withheld: it is a scroll,
     * and a scroll selects nothing.
     */
    render(<Harness onHold={vi.fn()} />)

    pressDown()
    window.dispatchEvent(
      pointerEvent('pointermove', {
        y: ON_THE_SCREEN.y + HOLD_MOVEMENT_TOLERANCE_PX * 10,
      }),
    )

    const moved = managerEvent()
    registered.current?.['onPointerMove']?.(ON_THE_PAGE, moved, 'pointerMode')

    expect(moved.stopImmediatePropagation).toHaveBeenCalledTimes(1)
  })

  it('keeps the movement after a hold away from the library', () => {
    /*
     * EmbedPDF's text handler takes an anchor on every pointer-down and turns
     * it into a drag selection three page units later — about the jitter of a
     * thumb lifting. Left alone it would replace the word just selected with a
     * single character.
     */
    render(<Harness onHold={vi.fn()} />)

    pressDown()
    vi.advanceTimersByTime(HOLD_DURATION_MS)

    const moved = managerEvent()
    registered.current?.['onPointerMove']?.(ON_THE_PAGE, moved, 'pointerMode')

    expect(moved.stopImmediatePropagation).toHaveBeenCalledTimes(1)
  })

  it('lets the lift through, so the library drops the anchor it is holding', () => {
    /*
     * The other half, and the one a browser pass had to find. That handler
     * releases its anchor on pointer-up and at no other time; swallowing the
     * lift leaves it holding a point from a gesture that has ended, and the
     * next movement it hears — a *different* gesture, a handle being dragged —
     * is far enough from that stale point to start a drag selection, wiping the
     * word the hold just selected.
     *
     * Nothing is risked by letting it through: no drag has started, so all the
     * handler does with a pointer-up is forget.
     */
    render(<Harness onHold={vi.fn()} />)

    pressDown()
    vi.advanceTimersByTime(HOLD_DURATION_MS)

    const lifted = managerEvent()
    registered.current?.['onPointerUp']?.(ON_THE_PAGE, lifted, 'pointerMode')

    expect(lifted.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('lets an ordinary press through untouched', () => {
    // Nothing held: the press belongs to whatever the reader is doing with it,
    // and this must be invisible to a mouse and to a scroll alike.
    render(<Harness onHold={vi.fn()} />)

    const event = managerEvent()
    pressDown({ pointerType: 'mouse' })
    registered.current?.['onPointerMove']?.(ON_THE_PAGE, event, 'pointerMode')
    registered.current?.['onPointerUp']?.(ON_THE_PAGE, event, 'pointerMode')

    expect(event.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('forgets a press when its page is scrolled away', () => {
    // Pages are virtualized and unmount constantly. A timer left running would
    // select a word on a page that is no longer on screen.
    const onHold = vi.fn()
    const { unmount } = render(<Harness onHold={onHold} />)

    pressDown()
    unmount()
    vi.advanceTimersByTime(HOLD_DURATION_MS * 2)

    expect(onHold).not.toHaveBeenCalled()
    expect(registered.unregister).toHaveBeenCalledTimes(1)
  })
})
