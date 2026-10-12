import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadingLine } from '../reader-jump'

const keepInView = vi.hoisted(() => vi.fn())
vi.mock('./keep-in-view', () => ({ keepInView }))

const { ReaderJumpProvider, useReadingLineReporter } = await import(
  '../reader-jump'
)
const { ContentsPanel } = await import('./contents-panel')

/**
 * The list on its own: what each state says, what a row does, and when the
 * list moves itself to keep the marked entry in view. The marking rule is
 * `section-in-view.test.ts`'s; the jump end to end is the sidebar's test.
 */

const ENTRIES = [
  { title: '1 Introduction', depth: 1, pageIndex: 0, top: 90 },
  { title: '1.1 Background', depth: 2, pageIndex: 1, top: 300 },
  { title: '2 Method', depth: 1, pageIndex: 3, top: null },
]

let report: (line: ReadingLine | null) => void
function Reader() {
  report = useReadingLineReporter()
  return null
}

function renderList(onJump = vi.fn()) {
  render(
    <ReaderJumpProvider>
      <Reader />
      <ContentsPanel
        view={{ kind: 'entries', entries: ENTRIES }}
        onJump={onJump}
      />
    </ReaderJumpProvider>,
  )
  return onJump
}

beforeEach(() => {
  keepInView.mockClear()
})

describe('ContentsPanel', () => {
  it.each([
    ['loading', 'loading…'],
    ['error', 'could not load the contents of this paper.'],
    ['reading', 'reading the contents…'],
    ['none', 'this paper has no outline or numbered sections.'],
    ['failed', 'couldn’t read the contents of this paper.'],
  ] as const)('says so when %s', (kind, sentence) => {
    render(<ContentsPanel view={{ kind }} onJump={vi.fn()} />)
    expect(screen.getByText(sentence)).toBeInTheDocument()
  })

  it('jumps to an entry’s page and point', async () => {
    const onJump = renderList()
    await userEvent.click(screen.getByRole('button', { name: /Background/ }))
    expect(onJump).toHaveBeenCalledWith(1, 300)
  })

  it('indents by depth, sharing the deepest indent past the third level', () => {
    render(
      <ContentsPanel
        view={{
          kind: 'entries',
          entries: [
            { title: 'a', depth: 1, pageIndex: 0, top: 0 },
            { title: 'b', depth: 3, pageIndex: 0, top: 0 },
            { title: 'c', depth: 5, pageIndex: 0, top: 0 },
          ],
        }}
        onJump={vi.fn()}
      />,
    )
    const indents = screen
      .getAllByRole('button')
      .map((row) => row.style.getPropertyValue('--indent'))
    expect(indents).toEqual(['0', '2', '2'])
  })

  it('centres the marked entry when it first shows, then moves only as needed', () => {
    renderList()
    act(() => report({ pageIndex: 0, top: 100 }))
    expect(keepInView).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      'center',
    )
    act(() => report({ pageIndex: 5, top: 0 }))
    expect(keepInView).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      'nearest',
    )
  })

  it('keeps still while the pointer is on it', () => {
    renderList()
    act(() => report({ pageIndex: 0, top: 100 }))
    keepInView.mockClear()
    const list = screen.getByRole('list', { name: 'contents' })
    const matches = vi
      .spyOn(list, 'matches')
      .mockImplementation((selector) => selector === ':hover')

    act(() => report({ pageIndex: 5, top: 0 }))

    expect(keepInView).not.toHaveBeenCalled()
    matches.mockRestore()
  })
})
