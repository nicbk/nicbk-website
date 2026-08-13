import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '~/routes/-shared/components/toast/toaster'

/**
 * The article's sidebar: which tabs it has, that switching works, and that each
 * panel edits the right thing.
 *
 * Two assertions here are deliberately about what is *absent*. There is no
 * Citations tab — that is #10, and a disabled or empty one would be a promise
 * this page cannot keep — and selecting the Annotations tab (task 5) must not
 * swap the main content. #10 will invert the first of those on purpose.
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
    Record<'articles.byId' | 'tags.mine' | 'articleTags.mine', unknown[]>
  >,
  details: { type: string } = { type: 'complete' },
) {
  useQuery.mockImplementation((request: { query?: { queryName?: string } }) => {
    const name = request?.query?.queryName ?? ''
    return [answers[name as keyof typeof answers] ?? [], details]
  })
}

function renderSidebar() {
  return render(
    <Toaster>
      <ArticleSidebar articleId={ARTICLE_ID} />
    </Toaster>,
  )
}

beforeEach(() => {
  useQuery.mockReset()
  mutate.mockClear()
})

describe('ArticleSidebar', () => {
  it('has exactly the tabs whose contents exist', () => {
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['tags', 'notes'])
  })

  it('renders no Citations tab', () => {
    // #10's, and it arrives with the citation graph it opens. Not disabled, not
    // empty — absent. This assertion is meant to be inverted by that feature.
    answerQueries({ 'articles.byId': [ARTICLE] })
    renderSidebar()

    expect(screen.queryByRole('tab', { name: /citation/i })).toBeNull()
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
    // list keeps once #10's Citations tab swaps the main content for a citation
    // graph — see `article-sidebar.tsx`.
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

  it('renders nothing until the article has arrived', () => {
    // Controls that write to an id whose ownership has not been confirmed yet,
    // and an empty tag list that would flash on every cold load.
    answerQueries({}, { type: 'unknown' })
    const { container } = renderSidebar()

    expect(container).toBeEmptyDOMElement()
  })
})
