import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * What the rest of the reader is told about a pinch, which is: nothing — except
 * the one event a library needs to clean itself up with.
 *
 * The manager's dispatch cannot be exercised here (it belongs to a plugin over a
 * WebAssembly engine), so the handlers are captured at registration and driven
 * directly, exactly as `click-away-guard.test.tsx` does. What the fingers do is
 * real, though: the count comes from `pinch.ts` reading real `PointerEvent`s at
 * the window.
 */

const registered = vi.hoisted(() => ({
  current: null as Record<string, (...args: unknown[]) => void> | null,
  options: null as unknown,
  unregister: vi.fn(),
}))

vi.mock('@embedpdf/plugin-interaction-manager/react', () => ({
  usePointerHandlers: (options: unknown) => {
    registered.options = options
    return {
      register: (handlers: Record<string, (...args: unknown[]) => void>) => {
        registered.current = handlers
        return registered.unregister
      },
    }
  },
}))

const { PinchGuard } = await import('./pinch-guard')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

/** A finger, as the browser raises it. */
function finger(type: string, pointerId: number): void {
  window.dispatchEvent(
    new PointerEvent(type, { pointerType: 'touch', pointerId }),
  )
}

/** The manager's normalized event: a plain object, with no `pointerType`. */
function managerEvent() {
  return {
    clientX: 300,
    clientY: 220,
    target: document.body,
    currentTarget: document.body,
    stopImmediatePropagation: vi.fn(),
    isImmediatePropagationStopped: () => false,
  }
}

/** Drives one of the captured handlers and hands back what it was given. */
function reaches(handler: string) {
  const event = managerEvent()
  registered.current?.[handler]?.({ x: 40, y: 40 }, event, 'pointerMode')
  return event
}

function renderGuard() {
  return render(<PinchGuard documentId={ARTICLE_ID} pageIndex={2} />)
}

beforeEach(() => {
  registered.current = null
  registered.options = null
  vi.clearAllMocks()
})

describe('PinchGuard', () => {
  it('registers where the library can be pre-empted, and nowhere else', () => {
    /*
     * The same load-bearing detail the click-away guard rests on: the manager
     * walks the always-registered handlers before the active mode's, so a
     * `modeId` here would put this behind the very tool it has to silence.
     */
    renderGuard()

    expect(registered.options).toEqual({
      documentId: ARTICLE_ID,
      pageIndex: 2,
    })
    expect(registered.options).not.toHaveProperty('modeId')
  })

  it('lets a single finger through untouched', () => {
    // A press cannot know a second finger is coming. Everything one finger does
    // — scrolling, holding to select, drawing with a live tool — must be
    // exactly as it was.
    renderGuard()
    finger('pointerdown', 1)

    expect(
      reaches('onPointerDown').stopImmediatePropagation,
    ).not.toHaveBeenCalled()
    expect(
      reaches('onPointerMove').stopImmediatePropagation,
    ).not.toHaveBeenCalled()
  })

  it('withholds every press and every movement of a pinch', () => {
    /*
     * The reported defect, both halves: with two fingers down, the selection
     * plugin was anchoring on the second press and dragging a selection out of
     * the movement, and a live tool was drawing with the same fingers.
     */
    renderGuard()
    finger('pointerdown', 1)
    finger('pointerdown', 2)

    expect(
      reaches('onPointerDown').stopImmediatePropagation,
    ).toHaveBeenCalledTimes(1)
    expect(
      reaches('onPointerMove').stopImmediatePropagation,
    ).toHaveBeenCalledTimes(1)
  })

  it('never touches a lift', () => {
    /*
     * The rule this feature learned three times: the pointer-up is the only
     * thing that makes the selection plugin's text handler drop its anchor — it
     * implements no cancel — and an anchor left behind turns the *next*
     * gesture's first movement into a drag selection. Registering no
     * `onPointerUp` at all is how that is guaranteed rather than remembered.
     */
    renderGuard()

    expect(registered.current).not.toHaveProperty('onPointerUp')
    expect(registered.current).not.toHaveProperty('onPointerCancel')
  })

  it('stops withholding once the hand leaves the glass', () => {
    // Otherwise the reader would have to pinch again to get their tools back.
    renderGuard()
    finger('pointerdown', 1)
    finger('pointerdown', 2)
    finger('pointerup', 1)
    finger('pointerup', 2)

    expect(
      reaches('onPointerDown').stopImmediatePropagation,
    ).not.toHaveBeenCalled()
  })

  it('unregisters when the page goes away', () => {
    // Pages are virtualized; a handler left behind acts for a page that is no
    // longer on screen.
    const { unmount } = renderGuard()
    unmount()

    expect(registered.unregister).toHaveBeenCalledTimes(1)
  })

  it('draws nothing', () => {
    const { container } = renderGuard()

    expect(container).toBeEmptyDOMElement()
  })
})
