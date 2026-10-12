import type { Rect } from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkedPartnerOutline } from './linked-partner-outline'
import { linkedPartners } from './linked-partners'

function rect(x: number, y: number): Rect {
  return { origin: { x, y }, size: { width: 50, height: 10 } }
}

const highlight = {
  id: 'h',
  type: PdfAnnotationSubtype.HIGHLIGHT,
  pageIndex: 0,
  rect: rect(120, 300),
}
const note = {
  id: 'n',
  type: PdfAnnotationSubtype.FREETEXT,
  pageIndex: 0,
  rect: rect(32, 300),
  inReplyToId: 'h',
  flags: ['locked'],
}
const other = {
  id: 'o',
  type: PdfAnnotationSubtype.SQUARE,
  pageIndex: 0,
  rect: rect(200, 500),
}

function state(selectedUids: string[]) {
  return {
    selectedUids,
    byUid: Object.fromEntries(
      [highlight, note, other].map((o) => [
        o.id,
        { commitState: 'synced', object: o },
      ]),
    ),
  } as never
}

describe('linkedPartners', () => {
  it('outlines the passage of a selected margin note', () => {
    expect(linkedPartners(state(['n']), 0)).toEqual([highlight.rect])
  })

  it('outlines the margin note of a selected highlight', () => {
    expect(linkedPartners(state(['h']), 0)).toEqual([note.rect])
  })

  it('outlines nothing for a mark with no margin note', () => {
    expect(linkedPartners(state(['o']), 0)).toEqual([])
  })

  it('outlines only what is on the page asked about', () => {
    expect(linkedPartners(state(['n']), 1)).toEqual([])
  })

  it('outlines nothing when nothing is selected', () => {
    expect(linkedPartners(state([]), 0)).toEqual([])
  })
})

describe('LinkedPartnerOutline', () => {
  it('draws the partner at the page’s scale, out of the way of the pointer', () => {
    const { container } = render(
      <LinkedPartnerOutline state={state(['n'])} pageIndex={0} scale={2} />,
    )
    const outline = container.querySelector(
      '[aria-hidden] > div',
    ) as HTMLElement
    expect(outline.style.left).toBe('240px')
    expect(outline.style.top).toBe('600px')
    expect(outline.style.width).toBe('100px')
  })

  it('draws nothing when nothing linked is selected', () => {
    const { container } = render(
      <LinkedPartnerOutline state={state([])} pageIndex={0} scale={2} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
