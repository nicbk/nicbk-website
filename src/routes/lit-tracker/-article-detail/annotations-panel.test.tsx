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

  it('names a highlight that carries neither a comment nor a passage', () => {
    // Rare rather than routine, now that the captured passage is read: a
    // highlight reaches its type name only when the engine captured nothing —
    // a mark drawn over a page with no text layer, or one imported from
    // elsewhere.
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

/**
 * A row can hold two texts, and which one it leads with is the decision
 * (2026-08-17). The reader's comment is theirs; the quote is the paper's; the
 * type name is what is left when there is neither.
 */
describe('a row with words in it', () => {
  it('quotes the passage the mark was drawn over', () => {
    // In `payload`, because that is where EmbedPDF puts it — the finding that
    // reframed task 6. Nothing had to be captured; this had to be read.
    renderPanel([
      mark({
        id: 'a1',
        payload: { custom: { text: 'we employed label smoothing' } },
      }),
    ])

    expect(
      screen.getByRole('button', { name: /we employed label smoothing/ }),
    ).toBeInTheDocument()
  })

  it('leads with the reader’s comment and keeps the passage under it', () => {
    // Showing the comment alone would strand a note reading "important" with
    // nothing to be important about.
    renderPanel([
      mark({
        id: 'a1',
        contents: 'hurts perplexity, improves BLEU',
        payload: { custom: { text: 'we employed label smoothing' } },
      }),
    ])

    const row = screen.getByRole('button', {
      name: /hurts perplexity, improves BLEU/,
    })
    expect(row).toHaveTextContent('we employed label smoothing')
    // Quoted only when it accompanies a comment: alone there is nothing to
    // tell it apart from.
    expect(screen.getByText(/“we employed label smoothing”/)).toBeVisible()
  })

  it('styles the passage as the paper’s voice, not as a label', () => {
    renderPanel([
      mark({
        id: 'a1',
        contents: 'mine',
        payload: { custom: { text: 'theirs' } },
      }),
    ])

    expect(screen.getByText('“theirs”')).toHaveClass(styles.quote)
    expect(screen.getByText('“theirs”')).not.toHaveClass(styles.kind)
    expect(screen.getByText('mine')).not.toHaveClass(styles.quote)
  })

  it('never shows the type name once there is anything better to say', () => {
    renderPanel([
      mark({ id: 'a1', type: 'ink', contents: 'a note on a scribble' }),
    ])

    expect(screen.queryByText('freehand')).not.toBeInTheDocument()
  })

  it('collapses the paper’s own line breaks out of the passage', () => {
    // A PDF's text layer breaks lines mid-sentence, and a clamped snippet
    // should spend its two lines on words.
    renderPanel([
      mark({
        id: 'a1',
        payload: { custom: { text: 'we employed\nlabel\n smoothing' } },
      }),
    ])

    expect(screen.getByText('we employed label smoothing')).toBeVisible()
  })

  it('calls a highlight box by its own name, not the rectangle’s', () => {
    // Both are stored as `square`; only the intent separates them.
    renderPanel([
      mark({
        id: 'a1',
        type: 'square',
        payload: { intent: 'SquareHighlight' },
      }),
      mark({ id: 'a2', type: 'square' }),
    ])

    expect(
      screen.getByRole('button', { name: /highlight box/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^rectangle/ }),
    ).toBeInTheDocument()
  })
})
