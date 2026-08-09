import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The hook that turns a card's callbacks into Zero mutations.
 *
 * Three things live here that live nowhere else, and each is the reason for a
 * group below: which mutator a given UI action names, **which promise the
 * outcome is read from**, and what a reader is told when it fails. The mutators
 * themselves are covered against real Postgres in
 * `src/zero/mutators.integration.test.ts`; this is about the wiring in front of
 * them.
 */

const mutate = vi.hoisted(() => vi.fn())
const showError = vi.hoisted(() => vi.fn())

vi.mock('@rocicorp/zero/react', () => ({ useZero: () => ({ mutate }) }))
vi.mock('~/routes/-shared/components/toast/use-error-toast', () => ({
  useErrorToast: () => showError,
}))

const { useCollectionMutations, timeOrderedId } = await import(
  './use-collection-mutations'
)

const ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-000000000a01'
const TAG = '0199a1b2-c3d4-7e5f-8a9b-000000000a02'

/** A mutation that the server accepted. */
function accepted() {
  return {
    client: Promise.resolve({ type: 'success' }),
    server: Promise.resolve({ type: 'success' }),
  }
}

/** A mutation the server answered, with the given error. */
function refused(error: { type: 'app' | 'zero'; message: string }) {
  return {
    client: Promise.resolve({ type: 'success' }),
    server: Promise.resolve({ type: 'error', error }),
  }
}

function mutations() {
  return renderHook(() => useCollectionMutations()).result.current
}

/** What each call to `zero.mutate` was asked to do: the name, and the args. */
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

describe('the mutation each action names', () => {
  it('sets a status', async () => {
    await mutations().setStatus(ARTICLE, 'reading')

    expect(requested()).toEqual([
      { name: 'articles.setStatus', args: { id: ARTICLE, status: 'reading' } },
    ])
  })

  it('applies a tag, generating the join row’s id', async () => {
    await mutations().applyTag(ARTICLE, TAG)

    const [call] = requested()
    expect(call?.name).toBe('tags.attach')
    expect(call?.args).toMatchObject({ articleId: ARTICLE, tagId: TAG })
    expect(call?.args.id).toMatch(UUID_V7)
  })

  it('removes a tag by the pair, not by the join row’s id', async () => {
    // The card knows an article and a tag; the row joining them is an
    // implementation detail it has no reason to have kept.
    await mutations().removeTag(ARTICLE, TAG)

    expect(requested()).toEqual([
      { name: 'tags.detach', args: { articleId: ARTICLE, tagId: TAG } },
    ])
  })

  it('deletes a tag', async () => {
    await mutations().deleteTag(TAG)

    expect(requested()).toEqual([{ name: 'tags.delete', args: { id: TAG } }])
  })

  it('creates a tag and applies it, as two mutations against one new id', async () => {
    // Two writes rather than a bespoke "create and attach" mutator, which would
    // need its own authorization path for a case these two already cover. What
    // matters is that the attach names the tag the create just made.
    await mutations().createAndApplyTag(ARTICLE, 'transformers')

    const [create, attach] = requested()
    expect(create?.name).toBe('tags.create')
    expect(create?.args).toMatchObject({ name: 'transformers' })
    expect(attach?.name).toBe('tags.attach')
    expect(attach?.args).toMatchObject({
      articleId: ARTICLE,
      tagId: create?.args.id,
    })
    // …and the join row is a different row from the tag.
    expect(attach?.args.id).not.toBe(create?.args.id)
  })
})

describe('which answer is waited for', () => {
  it('reports nothing while only the optimistic half has settled', async () => {
    // The distinction this hook exists for. `client` settles as soon as the
    // write hits the local store, which says nothing about whether it was
    // allowed — reading it would call a refused write a success.
    let refuse: (outcome: unknown) => void = () => {}
    mutate.mockImplementation(() => ({
      client: Promise.resolve({ type: 'success' }),
      server: new Promise((resolve) => {
        refuse = resolve
      }),
    }))

    const pending = mutations().setStatus(ARTICLE, 'read')
    await Promise.resolve()
    expect(showError).not.toHaveBeenCalled()

    refuse({ type: 'error', error: { type: 'app', message: 'no' } })
    await pending

    expect(showError).toHaveBeenCalledTimes(1)
  })

  it('waits for every mutation of a multi-write action', async () => {
    // An un-awaited `server` promise that rejects is an unhandled rejection, so
    // the second write is awaited even once the first has already failed.
    mutate
      .mockImplementationOnce(() =>
        refused({ type: 'app', message: 'first failed' }),
      )
      .mockImplementationOnce(() => ({
        client: Promise.resolve({ type: 'success' }),
        server: Promise.reject(new Error('second exploded')),
      }))

    await mutations().createAndApplyTag(ARTICLE, 'transformers')

    // One toast, not two, and no unhandled rejection from the second.
    expect(showError).toHaveBeenCalledTimes(1)
  })
})

describe('what the reader is told', () => {
  it('passes a mutator’s own refusal through, because it was written to be read', async () => {
    mutate.mockImplementation(() =>
      refused({
        type: 'app',
        message: 'that item is not available to this account.',
      }),
    )

    await mutations().deleteTag(TAG)

    expect(showError).toHaveBeenCalledWith({
      title: 'that did not save',
      message: 'that item is not available to this account.',
    })
  })

  it('does not repeat Zero’s wording, or claim a queued write failed', async () => {
    // Both halves were wrong in the first version, and the browser showed it:
    // the description was "Fetch from API server threw error: fetch failed",
    // and the title said the change had not saved — when Zero had queued it and
    // applied it the moment the server came back.
    mutate.mockImplementation(() =>
      refused({
        type: 'zero',
        message: 'Fetch from API server threw error: fetch failed',
      }),
    )

    await mutations().setStatus(ARTICLE, 'read')

    expect(showError).toHaveBeenCalledWith({
      title: 'not saved yet',
      message: expect.stringContaining('queued'),
    })
    expect(showError).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Fetch') }),
    )
  })

  it('says the same thing when the request never produced an outcome at all', async () => {
    mutate.mockImplementation(() => ({
      client: Promise.resolve({ type: 'success' }),
      server: Promise.reject(new Error('offline')),
    }))

    await mutations().applyTag(ARTICLE, TAG)

    expect(showError).toHaveBeenCalledWith({
      title: 'not saved yet',
      message: expect.stringContaining('queued'),
    })
  })

  it('says nothing when the server accepted the write', async () => {
    await mutations().setStatus(ARTICLE, 'reading')

    expect(showError).not.toHaveBeenCalled()
  })

  it('never rethrows, so an event handler has nothing to catch', async () => {
    mutate.mockImplementation(() => ({
      client: Promise.resolve({ type: 'success' }),
      server: Promise.reject(new Error('offline')),
    }))

    await expect(mutations().deleteTag(TAG)).resolves.toBeUndefined()
  })
})

/** Version 7 in the third group, RFC 4122 variant in the fourth. */
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('timeOrderedId', () => {
  it('is a valid version 7 UUID', () => {
    expect(timeOrderedId()).toMatch(UUID_V7)
  })

  it('sorts in creation order', async () => {
    // The whole reason it is not `crypto.randomUUID()`, which is a v4: these
    // become primary keys, and a random one fragments the index as the table
    // grows (research/data-modeling/zero-schema-conventions.md).
    const first = timeOrderedId()
    await waitFor(() => {
      expect(timeOrderedId() > first).toBe(true)
    })
  })

  it('is unique within a single millisecond', () => {
    // Uniqueness rests on the 74 random bits, not on the clock — two rows
    // created by one click share a timestamp.
    const ids = new Set(Array.from({ length: 500 }, () => timeOrderedId()))

    expect(ids.size).toBe(500)
  })
})
