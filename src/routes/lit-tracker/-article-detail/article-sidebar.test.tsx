import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '~/routes/-shared/components/toast/toaster'

/**
 * The article's sidebar: which tabs it has, that switching works, and that each
 * panel edits the right thing.
 *
 * The Citations tab is the one tab that is not the sidebar's own: it swaps the
 * page's main area, so it is selected exactly when `view` says so, and choosing
 * it or leaving it asks the page to change view. Selecting the Annotations tab
 * must not.
 */

const useQuery = vi.hoisted(() => vi.fn())
const mutate = vi.hoisted(() =>
  vi.fn(() => ({
    client: Promise.resolve({ type: 'success' }),
    server: Promise.resolve({ type: 'success' }),
  })),
)
vi.mock('@rocicorp/zero/react', () => ({
  useQuery,
  useZero: () => ({ mutate }),
}))

const { ArticleSidebar } = await import('./article-sidebar')
const { ReaderJumpProvider, useRegisterReaderJump } = await import(
  './reader-jump'
)

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

const ARTICLE = {
  id: ARTICLE_ID,
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }],
  publicationYear: 2017,
  venue: 'NeurIPS',
  status: 'reading',
  notes: 'the one everything else cites',
}

const ATTENTION_TAG = { id: 'tag-1', name: 'attention' }
const SURVEY_TAG = { id: 'tag-2', name: 'survey' }

function answerQueries(
  answers: Partial<
    Record<
      | 'articles.byId'
      | 'tags.mine'
      | 'articleTags.mine'
      | 'annotations.forArticle',
      unknown[]
    >
  >,
  details: { type: string } = { type: 'complete' },
) {
  useQuery.mockImplementation((request: { query?: { queryName?: string } }) => {
    const name = request?.query?.queryName ?? ''
    return [answers[name as keyof typeof answers] ?? [], details]
  })
}

const onViewChange = vi.fn()

function renderSidebar(view: 'reader' | 'citations' = 'reader') {
  return render(
    <Toaster>
      <ArticleSidebar
        articleId={ARTICLE_ID}
        view={view}
        onViewChange={onViewChange}
      />
    </Toaster>,
  )
}

beforeEach(() => {
  useQuery.mockReset()
  mutate.mockClear()
  onViewChange.mockClear()
})

describe('ArticleSidebar', () => {
  it('has exactly the tabs whose contents exist', () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'tags',
      'notes',
      'citations',
      'annotations',
    ])
  })

  it('names every tab independently of its visible word', () => {
    // In the rail the word is hidden and only the glyph is drawn (a container
    // query jsdom cannot exercise), so the accessible name must not depend on
    // the word being visible — the label carries it in both states, and the
    // title gives pointer users the same word as a tooltip.
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveAttribute('aria-label', tab.getAttribute('title'))
      expect(tab.getAttribute('aria-label')).not.toBe('')
    }
  })

  describe('the Citations tab', () => {
    it('asks for the citations view when chosen', async () => {
      answerQueries({ 'articles.byId': [ARTICLE] })
      renderSidebar()

      await userEvent.click(screen.getByRole('tab', { name: 'citations' }))

      expect(onViewChange).toHaveBeenCalledExactlyOnceWith('citations')
    })

    it('is selected whenever the page shows citations', () => {
      // Reloading `?view=citations`, or the other copy of the sidebar choosing
      // it: this copy must agree without having been clicked.
      answerQueries({ 'articles.byId': [ARTICLE] })
      renderSidebar('citations')

      expect(screen.getByRole('tab', { name: 'citations' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    it('brings the reader back when another tab is chosen, and opens that tab', async () => {
      answerQueries({ 'articles.byId': [ARTICLE] })
      const { rerender } = renderSidebar('citations')

      await userEvent.click(screen.getByRole('tab', { name: 'notes' }))
      expect(onViewChange).toHaveBeenCalledExactlyOnceWith('reader')

      rerender(
        <Toaster>
          <ArticleSidebar
            articleId={ARTICLE_ID}
            view="reader"
            onViewChange={onViewChange}
          />
        </Toaster>,
      )
      expect(screen.getByRole('tab', { name: 'notes' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    it('does not change the view when switching between the sidebar’s own tabs', async () => {
      answerQueries({ 'articles.byId': [ARTICLE] })
      renderSidebar()

      await userEvent.click(screen.getByRole('tab', { name: 'notes' }))
      await userEvent.click(screen.getByRole('tab', { name: 'annotations' }))

      expect(onViewChange).not.toHaveBeenCalled()
    })

    it('opens the next paper on the default tab', async () => {
      // Following a citation lands on another article's sidebar, which must not
      // carry over whichever tab the last paper had open.
      const OTHER_ID = '018f5b6c-0000-7000-8000-000000000002'
      answerQueries({
        'articles.byId': [ARTICLE],
      })
      const { rerender } = renderSidebar()
      await userEvent.click(screen.getByRole('tab', { name: 'notes' }))

      rerender(
        <Toaster>
          <ArticleSidebar
            articleId={OTHER_ID}
            view="reader"
            onViewChange={onViewChange}
          />
        </Toaster>,
      )

      expect(screen.getByRole('tab', { name: 'tags' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  })

  it('opens on the tags tab', () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    expect(screen.getByRole('tab', { name: 'tags' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('switches tabs by click', async () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    await userEvent.click(screen.getByRole('tab', { name: 'notes' }))

    expect(screen.getByRole('textbox', { name: 'notes' })).toBeInTheDocument()
  })

  it('switches tabs by keyboard, on activation rather than on focus', async () => {
    // A tab list promises arrow-key navigation; a row of buttons that only
    // responds to clicks is a tab list that lied about what it is.
    //
    // **Manual activation**, and the two assertions here are what pin it: arrow
    // moves focus without selecting, and Enter selects. It is the model this
    // list keeps because the Citations tab swaps the main content — see
    // `article-sidebar.tsx`.
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    screen.getByRole('tab', { name: 'tags' }).focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'notes' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'notes' })).toHaveAttribute(
      'aria-selected',
      'false',
    )

    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('tab', { name: 'notes' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('shows this article’s tags ticked and the rest not', () => {
    answerQueries({
      'articles.byId': [ARTICLE],
      'tags.mine': [ATTENTION_TAG, SURVEY_TAG],
      'articleTags.mine': [{ articleId: ARTICLE_ID, tagId: ATTENTION_TAG.id }],
    })
    renderSidebar()

    expect(screen.getByRole('checkbox', { name: /attention/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /survey/ })).not.toBeChecked()
  })

  it('shows the article’s reading status as the pressed one', () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    // The decided model renders reading status among the tags, as a tag — so it
    // is here rather than in a control of its own.
    expect(screen.getByRole('button', { name: 'reading' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('writes a status change through the shared mutator', async () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    await userEvent.click(screen.getByRole('button', { name: 'read' }))

    await waitFor(() => expect(mutate).toHaveBeenCalled())
  })

  it('applies a tag the article does not carry', async () => {
    answerQueries({
      'articles.byId': [ARTICLE],
      'tags.mine': [ATTENTION_TAG, SURVEY_TAG],
      'articleTags.mine': [{ articleId: ARTICLE_ID, tagId: ATTENTION_TAG.id }],
    })
    renderSidebar()

    await userEvent.click(screen.getByRole('checkbox', { name: /survey/ }))

    // One write: attach. The tag already exists, so nothing is created.
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
  })

  it('removes a tag the article already carries', async () => {
    // The other half of the same callback, and the half that would be missed by
    // a test that only ever ticks boxes.
    answerQueries({
      'articles.byId': [ARTICLE],
      'tags.mine': [ATTENTION_TAG],
      'articleTags.mine': [{ articleId: ARTICLE_ID, tagId: ATTENTION_TAG.id }],
    })
    renderSidebar()

    await userEvent.click(screen.getByRole('checkbox', { name: /attention/ }))

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
  })

  it('creates and applies a tag that does not exist yet', async () => {
    // Two writes, deliberately: create then attach. This is what makes the tag
    // field the only place tags are made — there is no "manage tags" screen to
    // visit first.
    answerQueries({ 'articles.byId': [ARTICLE], 'tags.mine': [] })
    renderSidebar()

    await userEvent.type(
      screen.getByRole('textbox', { name: 'tags' }),
      'diffusion{Enter}',
    )

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2))
  })

  it('shows the article’s stored notes', async () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    await userEvent.click(screen.getByRole('tab', { name: 'notes' }))

    expect(screen.getByRole('textbox', { name: 'notes' })).toHaveValue(
      ARTICLE.notes,
    )
  })

  it('does not write a note on every keystroke', async () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    await userEvent.click(screen.getByRole('tab', { name: 'notes' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'notes' }), {
      target: { value: 'half a thou' },
    })

    expect(mutate).not.toHaveBeenCalled()
  })

  it('lists this article’s marks under the annotations tab', async () => {
    answerQueries({
      'articles.byId': [ARTICLE],
      'annotations.forArticle': [
        {
          id: 'a1',
          type: 'ink',
          pageIndex: 3,
          contents: null,
          payload: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    })
    renderSidebar()

    await userEvent.click(screen.getByRole('tab', { name: 'annotations' }))

    expect(
      screen.getByRole('list', { name: 'marks on this paper' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /freehand/ })).toHaveTextContent(
      'p. 4',
    )
  })

  it('steers the reader from a row, without swapping anything', async () => {
    // The whole channel, end to end: the row's click crosses the jump context
    // to whatever the reader registered (`reader-jump.tsx`) — and that is *all*
    // it does. The reader stand-in staying mounted is the decided contrast with
    // #10's Citations tab, which will swap the main content on purpose.
    const handle = vi.fn()
    function ReaderStandIn() {
      useRegisterReaderJump(handle)
      return <div data-testid="reader" />
    }

    answerQueries({
      'articles.byId': [ARTICLE],
      'annotations.forArticle': [
        {
          id: 'a1',
          type: 'ink',
          pageIndex: 3,
          contents: null,
          payload: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    })
    render(
      <Toaster>
        <ReaderJumpProvider>
          <ReaderStandIn />
          <ArticleSidebar
            articleId={ARTICLE_ID}
            view="reader"
            onViewChange={onViewChange}
          />
        </ReaderJumpProvider>
      </Toaster>,
    )

    await userEvent.click(screen.getByRole('tab', { name: 'annotations' }))
    await userEvent.click(screen.getByRole('button', { name: /freehand/ }))

    expect(handle).toHaveBeenCalledWith(3)
    expect(screen.getByTestId('reader')).toBeInTheDocument()
    expect(onViewChange).not.toHaveBeenCalled()
  })

  it('renders nothing until the article has arrived', () => {
    // Controls that write to an id whose ownership has not been confirmed yet,
    // and an empty tag list that would flash on every cold load.
    answerQueries({}, { type: 'unknown' })
    const { container } = renderSidebar()

    expect(container).toBeEmptyDOMElement()
  })
})
