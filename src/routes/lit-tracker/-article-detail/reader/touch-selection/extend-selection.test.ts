import { describe, expect, it } from 'vitest'
import { extendSelection } from './extend-selection'

/**
 * What a dragged handle does, including the case that decides whether the
 * mapping is right: dragging one handle *past* the other.
 *
 * A drag that simply grows a selection is easy to get right by accident. A drag
 * that crosses over is where an implementation either keeps the anchor still and
 * swaps which end is held, or quietly inverts the range and marks text the
 * reader never touched.
 */

const glyph = (index: number, page = 0) => ({ page, index })

/** "attention is all" — the fifth word-ish stretch, for something to hold onto. */
const IS = { start: glyph(10), end: glyph(11) }

describe('extendSelection', () => {
  it('grows the selection when the end is dragged forward', () => {
    const { range, dragging } = extendSelection({
      dragging: 'end',
      range: IS,
      to: glyph(15),
    })

    expect(range).toEqual({ start: glyph(10), end: glyph(15) })
    expect(dragging).toBe('end')
  })

  it('grows it backwards when the start is dragged back', () => {
    const { range, dragging } = extendSelection({
      dragging: 'start',
      range: IS,
      to: glyph(4),
    })

    expect(range).toEqual({ start: glyph(4), end: glyph(11) })
    expect(dragging).toBe('start')
  })

  it('shrinks the selection when the held end comes back toward the anchor', () => {
    const { range } = extendSelection({
      dragging: 'end',
      range: { start: glyph(4), end: glyph(15) },
      to: glyph(8),
    })

    expect(range).toEqual({ start: glyph(4), end: glyph(8) })
  })

  it('swaps ends when a handle is dragged past the other, without moving the anchor', () => {
    /*
     * The reader drags the *end* handle leftward past the start. The start is
     * the anchor, so it stays at 10 and becomes the new end; the finger is now
     * holding the start.
     *
     * The failure this rules out is an implementation that writes the finger's
     * glyph into `end` regardless — producing a range whose start is after its
     * end, which the library then normalizes into a selection nobody asked for.
     */
    const { range, dragging } = extendSelection({
      dragging: 'end',
      range: IS,
      to: glyph(2),
    })

    expect(range).toEqual({ start: glyph(2), end: glyph(10) })
    expect(dragging).toBe('start')
  })

  it('collapses to a single glyph when the finger reaches the anchor', () => {
    const { range } = extendSelection({
      dragging: 'end',
      range: IS,
      to: glyph(10),
    })

    expect(range).toEqual({ start: glyph(10), end: glyph(10) })
  })

  it('orders by page before glyph', () => {
    /*
     * A later page's first character comes *after* an earlier page's last one,
     * however small its index. Comparing indices alone would invert a selection
     * the moment one spans a page break — which a handle cannot yet cause, but
     * an anchor on another page already can.
     */
    const { range, dragging } = extendSelection({
      dragging: 'end',
      range: { start: glyph(400, 2), end: glyph(410, 2) },
      to: glyph(1, 3),
    })

    expect(range).toEqual({ start: glyph(400, 2), end: glyph(1, 3) })
    expect(dragging).toBe('end')
  })
})
