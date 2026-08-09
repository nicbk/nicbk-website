import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The wired half of the filters: which queries it asks for, what it tells the
 * confirmation, and what it does once the reader confirms.
 *
 * `useQuery` and `useZero` are mocked because the real ones need a mounted Zero
 * client — a WebSocket, IndexedDB, and a running zero-cache — and the router is
 * stubbed because the selection lives in search params. What the list *draws* is
 * `filter-groups`' own coverage; what a confirmed delete does to Postgres is
 * task 2's integration suite.
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

const search = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useSearch: () => search.current,
    useNavigate: () => navigate,
  }),
}))

const { CollectionFilters } = await import('./collection-filters')
const { Toaster } = await import('~/routes/-shared/components/toast/toaster')

const RLHF = { id: 'tag-1', name: 'rlhf' }
const TRANSFORMERS = { id: 'tag-2', name: 'transformers' }

/**
 * Answers the two queries by name rather than by call order, so a test can say
 * what one of them returns without knowing where it sits in the component.
 */
function answerQueries(answers: { tags?: unknown[]; articleTags?: unknown[] }) {
  useQuery.mockImplementation((request: { query?: { queryName?: string } }) => {
    const name = request?.query?.queryName ?? ''
    if (name === 'tags.mine') {
      return [answers.tags ?? [], { type: 'complete' }]
    }
    return [answers.articleTags ?? [], { type: 'complete' }]
  })
}

/** Inside the toast provider, which the real page is always inside. */
function renderFilters() {
  return render(
    <Toaster>
      <CollectionFilters />
    </Toaster>,
  )
}

/** The search object the last navigation asked for. */
function navigatedSearch() {
  const call = navigate.mock.calls.at(-1)?.[0] as {
    search: (prev: Record<string, unknown>) => unknown
  }
  return call.search(search.current)
}

beforeEach(() => {
  search.current = {}
  navigate.mockClear()
  mutate.mockClear()
})

describe('CollectionFilters', () => {
  it('lists the tags the query syncs', () => {
    answerQueries({ tags: [RLHF, TRANSFORMERS] })
    renderFilters()

    expect(screen.getByRole('button', { name: 'rlhf' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'transformers' }),
    ).toBeInTheDocument()
  })

  it('reflects the URL’s selection as the pressed state', () => {
    search.current = { tags: ['rlhf'] }
    answerQueries({ tags: [RLHF, TRANSFORMERS] })
    renderFilters()

    expect(screen.getByRole('button', { name: 'rlhf' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('tells the confirmation how many articles carry the tag', async () => {
    // Counted from the join rows already synced for the card chips, rather than
    // asked of the database.
    const user = userEvent.setup()
    answerQueries({
      tags: [RLHF],
      articleTags: [{ tagId: 'tag-1' }, { tagId: 'tag-1' }, { tagId: 'tag-2' }],
    })
    renderFilters()

    await user.click(screen.getByRole('button', { name: 'edit tags' }))
    await user.click(screen.getByRole('button', { name: 'Delete tag rlhf' }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'it will be removed from 2 articles.',
    )
  })

  it('writes nothing until the confirmation is answered', async () => {
    const user = userEvent.setup()
    answerQueries({ tags: [RLHF] })
    renderFilters()

    await user.click(screen.getByRole('button', { name: 'edit tags' }))
    await user.click(screen.getByRole('button', { name: 'Delete tag rlhf' }))

    expect(mutate).not.toHaveBeenCalled()
  })

  it('deletes the tag once confirmed', async () => {
    const user = userEvent.setup()
    answerQueries({ tags: [RLHF] })
    renderFilters()

    await user.click(screen.getByRole('button', { name: 'edit tags' }))
    await user.click(screen.getByRole('button', { name: 'Delete tag rlhf' }))
    await user.click(screen.getByRole('button', { name: 'delete tag' }))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('drops a deleted tag from the active filter, leaving no dead end', async () => {
    // Otherwise its name stays in the URL, still narrowing the collection, with
    // no toggle left in the rail to switch it off.
    const user = userEvent.setup()
    search.current = { tags: ['rlhf'] }
    answerQueries({ tags: [RLHF] })
    renderFilters()

    await user.click(screen.getByRole('button', { name: 'edit tags' }))
    await user.click(screen.getByRole('button', { name: 'Delete tag rlhf' }))
    await user.click(screen.getByRole('button', { name: 'delete tag' }))

    expect(navigatedSearch()).toEqual({})
  })

  it('leaves both the tag and the filter alone when cancelled', async () => {
    const user = userEvent.setup()
    search.current = { tags: ['rlhf'] }
    answerQueries({ tags: [RLHF] })
    renderFilters()

    await user.click(screen.getByRole('button', { name: 'edit tags' }))
    await user.click(screen.getByRole('button', { name: 'Delete tag rlhf' }))
    await user.click(screen.getByRole('button', { name: 'cancel' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'rlhf' })).toBeInTheDocument()
  })

  it('navigates when a tag is toggled', async () => {
    const user = userEvent.setup()
    answerQueries({ tags: [RLHF] })
    renderFilters()

    await user.click(screen.getByRole('button', { name: 'rlhf' }))

    expect(navigatedSearch()).toEqual({ tags: ['rlhf'] })
  })

  it('navigates when a reading status is toggled', async () => {
    const user = userEvent.setup()
    answerQueries({ tags: [] })
    renderFilters()

    await user.click(
      screen.getByRole('button', { name: 'only articles marked reading' }),
    )

    expect(navigatedSearch()).toEqual({ status: 'reading' })
  })
})
