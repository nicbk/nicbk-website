import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Magnifier } from './magnifier'
import { MAGNIFIER_GAP, MAGNIFIER_SIZE } from './magnifier-view'

/**
 * What the lens actually paints.
 *
 * jsdom has no 2D context — it says so, loudly — so one is stood in for and
 * every call recorded. That is enough to assert the things that would otherwise
 * only ever be judged by eye on a phone: that it looks at the right part of the
 * page, that it shows the selection as well as the words, and that it marks the
 * boundary the reader is aiming at.
 */

const PANEL = { left: 0, top: 100, right: 400 }
const ANCHOR = { x: 100, top: 40, bottom: 52 }
const FINGER = { x: 200, y: 400 }

/** How many image pixels the page's bitmap holds per page unit, at 100% zoom. */
const IMAGE_DENSITY = 2

const context = {
  setTransform: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: '',
  globalCompositeOperation: '',
}

/** A rendered page: an image with a bitmap denser than its laid-out size. */
function paperElement(): HTMLImageElement {
  const paper = document.createElement('img')
  Object.defineProperty(paper, 'naturalWidth', { value: 1200 })
  Object.defineProperty(paper, 'clientWidth', { value: 600 })
  return paper
}

function renderLens({
  paper = paperElement(),
  rects = [] as {
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }[],
  finger = FINGER,
}: {
  paper?: HTMLImageElement | null
  rects?: {
    origin: { x: number; y: number }
    size: { width: number; height: number }
  }[]
  finger?: { x: number; y: number }
} = {}) {
  return render(
    <Magnifier
      paper={paper}
      anchor={ANCHOR}
      finger={finger}
      scale={1}
      rects={rects}
      panel={PANEL}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  context.fillStyle = ''
  context.globalCompositeOperation = ''
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => context,
  ) as unknown as HTMLCanvasElement['getContext']
})

describe('Magnifier', () => {
  it('floats above the finger, on the document rather than the page', () => {
    // Portalled, because it has to escape the reader's scroll region — the
    // boundary being adjusted is usually near an edge of it.
    renderLens()

    const lens = document.body.querySelector('canvas')?.parentElement
    expect(lens).not.toBeNull()
    // Positioned in client coordinates, which is only meaningful because the
    // element is fixed to the window — that half is in its stylesheet, which
    // jsdom does not apply.
    expect(lens).toHaveStyle({
      left: `${FINGER.x - MAGNIFIER_SIZE.width / 2}px`,
      top: `${FINGER.y - MAGNIFIER_GAP - MAGNIFIER_SIZE.height}px`,
    })
  })

  it('looks at the paper around the boundary, in the image’s own pixels', () => {
    /*
     * The arithmetic that decides whether this is a magnifier or an upscaler.
     * The page's bitmap is twice its laid-out size here, so the lens's 168×56
     * of screen at 2× is 84×28 of page, which is 168×56 of bitmap — real
     * pixels, centred on the boundary.
     */
    renderLens()

    expect(context.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      (ANCHOR.x - MAGNIFIER_SIZE.width / 4) * IMAGE_DENSITY,
      (46 - MAGNIFIER_SIZE.height / 4) * IMAGE_DENSITY,
      MAGNIFIER_SIZE.width,
      MAGNIFIER_SIZE.height,
      0,
      0,
      MAGNIFIER_SIZE.width,
      MAGNIFIER_SIZE.height,
    )
  })

  it('shows the selection, not only the words', () => {
    // Without this the reader would be adjusting a boundary they could not see,
    // which is the one thing the lens exists to show them.
    renderLens({
      rects: [{ origin: { x: 90, y: 40 }, size: { width: 20, height: 12 } }],
    })

    // Ten page units left of the boundary, magnified: 20 lens pixels left of
    // centre, and twice as wide as it is on the page.
    expect(context.fillRect).toHaveBeenCalledWith(
      MAGNIFIER_SIZE.width / 2 - 20,
      MAGNIFIER_SIZE.height / 2 - 12,
      40,
      24,
    )
  })

  it('marks the boundary itself, down the middle', () => {
    // The caret: the thing being dragged. It sits at the centre because the
    // lens is centred on it.
    renderLens()

    const caret = context.fillRect.mock.calls.find(
      ([x]) =>
        typeof x === 'number' && Math.abs(x - MAGNIFIER_SIZE.width / 2) < 3,
    )

    expect(caret?.[3]).toBe((ANCHOR.bottom - ANCHOR.top) * 2)
  })

  it('still draws when the page image is not there', () => {
    // A page mid-render, or one whose bitmap was replaced by a zoom. The lens
    // shows blank paper rather than disappearing mid-gesture.
    renderLens({ paper: null })

    expect(context.drawImage).not.toHaveBeenCalled()
    expect(context.fillRect).toHaveBeenCalled()
  })

  it('declines quietly where there is no drawing context at all', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => null,
    ) as unknown as HTMLCanvasElement['getContext']

    expect(() => renderLens()).not.toThrow()
  })
})
