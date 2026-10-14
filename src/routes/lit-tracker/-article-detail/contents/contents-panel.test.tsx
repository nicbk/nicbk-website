import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentsEntry } from '~/lit-tracker/contents/contents'
import { foldsAfter } from '~/lit-tracker/contents/contents-tree'
import type { ReadingLine } from '../reader-jump'

const keepInView = vi.hoisted(() => vi.fn())
vi.mock('./keep-in-view', () => ({ keepInView }))

const { ReaderJumpProvider, useReadingLineReporter } = await import(
  '../reader-jump'
)
const { ContentsPanel } = await import('./contents-panel')

/**
 * The list on its own: what each state says, what a row does, how an entry
 * folds, and when the list moves itself to keep the marked entry in view. The
 * marking and nesting rules are `section-in-view.test.ts`'s and
 * `contents-tree.test.ts`'s; the jump end to end is the sidebar's test.
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

/**
 * Folds held in the test as sync holds them for the sidebar: a press writes
 * what the mutator would (`foldsAfter`), and the list re-renders from it.
 */
function Harness({
  entries,
  initial,
  onJump,
  fold,
}: {
  entries: readonly ContentsEntry[]
  initial: readonly number[] | null
  onJump: (pageIndex: number, top: number | null) => void
  fold: (index: number, open: boolean) => void
}) {
  const [expanded, setExpanded] = useState(initial)
  return (
    <ReaderJumpProvider>
      <Reader />
      <ContentsPanel
        view={{ kind: 'entries', entries, expanded }}
        onFold={(index, open) => {
          fold(index, open)
          setExpanded(foldsAfter(entries, expanded, index, open))
        }}
        onJump={onJump}
      />
    </ReaderJumpProvider>
  )
}

function renderList({
  entries = ENTRIES,
  expanded = null as readonly number[] | null,
  onJump = vi.fn(),
  fold = vi.fn(),
} = {}) {
  render(
    <Harness
      entries={entries}
      initial={expanded}
      onJump={onJump}
      fold={fold}
    />,
  )
  return { onJump, fold }
}

/** The entries' titles the list is showing, in order. */
function shownTitles(): string[] {
  return screen
    .getAllByRole('button', { name: /^(?!sections of)/ })
    .map((button) => button.querySelector('span')?.textContent ?? '')
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
    render(<ContentsPanel view={{ kind }} onFold={vi.fn()} onJump={vi.fn()} />)
    expect(screen.getByText(sentence)).toBeInTheDocument()
  })

  it('jumps to an entry’s page and point', async () => {
    const { onJump } = renderList({ expanded: [0] })
    await userEvent.click(screen.getByRole('button', { name: /Background/ }))
    expect(onJump).toHaveBeenCalledWith(1, 300)
  })

  it('shows only the top level on a paper never folded', () => {
    renderList()
    expect(shownTitles()).toEqual(['1 Introduction', '2 Method'])
  })

  it('opens a lone root on a paper never folded, and keeps it closed once closed', () => {
    const entries = [
      { title: 'A Book', depth: 1, pageIndex: 0, top: null },
      { title: '1 Chapter', depth: 2, pageIndex: 1, top: null },
      { title: '1.1 Section', depth: 3, pageIndex: 1, top: 200 },
    ]
    renderList({ entries })
    expect(shownTitles()).toEqual(['A Book', '1 Chapter'])

    cleanup()
    renderList({ entries, expanded: [] })
    expect(shownTitles()).toEqual(['A Book'])
  })

  it('opens and closes an entry from its own control, telling the sidebar', async () => {
    const { fold, onJump } = renderList()
    const control = screen.getByRole('button', {
      name: 'sections of 1 Introduction',
    })
    expect(control).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(control)
    expect(fold).toHaveBeenLastCalledWith(0, true)
    expect(control).toHaveAttribute('aria-expanded', 'true')
    expect(shownTitles()).toEqual([
      '1 Introduction',
      '1.1 Background',
      '2 Method',
    ])

    await userEvent.click(control)
    expect(fold).toHaveBeenLastCalledWith(0, false)
    expect(shownTitles()).toEqual(['1 Introduction', '2 Method'])
    expect(onJump).not.toHaveBeenCalled()
  })

  it('does not fold when a title is chosen', async () => {
    const { fold, onJump } = renderList()
    await userEvent.click(
      screen.getByRole('button', { name: /^1 Introduction/ }),
    )
    expect(onJump).toHaveBeenCalledWith(0, 90)
    expect(fold).not.toHaveBeenCalled()
    expect(shownTitles()).toEqual(['1 Introduction', '2 Method'])
  })

  it('gives an entry with nothing under it no control', () => {
    renderList()
    expect(
      screen.queryByRole('button', { name: 'sections of 2 Method' }),
    ).toBeNull()
  })

  it('marks the closed entry a hidden section is in, and the section once shown', async () => {
    renderList()
    act(() => report({ pageIndex: 1, top: 400 }))
    expect(
      screen.getByRole('button', {
        name: /^1 Introduction/,
        current: 'location',
      }),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'sections of 1 Introduction' }),
    )
    expect(
      screen.getByRole('button', { name: /Background/, current: 'location' }),
    ).toBeInTheDocument()
  })

  it('indents by level in the tree, sharing the deepest indent past the third', () => {
    renderList({
      entries: [
        { title: 'a', depth: 1, pageIndex: 0, top: 0 },
        { title: 'b', depth: 3, pageIndex: 0, top: 0 },
        { title: 'c', depth: 4, pageIndex: 0, top: 0 },
        { title: 'd', depth: 5, pageIndex: 0, top: 0 },
      ],
      expanded: [0, 1, 2],
    })
    const indents = [
      ...document.querySelectorAll<HTMLElement>('[data-index]'),
    ].map((row) => row.style.getPropertyValue('--indent'))
    expect(indents).toEqual(['0', '1', '2', '2'])
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

  it('does not move itself when a press changes which row is marked', async () => {
    renderList()
    act(() => report({ pageIndex: 1, top: 400 }))
    keepInView.mockClear()

    // The marked row changes from the chapter to the section now shown in it;
    // the reader has not moved, so the list must not either.
    await userEvent.click(
      screen.getByRole('button', { name: 'sections of 1 Introduction' }),
    )
    expect(keepInView).not.toHaveBeenCalled()
  })

  it('finds the marked row by its entry, not its place among the list’s children', () => {
    renderList({ expanded: [0] })
    act(() => report({ pageIndex: 5, top: 0 }))
    const item = keepInView.mock.lastCall?.[1] as HTMLElement
    expect(item.textContent).toContain('2 Method')
  })
})
