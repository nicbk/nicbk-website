import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { UploadJobRow } from './job-list'

/**
 * Zero and the mutations hook are mocked because the real ones need a mounted
 * client. Only the tests that open the edit modal reach them at all — a row
 * with no article renders no control, so the cases that predate this feature
 * never mount the dialog.
 */
const useQuery = vi.hoisted(() => vi.fn(() => [[], { type: 'complete' }]))
const updateDetails = vi.hoisted(() => vi.fn(async () => null))

vi.mock('@rocicorp/zero/react', () => ({ useQuery, useZero: () => ({}) }))
vi.mock('~/routes/lit-tracker/-hooks/use-article-mutations', () => ({
  useArticleMutations: () => ({ updateDetails }),
}))

const { UploadStatus } = await import('./upload-status')

const ARTICLE = '018f5b6c-0000-7000-8000-000000000001'
const OTHER_ARTICLE = '018f5b6c-0000-7000-8000-000000000002'

/**
 * Answers `articles.byId` with whichever of these the request names.
 *
 * Which id was asked for is read out of the serialized request rather than out
 * of a known field, so this does not depend on where Zero happens to keep a
 * query's arguments — only on the id reaching the query at all, which is the
 * thing under test.
 */
function answerWithArticles(articles: { id: string; title: string }[]) {
  useQuery.mockImplementation((request: { query?: { queryName?: string } }) => {
    if (request?.query?.queryName !== 'articles.byId') {
      return [[], { type: 'complete' }]
    }
    const asked = JSON.stringify(request)
    return [
      articles
        .filter((article) => asked.includes(article.id))
        .map((article) => ({
          ...article,
          authors: [],
          publicationYear: null,
          venue: null,
          doi: null,
        })),
      { type: 'complete' },
    ]
  })
}

function job(overrides: Partial<UploadJobRow> = {}): UploadJobRow {
  return {
    id: 'job-1',
    filename: 'paper.pdf',
    status: 'processing',
    failureReason: null,
    articleId: null,
    ...overrides,
  }
}

describe('UploadStatus', () => {
  it('shows the synced state as a non-clickable checkmark', async () => {
    render(<UploadStatus jobs={[]} />)

    // Not merely "disabled": there is no button at all, because a control that
    // does nothing when activated is worse than no control.
    expect(screen.queryByRole('button')).toBeNull()
    expect(
      screen.getByRole('img', { name: 'All articles synced' }),
    ).toBeInTheDocument()
  })

  it('does not claim the page status region', () => {
    // The collection's loading placeholder is the page's `role="status"`. A
    // second one here announced itself unprompted and made that one ambiguous.
    render(<UploadStatus jobs={[]} />)

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('exposes the synced tooltip on hover', async () => {
    const user = userEvent.setup()
    render(<UploadStatus jobs={[]} />)

    await user.hover(screen.getByRole('img', { name: 'All articles synced' }))

    expect(await screen.findAllByText('All articles synced')).not.toHaveLength(
      0,
    )
  })

  it('opens the job list from the in-progress state', async () => {
    const user = userEvent.setup()
    render(<UploadStatus jobs={[job({ filename: 'quantum.pdf' })]} />)

    const trigger = screen.getByRole('button', { name: 'Uploads in progress' })
    await user.click(trigger)

    const list = await screen.findByRole('list', { name: 'Uploads' })
    expect(within(list).getByText('quantum.pdf')).toBeInTheDocument()
  })

  it('names the failed state in words, not by color alone', async () => {
    render(
      <UploadStatus jobs={[job({ status: 'failed', failureReason: 'x' })]} />,
    )

    expect(
      screen.getByRole('button', { name: 'Some uploads need attention' }),
    ).toBeInTheDocument()
  })

  it('shows a failure reason and a progress indicator on the right rows', async () => {
    const user = userEvent.setup()
    render(
      <UploadStatus
        jobs={[
          job({ id: 'a', filename: 'ok.pdf' }),
          job({
            id: 'b',
            filename: 'broken.pdf',
            status: 'failed',
            failureReason: "couldn't find authors",
          }),
        ]}
      />,
    )

    await user.click(screen.getByRole('button'))
    const list = await screen.findByRole('list', { name: 'Uploads' })

    expect(within(list).getByText("couldn't find authors")).toBeInTheDocument()
    // The in-progress row, and only it, carries the progress indicator.
    const bars = within(list).getAllByRole('progressbar')
    expect(bars).toHaveLength(1)
    expect(bars[0]).toHaveAccessibleName('Extracting ok.pdf')
  })

  it('renders multiple failures as multiple flat rows', async () => {
    const user = userEvent.setup()
    render(
      <UploadStatus
        jobs={[
          job({
            id: 'a',
            filename: 'one.pdf',
            status: 'failed',
            failureReason: 'no title',
          }),
          job({
            id: 'b',
            filename: 'two.pdf',
            status: 'failed',
            failureReason: 'no authors',
          }),
          job({
            id: 'c',
            filename: 'three.pdf',
            status: 'failed',
            failureReason: 'unreadable',
          }),
        ]}
      />,
    )

    await user.click(screen.getByRole('button'))
    const list = await screen.findByRole('list', { name: 'Uploads' })

    // No grouping and no summary — the decided behaviour is one row each.
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('falls back to a generic reason when a failed job carries none', async () => {
    const user = userEvent.setup()
    render(<UploadStatus jobs={[job({ status: 'failed' })]} />)

    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('Extraction failed.')).toBeInTheDocument()
  })
})

/** A failed row, with the article behind it that a fix would open. */
function failed(overrides: Partial<UploadJobRow> = {}): UploadJobRow {
  return job({
    status: 'failed',
    failureReason: 'no authors found',
    articleId: ARTICLE,
    ...overrides,
  })
}

describe('UploadStatus — resolving a failure', () => {
  it('names the fix control for the upload it opens', async () => {
    const user = userEvent.setup()
    answerWithArticles([{ id: ARTICLE, title: 'Attention Is All You Need' }])
    render(<UploadStatus jobs={[failed({ filename: 'broken.pdf' })]} />)

    await user.click(screen.getByRole('button'))

    // Twenty failed rows must not be twenty buttons called "fix" to anyone
    // listening rather than looking.
    expect(
      await screen.findByRole('button', { name: 'fix broken.pdf' }),
    ).toBeInTheDocument()
  })

  it('offers no fix control on a row with no article behind it', async () => {
    const user = userEvent.setup()
    render(<UploadStatus jobs={[failed({ articleId: null })]} />)

    await user.click(screen.getByRole('button'))
    await screen.findByRole('list', { name: 'Uploads' })

    // Unreachable in practice — every `recordOutcome` path writes the article
    // and the link together — but a control that cannot open anything is worse
    // than no control.
    expect(screen.queryByRole('button', { name: /^fix/ })).toBeNull()
  })

  it('opens the modal on the article behind the row that was pressed', async () => {
    const user = userEvent.setup()
    answerWithArticles([
      { id: ARTICLE, title: 'The First Paper' },
      { id: OTHER_ARTICLE, title: 'The Second Paper' },
    ])
    render(
      <UploadStatus
        jobs={[
          failed({ id: 'a', filename: 'one.pdf', articleId: ARTICLE }),
          failed({ id: 'b', filename: 'two.pdf', articleId: OTHER_ARTICLE }),
        ]}
      />,
    )

    await user.click(screen.getByRole('button'))
    await user.click(await screen.findByRole('button', { name: 'fix two.pdf' }))

    // The dialog snapshots the row it was opened on, so the title field is
    // what proves the right article arrived.
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByDisplayValue('The Second Paper')).toBeVisible()
  })

  it('saves the correction against the article the row named', async () => {
    const user = userEvent.setup()
    updateDetails.mockClear()
    answerWithArticles([
      { id: ARTICLE, title: 'one.pdf' },
      { id: OTHER_ARTICLE, title: 'The Second Paper' },
    ])
    render(
      <UploadStatus
        jobs={[
          failed({ id: 'a', filename: 'one.pdf', articleId: ARTICLE }),
          failed({ id: 'b', filename: 'two.pdf', articleId: OTHER_ARTICLE }),
        ]}
      />,
    )

    await user.click(screen.getByRole('button'))
    await user.click(await screen.findByRole('button', { name: 'fix one.pdf' }))
    const dialog = await screen.findByRole('dialog')

    // What a failed extraction really leaves: a filename for a title and no
    // authors. Both have to be supplied before this will save at all.
    await user.clear(within(dialog).getByDisplayValue('one.pdf'))
    await user.type(
      within(dialog).getByRole('textbox', { name: 'title' }),
      'Attention Is All You Need',
    )
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Author 1' }),
      'Ashish Vaswani',
    )
    await user.click(within(dialog).getByRole('button', { name: 'save' }))

    // The id matters more than the values: two failed rows are open to be
    // fixed, and the correction must land on the one that was pressed.
    await waitFor(() => {
      expect(updateDetails).toHaveBeenCalledWith(ARTICLE, {
        title: 'Attention Is All You Need',
        authors: [{ name: 'Ashish Vaswani' }],
        publicationYear: null,
        venue: null,
        doi: null,
      })
    })
  })

  it('closes the popup on the way into the modal', async () => {
    const user = userEvent.setup()
    answerWithArticles([{ id: ARTICLE, title: 'The First Paper' }])
    render(<UploadStatus jobs={[failed({ filename: 'one.pdf' })]} />)

    await user.click(screen.getByRole('button'))
    await user.click(await screen.findByRole('button', { name: 'fix one.pdf' }))

    await screen.findByRole('dialog')
    // Two stacked overlays read as two live surfaces at once.
    await waitFor(() => {
      expect(screen.queryByRole('list', { name: 'Uploads' })).toBeNull()
    })
  })

  it('leaves focus somewhere real when resolving removes the control it came from', async () => {
    const user = userEvent.setup()
    answerWithArticles([{ id: ARTICLE, title: 'The First Paper' }])
    const { rerender } = render(
      <UploadStatus jobs={[failed({ filename: 'one.pdf' })]} />,
    )

    await user.click(screen.getByRole('button'))
    await user.click(await screen.findByRole('button', { name: 'fix one.pdf' }))
    const dialog = await screen.findByRole('dialog')

    // What a successful save does: the job row retires, so the warning button
    // this was opened from is replaced by the checkmark. Focus must not fall
    // to the document body at the exact moment the reader succeeded.
    rerender(<UploadStatus jobs={[]} />)
    await user.click(within(dialog).getByRole('button', { name: 'cancel' }))

    const synced = screen.getByRole('img', { name: 'All articles synced' })
    await waitFor(() => {
      expect(document.activeElement).toBe(synced)
    })
  })

  it('opens nothing when the article behind the row has gone', async () => {
    const user = userEvent.setup()
    // Deleted from another tab between opening the popup and pressing "fix" —
    // the query comes back empty, and there is nothing to correct.
    answerWithArticles([])
    render(<UploadStatus jobs={[failed({ filename: 'one.pdf' })]} />)

    await user.click(screen.getByRole('button'))
    await user.click(await screen.findByRole('button', { name: 'fix one.pdf' }))

    await waitFor(() => {
      expect(screen.queryByRole('list', { name: 'Uploads' })).toBeNull()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the checkmark out of the tab order even though it can take focus', () => {
    render(<UploadStatus jobs={[]} />)

    // `tabIndex={-1}` is what lets the dialog hand focus back; it must not turn
    // a deliberate non-control into a tab stop.
    expect(
      screen.getByRole('img', { name: 'All articles synced' }),
    ).toHaveAttribute('tabindex', '-1')
  })
})
