import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AnnotationsPanel } from './annotations-panel'
import type { SyncedAnnotation } from './reader/annotation-sync/annotation-row'
import styles from './annotations-panel.module.css'

/**
 * What a row says and what activating one does — the two things this panel
 * decides. The rows come in as props (the sidebar owns the query), so every
 * case here is a plain render: no Zero, no engine.
 */

function mark(overrides: Partial<SyncedAnnotation>): SyncedAnnotation {
  return {
    id: 'a1',
    type: 'highlight',
    pageIndex: 0,
    contents: null,
    payload: {},
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function renderPanel(
  annotations: readonly SyncedAnnotation[],
  options: {
    state?: 'syncing' | 'ready' | 'error'
    onJumpToPage?: (pageIndex: number) => void
  } = {},
) {
  return render(
    <AnnotationsPanel
      state={options.state ?? 'ready'}
      annotations={annotations}
      onJumpToPage={options.onJumpToPage ?? (() => {})}
    />,
  )
}

describe('AnnotationsPanel', () => {
  it('is a list to assistive technology, one item per mark', () => {
    renderPanel([
      mark({ id: 'a1', contents: 'the attention mechanism' }),
      mark({ id: 'a2', type: 'ink', pageIndex: 3 }),
    ])

    expect(
      screen.getByRole('list', { name: 'marks on this paper' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows a row’s words and its page, counted from 1', () => {
    // Stored 0-based, shown 1-based — the reader's own indicator counts from 1
    // and the two must agree after a jump.
    renderPanel([
      mark({ id: 'a1', contents: 'the attention mechanism', pageIndex: 2 }),
    ])

    const row = screen.getByRole('button', {
      name: /the attention mechanism/,
    })
    expect(row).toHaveTextContent('p. 3')
  })

  it('names a textless mark by its tool, for ink and for a shape', () => {
    // The two types that produce empty `contents` naturally — and in the
    // toolbar menu's own words, not the PDF specification's.
    renderPanel([
      mark({ id: 'a1', type: 'ink' }),
      mark({ id: 'a2', type: 'square' }),
    ])

    expect(screen.getByRole('button', { name: /freehand/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /rectangle/ }),
    ).toBeInTheDocument()
  })

  it('names a textless highlight too, because the engine captures no text', () => {
    // Found while building this panel: EmbedPDF does not put the selected text
    // into `contents`, so a highlight's row is as textless as an ink stroke's
    // until task 6 associates text with marks.
    renderPanel([mark({ id: 'a1', type: 'highlight' })])

    expect(
      screen.getByRole('button', { name: /highlight/ }),
    ).toBeInTheDocument()
  })

  it('marks the fallback as a label rather than as the mark’s own words', () => {
    renderPanel([
      mark({ id: 'a1', type: 'ink' }),
      mark({ id: 'a2', contents: 'real words' }),
    ])

    expect(screen.getByText('freehand')).toHaveClass(styles.kind)
    expect(screen.getByText('real words')).not.toHaveClass(styles.kind)
  })

  it('bounds a long snippet instead of letting it grow the row', () => {
    // A highlight can be a paragraph. The bounding itself is the CSS clamp,
    // which jsdom cannot measure — what is assertable is that the snippet is
    // rendered through the clamped class, with the whitespace collapsed so the
    // clamp spends its lines on words.
    renderPanel([
      mark({ id: 'a1', contents: '  a very\nlong   passage\nof text  ' }),
    ])

    const snippet = screen.getByText('a very long passage of text')
    expect(snippet).toHaveClass(styles.snippet)
  })

  it('jumps to the row’s page on click', async () => {
    const onJumpToPage = vi.fn()
    renderPanel([mark({ id: 'a1', type: 'ink', pageIndex: 5 })], {
      onJumpToPage,
    })

    await userEvent.click(screen.getByRole('button', { name: /freehand/ }))

    expect(onJumpToPage).toHaveBeenCalledWith(5)
  })

  it('jumps by keyboard exactly as by click', async () => {
    const onJumpToPage = vi.fn()
    renderPanel([mark({ id: 'a1', type: 'ink', pageIndex: 5 })], {
      onJumpToPage,
    })

    screen.getByRole('button', { name: /freehand/ }).focus()
    await userEvent.keyboard('{Enter}')

    expect(onJumpToPage).toHaveBeenCalledWith(5)
  })

  it('says a paper with no marks has none', () => {
    renderPanel([])

    expect(screen.getByText('no marks on this paper yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('does not claim emptiness while still syncing', () => {
    // An empty result before the first round trip completes is not evidence of
    // anything, and "no marks" there would flash on every cold load.
    renderPanel([], { state: 'syncing' })

    expect(screen.getByText('loading…')).toBeInTheDocument()
    expect(screen.queryByText('no marks on this paper yet.')).toBeNull()
  })

  it('says so when the query failed, distinctly from both', () => {
    renderPanel([], { state: 'error' })

    expect(
      screen.getByText('could not load the marks on this paper.'),
    ).toBeInTheDocument()
  })
})
