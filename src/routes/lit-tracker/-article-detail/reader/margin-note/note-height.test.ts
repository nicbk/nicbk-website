import { describe, expect, it } from 'vitest'
import { EDITOR_LINE_HEIGHT, fittedHeight } from './note-height'

describe('fittedHeight', () => {
  // At 2× the note's width in CSS pixels, 160px of text is 80pt of note.
  it('converts the measured text into page points by the box’s own scale', () => {
    expect(fittedHeight({ textHeight: 160, boxWidth: 144 }, 72, 8)).toBe(80)
  })

  it('rounds up, so the last line is never clipped', () => {
    expect(fittedHeight({ textHeight: 100.2, boxWidth: 72 }, 72, 8)).toBe(101)
  })

  it('is never less than one line', () => {
    const oneLine = Math.ceil(8 * EDITOR_LINE_HEIGHT)
    expect(fittedHeight({ textHeight: 2, boxWidth: 72 }, 72, 8)).toBe(oneLine)
  })

  it('falls back to one line when there is nothing to measure against', () => {
    expect(fittedHeight({ textHeight: 50, boxWidth: 0 }, 72, 8)).toBe(
      Math.ceil(8 * EDITOR_LINE_HEIGHT),
    )
  })
})
