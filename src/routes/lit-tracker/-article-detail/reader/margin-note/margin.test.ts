import { describe, expect, it } from 'vitest'
import { marginWidth, nearerMargin, textBlockOf } from './margin'

function run(text: string, x: number, width: number, y = 100) {
  return { text, rect: { origin: { x, y }, size: { width, height: 10 } } }
}

const LETTER = { width: 612, height: 792 }

describe('textBlockOf', () => {
  it('spans the page’s text from its leftmost run to its rightmost', () => {
    const block = textBlockOf([
      run('Attention mechanisms have', 108, 200),
      run('become an integral part', 108, 398),
    ])
    expect(block).toEqual({ left: 108, right: 506 })
  })

  // A page number or footnote mark out in the margin must not make the margin
  // look as narrow as the ornament is far out.
  it('ignores runs of one or two characters', () => {
    const block = textBlockOf([
      run('Body text of the paper', 108, 398),
      run('12', 20, 8),
      run('*', 590, 4),
    ])
    expect(block).toEqual({ left: 108, right: 506 })
  })

  it('finds nothing on a page with no text to measure', () => {
    expect(textBlockOf([])).toBeNull()
    expect(textBlockOf([run('  ', 10, 5)])).toBeNull()
  })
})

describe('nearerMargin', () => {
  // A two-column ACM page, measured: text from 54pt to 556pt.
  const block = { left: 54, right: 556 }

  it('writes left for a passage in the left column', () => {
    const passage = {
      origin: { x: 54, y: 300 },
      size: { width: 200, height: 10 },
    }
    expect(nearerMargin(block, passage)).toBe('left')
  })

  it('writes right for a passage in the right column', () => {
    const passage = {
      origin: { x: 317, y: 300 },
      size: { width: 200, height: 10 },
    }
    expect(nearerMargin(block, passage)).toBe('right')
  })
})

describe('marginWidth', () => {
  it('is the distance from the page’s edge to the text', () => {
    const block = { left: 54, right: 556 }
    expect(marginWidth(block, LETTER, 'left')).toBe(54)
    expect(marginWidth(block, LETTER, 'right')).toBe(56)
  })
})
