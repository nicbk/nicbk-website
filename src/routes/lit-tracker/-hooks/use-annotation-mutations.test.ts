import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnnotationRow } from '~/routes/lit-tracker/-article-detail/reader/annotation-sync/annotation-row'

/**
 * The hook that turns the annotation bridge's decisions into Zero mutations.
 *
 * Two things are asserted here and nowhere else: which mutator each write names
 * with which arguments, and that a refusal reaches the reader instead of
 * disappearing. The mutators themselves are covered against real Postgres in
 * `src/zero/mutators.integration.test.ts`; this is the wiring in front of them,
 * and the bridge that calls it is covered in `annotation-sync.test.ts`.
 */

const mutate = vi.hoisted(() => vi.fn())
const showError = vi.hoisted(() => vi.fn())

vi.mock('@rocicorp/zero/react', () => ({ useZero: () => ({ mutate }) }))
vi.mock('~/routes/-shared/components/toast/use-error-toast', () => ({
  useErrorToast: () => showError,
}))

const { useAnnotationMutations } = await import('./use-annotation-mutations')

const ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-000000000a01'
const MARK = '0199a1b2-c3d4-7e5f-8a9b-000000000a02'

const ROW: AnnotationRow = {
  id: MARK,
  articleId: ARTICLE,
  type: 'highlight',
  pageIndex: 3,
  contents: 'the passage itself',
  payload: { color: '#ffd400' },
}

function accepted() {
  return {
    client: Promise.resolve({ type: 'success' }),
    server: Promise.resolve({ type: 'success' }),
  }
}

function refused(error: { type: 'app' | 'zero'; message: string }) {
  return {
    client: Promise.resolve({ type: 'success' }),
    server: Promise.resolve({ type: 'error', error }),
  }
}

function mutations() {
  return renderHook(() => useAnnotationMutations()).result.current
}

function requested() {
  return mutate.mock.calls.map(([request]) => ({
    name: request.mutator.mutatorName,
    args: request.args,
  }))
}

beforeEach(() => {
  mutate.mockReset()
  showError.mockReset()
  mutate.mockImplementation(accepted)
})

describe('the mutation each write names', () => {
  it('stores a new mark whole', async () => {
    await mutations().create(ROW)

    expect(requested()).toEqual([
      {
        name: 'annotations.create',
        args: {
          id: MARK,
          articleId: ARTICLE,
          type: 'highlight',
          pageIndex: 3,
          contents: 'the passage itself',
          payload: { color: '#ffd400' },
        },
      },
    ])
  })

  it('updates without naming the article or the type', async () => {
    // Neither can change for an existing mark, and a mutator that accepted them
    // would be one that could move a paper's annotation onto another paper.
    await mutations().update(ROW)

    const [call] = requested()
    expect(call?.name).toBe('annotations.update')
    expect(call?.args).toEqual({
      id: MARK,
      pageIndex: 3,
      contents: 'the passage itself',
      payload: { color: '#ffd400' },
    })
  })

  it('deletes by id alone', async () => {
    await mutations().remove(MARK)

    expect(requested()).toEqual([
      { name: 'annotations.delete', args: { id: MARK } },
    ])
  })

  it('sends no id of its own for a new mark', async () => {
    // Every other create on this site mints a UUIDv7. An annotation's id is
    // EmbedPDF's, so that the engine, the row and task 5's list all name a mark
    // the same way (zero-schema-conventions.md's 2026-08-13 revision).
    await mutations().create(ROW)

    expect(requested()[0]?.args.id).toBe(MARK)
  })
})

describe('when the server refuses', () => {
  it('tells the reader rather than letting the mark vanish quietly', async () => {
    // The optimistic copy is already on the paper, and the next sync will take
    // it away. Without this the mark disappears with no explanation at all.
    mutate.mockImplementation(() =>
      refused({
        type: 'app',
        message: 'that item is not available to this account.',
      }),
    )

    await mutations().create(ROW)

    expect(showError).toHaveBeenCalledWith({
      title: 'that did not save',
      message: 'that item is not available to this account.',
    })
  })

  it('does not claim a queued write was lost', async () => {
    // Zero holds a mutation it could not send and applies it when the server
    // returns, so "did not save" would be wrong as well as alarming.
    mutate.mockImplementation(() =>
      refused({ type: 'zero', message: 'fetch failed' }),
    )

    await mutations().remove(MARK)

    expect(showError).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'not saved yet' }),
    )
  })

  it('reports on the server’s answer, not the client’s', async () => {
    // `client` settles as soon as the write is applied locally, which says
    // nothing about whether it was allowed.
    mutate.mockImplementation(() => ({
      client: Promise.resolve({ type: 'success' }),
      server: Promise.resolve({
        type: 'error',
        error: { type: 'app', message: 'nope' },
      }),
    }))

    await mutations().update(ROW)

    expect(showError).toHaveBeenCalledOnce()
  })
})
