import type { Position, Rect } from '@embedpdf/models'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { HandleAnchor } from './handle-anchors'
import type { PanelBounds } from './magnifier-view'
import {
  MAGNIFICATION,
  MAGNIFIER_SIZE,
  magnifierPlacement,
  magnifierSource,
  pointInMagnifier,
} from './magnifier-view'
import styles from './magnifier.module.css'

/**
 * The lens: what the finger is covering, drawn where the finger is not.
 *
 * **It repaints the page rather than reusing it.** The obvious implementation —
 * a second `<img>` with the same `src`, scaled up inside a clipped box — cannot
 * work here: `RenderLayer` calls `URL.revokeObjectURL` the moment its image
 * loads, so the element keeps its bitmap and the URL is dead. Drawing the live
 * element into a canvas is what remains, and it is the better answer anyway:
 * the page is rendered at the device's pixel ratio, so the bitmap already holds
 * two or three times the detail its CSS size shows, and the lens spends that
 * detail rather than inventing any.
 *
 * **It draws the selection too, not just the paper.** A magnifier that showed
 * only the words would leave the reader aiming at a boundary they cannot see —
 * which is the thing they are actually adjusting.
 *
 * Portalled to the document, because it must float above the reader's toolbar,
 * its sidebar and the page it belongs to. Nothing in it is interactive: it is a
 * report, and the finger that summons it is busy elsewhere.
 */

interface MagnifierProps {
  /** The rendered page to magnify — see `RenderLayer` in `pdf-reader.tsx`. */
  paper: HTMLImageElement | null
  /** The boundary being dragged: where to look, and what to draw a caret on. */
  anchor: HandleAnchor
  /** Where the finger is, in client coordinates. */
  finger: Position
  /** The document's zoom. */
  scale: number
  /** The selection's rectangles on this page, in page coordinates. */
  rects: Rect[]
  /** The reader's panel, so the lens stays inside it. */
  panel: PanelBounds
}

/** EmbedPDF's own selection blue, which the lens matches so the two read as one thing. */
const SELECTION_BLUE = 'rgb(33, 150, 243)'

/** The paper behind a page that has not been drawn yet, or beyond a page's edge. */
const PAPER_WHITE = '#ffffff'

export function Magnifier({
  paper,
  anchor,
  finger,
  scale,
  rects,
  panel,
}: MagnifierProps) {
  const canvas = useRef<HTMLCanvasElement>(null)

  const boundary: Position = {
    x: anchor.x,
    y: (anchor.top + anchor.bottom) / 2,
  }
  const placement = magnifierPlacement(finger, panel)

  /*
   * No dependency list: every render of this component *is* a change to what it
   * should be showing — the finger moved, or the boundary did — so the painting
   * follows the render rather than a list of the things that caused it.
   */
  useEffect(() => {
    const surface = canvas.current
    const context = surface?.getContext('2d')
    if (!surface || !context) {
      return
    }

    /*
     * The backing store is sized in device pixels and the drawing is done in
     * CSS ones. Without this the lens would be as soft as the screen is dense —
     * which would undo the only reason it is a canvas.
     */
    const density = window.devicePixelRatio || 1
    surface.width = MAGNIFIER_SIZE.width * density
    surface.height = MAGNIFIER_SIZE.height * density
    context.setTransform(density, 0, 0, density, 0, 0)

    context.fillStyle = PAPER_WHITE
    context.fillRect(0, 0, MAGNIFIER_SIZE.width, MAGNIFIER_SIZE.height)

    if (paper?.naturalWidth && paper.clientWidth) {
      /*
       * Image pixels per page unit, derived from the element rather than from
       * the document's state: the ratio between an image's natural width and
       * its laid-out width *is* the density it was rendered at, whatever the
       * screen has since done.
       */
      const imagePixelsPerPageUnit =
        (paper.naturalWidth / paper.clientWidth) * scale
      const source = magnifierSource(
        { boundary, scale },
        imagePixelsPerPageUnit,
      )
      context.drawImage(
        paper,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        MAGNIFIER_SIZE.width,
        MAGNIFIER_SIZE.height,
      )
    }

    // Multiply, as the selection layer over the real page does: the words show
    // through the tint instead of being painted over by it.
    context.globalCompositeOperation = 'multiply'
    context.fillStyle = SELECTION_BLUE
    for (const rect of rects) {
      const topLeft = pointInMagnifier(rect.origin, { boundary, scale })
      context.fillRect(
        topLeft.x,
        topLeft.y,
        rect.size.width * scale * MAGNIFICATION,
        rect.size.height * scale * MAGNIFICATION,
      )
    }

    context.globalCompositeOperation = 'source-over'
    context.fillStyle =
      getComputedStyle(surface).getPropertyValue('--color-accent').trim() ||
      SELECTION_BLUE
    const caret = pointInMagnifier(
      { x: anchor.x, y: anchor.top },
      { boundary, scale },
    )
    context.fillRect(
      caret.x - CARET_WIDTH / 2,
      caret.y,
      CARET_WIDTH,
      (anchor.bottom - anchor.top) * scale * MAGNIFICATION,
    )
  })

  return createPortal(
    <div
      className={styles.lens}
      style={{ left: placement.left, top: placement.top }}
      aria-hidden="true"
    >
      {/*
       * Sized in CSS rather than by the element's own `width`/`height`
       * attributes: those set the backing store, which the painting above
       * replaces with a device-pixel one — and with it, the element's default
       * layout size. Saying the CSS size here keeps one source of truth for it.
       */}
      <canvas
        ref={canvas}
        className={styles.glass}
        style={{
          width: MAGNIFIER_SIZE.width,
          height: MAGNIFIER_SIZE.height,
        }}
      />
    </div>,
    document.body,
  )
}

/** The caret in the lens, in lens pixels — thicker than the handle's bar, because it is magnified. */
const CARET_WIDTH = 3
