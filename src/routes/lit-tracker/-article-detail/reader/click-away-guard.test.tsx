import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The plumbing: that the guard registers where it can pre-empt a tool, and that
 * it withholds exactly one press and no others.
 *
 * The real dispatch cannot be exercised here — it belongs to a plugin over a
 * WebAssembly engine — so the handlers are captured at registration and driven
 * directly. That is not a weaker test than it looks: the ordering claim is
 * asserted separately (below) against how the library merges handlers, and what
 * remains is the state machine, which is entirely this project's.
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

const { ClickAwayGuard } = await import('./click-away-guard')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

/** A press, driven through the captured handlers. */
function press({
  from,
  to,
  cancelled = false,
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  cancelled?: boolean
}) {
  const event = {
    stopImmediatePropagation: vi.fn(),
    isImmediatePropagationStopped: () => false,
  }
  registered.current?.['onPointerDown']?.(from, event, 'pointerMode')
  if (cancelled) {
    registered.current?.['onPointerCancel']?.(to, event, 'pointerMode')
    return event
  }
  registered.current?.['onPointerUp']?.(to, event, 'pointerMode')
  return event
}

function renderGuard(isMarkSelected: () => boolean) {
  return render(
    <ClickAwayGuard
      documentId={ARTICLE_ID}
      pageIndex={3}
      isMarkSelected={isMarkSelected}
    />,
  )
}

beforeEach(() => {
  registered.current = null
  registered.options = null
  vi.clearAllMocks()
})

describe('ClickAwayGuard', () => {
  it('registers where a tool can be pre-empted, and nowhere else', () => {
    /*
     * The load-bearing detail. The interaction manager merges a page's handlers
     * and walks the always-registered group *before* the active mode's,
     * stopping between them if propagation was stopped. Passing a `modeId`
     * would put this in the second group — after the tool — where stopping
     * propagation achieves nothing at all.
     */
    renderGuard(() => false)

    expect(registered.options).toEqual({
      documentId: ARTICLE_ID,
      pageIndex: 3,
    })
    expect(registered.options).not.toHaveProperty('modeId')
  })

  it('withholds the press that follows a selection', () => {
    renderGuard(() => true)
    const event = press({ from: { x: 10, y: 10 }, to: { x: 10, y: 10 } })

    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1)
  })

  it('lets a press through when nothing was selected', () => {
    renderGuard(() => false)
    const event = press({ from: { x: 10, y: 10 }, to: { x: 10, y: 10 } })

    expect(event.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('lets a drag through even from a selection', () => {
    renderGuard(() => true)
    const event = press({ from: { x: 10, y: 10 }, to: { x: 90, y: 90 } })

    expect(event.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('asks whether a mark is selected when the press begins, not when it ends', () => {
    /*
     * By pointer-up the reader has already deselected — it releases the mark as
     * the press starts, so a drag begins clean. Asking then would always answer
     * "nothing selected" and this would never fire at all.
     */
    let selected = true
    renderGuard(() => selected)

    const event = {
      stopImmediatePropagation: vi.fn(),
      isImmediatePropagationStopped: () => false,
    }
    registered.current?.['onPointerDown']?.(
      { x: 5, y: 5 },
      event,
      'pointerMode',
    )
    selected = false // what the reader's own deselect does, mid-press
    registered.current?.['onPointerUp']?.({ x: 5, y: 5 }, event, 'pointerMode')

    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1)
  })

  it('withholds only one press: the next one creates', () => {
    // A guard that stayed armed would turn the sticky tool off in all but name.
    let selected = true
    renderGuard(() => selected)

    const first = press({ from: { x: 5, y: 5 }, to: { x: 5, y: 5 } })
    expect(first.stopImmediatePropagation).toHaveBeenCalledTimes(1)

    selected = false // deselected by the first press
    const second = press({ from: { x: 5, y: 5 }, to: { x: 5, y: 5 } })
    expect(second.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('forgets a press the browser took away', () => {
    // A pointer cancelled into a scroll ends nothing, and must not leave the
    // guard armed to swallow the next real click.
    let selected = true
    renderGuard(() => selected)

    press({ from: { x: 5, y: 5 }, to: { x: 5, y: 60 }, cancelled: true })
    selected = false

    const next = press({ from: { x: 5, y: 5 }, to: { x: 5, y: 5 } })
    expect(next.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('ignores a pointer-up it never saw begin', () => {
    // Presses that started on another page, or before this mounted.
    renderGuard(() => true)

    const event = {
      stopImmediatePropagation: vi.fn(),
      isImmediatePropagationStopped: () => false,
    }
    registered.current?.['onPointerUp']?.({ x: 5, y: 5 }, event, 'pointerMode')

    expect(event.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('unregisters when the page goes away', () => {
    // Pages are virtualized: they mount and unmount constantly while scrolling,
    // and a handler left behind would act for a page no longer on screen.
    const { unmount } = renderGuard(() => true)
    unmount()

    expect(registered.unregister).toHaveBeenCalledTimes(1)
  })

  it('draws nothing', () => {
    const { container } = renderGuard(() => true)

    expect(container).toBeEmptyDOMElement()
  })
})
