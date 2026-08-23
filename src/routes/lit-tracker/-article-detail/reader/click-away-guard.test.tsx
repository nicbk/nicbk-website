import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The plumbing: that the guard registers where it can pre-empt a tool, that it
 * withholds exactly the presses it should and no others, and that a tool it
 * takes a release from is told to put down what it was drawing.
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
type LiveTool = import('./click-away').LiveTool

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'
const ON_SCREEN = { x: 500, y: 400 }

/** The page element the manager's listeners live on. */
let page: HTMLDivElement
/** What the press landed on — the page image, in the reader. A cancel is aimed here. */
let paper: HTMLDivElement

/** The press the window-level tracker sees, as the browser would raise it. */
function pointerEvent(kind: string, id = 3): PointerEvent {
  return new PointerEvent('pointerdown', {
    pointerType: kind,
    pointerId: id,
    clientX: ON_SCREEN.x,
    clientY: ON_SCREEN.y,
  })
}

/** The manager's normalized event: a plain object, with no `pointerType` on it. */
function managerEvent(screen = ON_SCREEN) {
  return {
    clientX: screen.x,
    clientY: screen.y,
    target: paper,
    currentTarget: page,
    stopImmediatePropagation: vi.fn(),
    isImmediatePropagationStopped: () => false,
  }
}

interface PressOptions {
  kind?: string
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  toOnScreen?: { x: number; y: number }
  cancelled?: boolean
}

/** A whole press, driven through the captured handlers. */
function press({
  kind = 'mouse',
  from = { x: 100, y: 100 },
  to = from,
  toOnScreen = ON_SCREEN,
  cancelled = false,
}: PressOptions = {}) {
  // The window listener that records the pointer runs first, on capture,
  // exactly as it does in a browser.
  window.dispatchEvent(pointerEvent(kind))

  const down = managerEvent()
  registered.current?.['onPointerDown']?.(from, down, 'pointerMode')

  if (cancelled) {
    registered.current?.['onPointerCancel']?.(to, managerEvent(), 'pointerMode')
    return { down, up: null }
  }

  const up = managerEvent(toOnScreen)
  registered.current?.['onPointerUp']?.(to, up, 'pointerMode')
  return { down, up }
}

interface GuardOptions {
  isMarkSelected?: () => boolean
  activeTool?: () => LiveTool | null
  onDeselect?: () => void
}

/** A tool that makes a mark where it is clicked — a shape, or the text box. */
const SHAPE: LiveTool = { id: 'square', createsOnClick: true }

function renderGuard({
  isMarkSelected = () => true,
  activeTool = () => SHAPE,
  onDeselect = vi.fn(),
}: GuardOptions = {}) {
  const result = render(
    <ClickAwayGuard
      documentId={ARTICLE_ID}
      pageIndex={3}
      isMarkSelected={isMarkSelected}
      activeTool={activeTool}
      onDeselect={onDeselect}
    />,
  )
  return { ...result, onDeselect }
}

beforeEach(() => {
  registered.current = null
  registered.options = null
  page = document.createElement('div')
  paper = document.createElement('div')
  page.append(paper)
  document.body.append(page)
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
    renderGuard()

    expect(registered.options).toEqual({
      documentId: ARTICLE_ID,
      pageIndex: 3,
    })
    expect(registered.options).not.toHaveProperty('modeId')
  })

  it('withholds the click that follows a selection', () => {
    renderGuard()
    const { down, up } = press()

    expect(down.stopImmediatePropagation).not.toHaveBeenCalled()
    expect(up?.stopImmediatePropagation).toHaveBeenCalledTimes(1)
  })

  it('tells the tool its pointer was cancelled, so it drops what it was drawing', () => {
    /*
     * The defect this task exists for. A tool starts drawing on pointer-down
     * and clears what it started on pointer-up *or* pointer-cancel — nowhere
     * else. Withholding the release without this leaves it sizing a shape that
     * follows the cursor until the next press.
     */
    const cancels = vi.fn()
    // Listening on the page, where the manager listens — the cancel is aimed at
    // what the press landed on and reaches the page by bubbling, which is what
    // puts it in front of the tool's handler.
    page.addEventListener('pointercancel', cancels)
    renderGuard()

    press()

    expect(cancels).toHaveBeenCalledTimes(1)
    const [event] = cancels.mock.calls[0] as [PointerEvent]
    expect(event.target).toBe(paper)
    // The real pointer's id: the manager turns a cancel into a capture release
    // for that id, and an id the element never captured throws in the plugin.
    expect(event.pointerId).toBe(3)
  })

  it('lets the tool release the capture it is holding, and only then', () => {
    /*
     * The plugin lets go of the pointer unconditionally when it hears a cancel,
     * and by then the browser may already have done it — implicit release
     * happens as a press ends. A refused release throws inside the plugin,
     * where nothing can catch it, so the release is made conditional for the
     * length of that one dispatch. Asserted both ways, because the version that
     * simply always called it put an exception in the console on every click.
     */
    const released = vi.fn()
    paper.releasePointerCapture = released
    paper.hasPointerCapture = () => false
    // Standing in for the plugin, which lets go of the pointer the moment it
    // hears a cancel — the call this has to keep from throwing.
    page.addEventListener('pointercancel', (event) => {
      const target = event.target as Element
      target.releasePointerCapture((event as PointerEvent).pointerId)
    })
    renderGuard()

    press()
    expect(released).not.toHaveBeenCalled()

    paper.hasPointerCapture = (id: number) => id === 3
    press()
    expect(released).toHaveBeenCalledWith(3)

    // And the element is left exactly as it was found.
    expect(paper.releasePointerCapture).toBe(released)
  })

  it('cancels nothing when there was nothing under the press', () => {
    // A press whose target the manager could not name. Nothing to aim a cancel
    // at, and nothing worth throwing over.
    const cancels = vi.fn()
    page.addEventListener('pointercancel', cancels)
    renderGuard()

    window.dispatchEvent(pointerEvent('mouse'))
    const withoutTarget = { ...managerEvent(), target: null }
    registered.current?.['onPointerDown']?.(
      { x: 5, y: 5 },
      withoutTarget,
      'pointerMode',
    )
    registered.current?.['onPointerUp']?.(
      { x: 5, y: 5 },
      withoutTarget,
      'pointerMode',
    )

    expect(withoutTarget.stopImmediatePropagation).toHaveBeenCalledTimes(1)
    expect(cancels).not.toHaveBeenCalled()
  })

  it('cancels nothing when it withheld nothing', () => {
    const cancels = vi.fn()
    page.addEventListener('pointercancel', cancels)
    renderGuard()

    press({ to: { x: 190, y: 160 } })

    expect(cancels).not.toHaveBeenCalled()
  })

  it('lets a drag through even from a selection', () => {
    renderGuard()
    const { up } = press({ to: { x: 190, y: 160 } })

    expect(up?.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('lets a press through when nothing was selected', () => {
    renderGuard({ isMarkSelected: () => false })
    const { down, up } = press()

    expect(down.stopImmediatePropagation).not.toHaveBeenCalled()
    expect(up?.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('asks what was selected when the press begins, not when it ends', () => {
    /*
     * By pointer-up the reader has already deselected — it releases the mark as
     * the press starts, so that a drag begins from a clean state — so asking
     * then would always answer "nothing selected" and this would never fire.
     */
    let selected = true
    renderGuard({ isMarkSelected: () => selected })

    const down = managerEvent()
    window.dispatchEvent(pointerEvent('mouse'))
    registered.current?.['onPointerDown']?.({ x: 5, y: 5 }, down, 'pointerMode')
    selected = false // what the reader's own deselect does, mid-press
    const up = managerEvent()
    registered.current?.['onPointerUp']?.({ x: 5, y: 5 }, up, 'pointerMode')

    expect(up.stopImmediatePropagation).toHaveBeenCalledTimes(1)
  })

  it('withholds only one press: the next one creates', () => {
    // A guard that stayed armed would turn the sticky tool off in all but name.
    let selected = true
    renderGuard({ isMarkSelected: () => selected })

    const first = press()
    expect(first.up?.stopImmediatePropagation).toHaveBeenCalledTimes(1)

    selected = false // deselected by the first press
    const second = press()
    expect(second.up?.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('takes a finger’s press away at its start, and lets the browser have it', () => {
    // Nothing starts, so nothing is drawn or sized — and the gesture is the
    // browser's to turn into a scroll.
    renderGuard()
    const { down } = press({ kind: 'touch' })

    expect(down.stopImmediatePropagation).toHaveBeenCalledTimes(1)
  })

  it('puts the mark down when a finger tapped', () => {
    const { onDeselect } = renderGuard()
    press({ kind: 'touch' })

    expect(onDeselect).toHaveBeenCalledTimes(1)
  })

  it('leaves the mark alone when the finger panned', () => {
    // Decided with the user: a press that becomes a scroll changes nothing but
    // where the paper is.
    const { onDeselect } = renderGuard()
    press({ kind: 'touch', toOnScreen: { x: 500, y: 300 } })

    expect(onDeselect).not.toHaveBeenCalled()
  })

  it('leaves the mark alone when the browser takes the press away', () => {
    // Which is how a scroll usually ends: the pointer is cancelled, not lifted.
    const { onDeselect } = renderGuard()
    press({ kind: 'touch', cancelled: true })

    expect(onDeselect).not.toHaveBeenCalled()
  })

  it('never puts a mark down for a mouse, which did it as it pressed', () => {
    const { onDeselect } = renderGuard()
    press()

    expect(onDeselect).not.toHaveBeenCalled()
  })

  it('takes the press away from a tool that creates on the press itself', () => {
    // The sticky note commits at pointer-down, so its press has to be stopped
    // at the start — and then there is no release to withhold.
    renderGuard({
      activeTool: () => ({ id: 'textComment', createsOnClick: false }),
    })
    const { down, up } = press()

    expect(down.stopImmediatePropagation).toHaveBeenCalledTimes(1)
    expect(up?.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('does nothing at all when no tool is live', () => {
    // Nothing can be created, so nothing needs withholding — and taking a
    // finger's press here would cost the touch selection its long press.
    const { onDeselect } = renderGuard({ activeTool: () => null })
    const { down } = press({ kind: 'touch' })

    expect(down.stopImmediatePropagation).not.toHaveBeenCalled()
    expect(onDeselect).toHaveBeenCalledTimes(1)
  })

  it('ignores a pointer-up it never saw begin', () => {
    // Presses that started on another page, or before this mounted.
    renderGuard()

    const up = managerEvent()
    registered.current?.['onPointerUp']?.({ x: 5, y: 5 }, up, 'pointerMode')

    expect(up.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('unregisters when the page goes away', () => {
    // Pages are virtualized: they mount and unmount constantly while scrolling,
    // and a handler left behind would act for a page no longer on screen.
    const { unmount } = renderGuard()
    unmount()

    expect(registered.unregister).toHaveBeenCalledTimes(1)
  })

  it('draws nothing', () => {
    const { container } = renderGuard()

    expect(container).toBeEmptyDOMElement()
  })
})
