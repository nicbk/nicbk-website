import type { PdfAnnotationObject } from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { AnnotationEvent } from '@embedpdf/plugin-annotation'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SyncedAnnotation } from './annotation-row'

/**
 * The wiring, with both sides faked: a scope that reports events on demand and a
 * query that returns whatever rows a test wants.
 *
 * `annotation-sync.ts` decides *what* should happen and is tested on its own.
 * What is left here is the part that only exists once the two are connected —
 * **ordering**. The record of what the engine and the database agree on is
 * updated before the action that will be echoed back, and the test that proves
 * it is the one where importing a stored mark produces no write at all. Get that
 * wrong and every open of a paper rewrites every mark on it, with nothing
 * visibly broken.
 */

const scope = vi.hoisted(() => ({
  importAnnotations: vi.fn(),
  updateAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
  onAnnotationEvent: vi.fn(),
}))
const query = vi.hoisted(() => ({
  current: { rows: [] as unknown[], details: { type: 'complete' } },
}))
/*
 * Each write resolves, because the hook chains off it: a settled write is what
 * releases the mark to follow sync again, so a mock returning `undefined` would
 * not just fail — it would misrepresent the thing being tested.
 */
const mutations = vi.hoisted(() => ({
  create: vi.fn((_row: unknown) => Promise.resolve()),
  update: vi.fn((_row: unknown) => Promise.resolve()),
  remove: vi.fn((_id: string) => Promise.resolve()),
}))

vi.mock('@embedpdf/plugin-annotation/react', () => ({
  useAnnotation: () => ({ state: {}, provides: scope }),
}))
vi.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [query.current.rows, query.current.details],
}))
vi.mock('~/routes/lit-tracker/-hooks/use-annotation-mutations', () => ({
  useAnnotationMutations: () => mutations,
}))
vi.mock('~/auth/auth-client', () => ({
  authClient: { useSession: () => ({ data: { user: { name: 'nicolás' } } }) },
}))

const { useAnnotationSync } = await import('./use-annotation-sync')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'
const RECT = { origin: { x: 0, y: 0 }, size: { width: 10, height: 10 } }

const ROW: SyncedAnnotation = {
  id: 'a1',
  type: 'highlight',
  pageIndex: 2,
  contents: null,
  payload: { rect: RECT, color: '#ffd400' },
  createdAt: 1,
  updatedAt: 1,
}

/** The engine object the reader would build for `ROW`. */
const MARK = {
  id: 'a1',
  type: PdfAnnotationSubtype.HIGHLIGHT,
  pageIndex: 2,
  rect: RECT,
  color: '#ffd400',
} as PdfAnnotationObject

/** Whatever handler the hook subscribed with, so a test can drive the engine. */
let emit: (event: AnnotationEvent) => void

function committed(
  type: 'create' | 'update' | 'delete',
  annotation: PdfAnnotationObject,
): AnnotationEvent {
  return {
    type,
    documentId: ARTICLE_ID,
    annotation,
    pageIndex: annotation.pageIndex,
    patch: {},
    committed: true,
  } as AnnotationEvent
}

function mount(rows: SyncedAnnotation[], type = 'complete') {
  query.current = { rows, details: { type } }
  return renderHook(() => useAnnotationSync(ARTICLE_ID))
}

beforeEach(() => {
  vi.clearAllMocks()
  scope.onAnnotationEvent.mockImplementation(
    (handler: (event: AnnotationEvent) => void) => {
      emit = handler
      return () => {}
    },
  )
})

describe('what sync delivers', () => {
  it('puts a paper’s stored marks on it', async () => {
    mount([ROW])

    expect(scope.importAnnotations).toHaveBeenCalledOnce()
    const [[items]] = scope.importAnnotations.mock.calls as [
      [{ annotation: PdfAnnotationObject }[]],
    ]
    expect(items[0]?.annotation).toMatchObject({
      id: 'a1',
      type: PdfAnnotationSubtype.HIGHLIGHT,
      pageIndex: 2,
      // Filled in from the row and from the session, not read from storage.
      author: 'nicolás',
    })
  })

  it('waits for the first round trip before touching the engine', () => {
    // An empty result that has not finished syncing says nothing at all. Acting
    // on it would take off the paper every mark this client had just made.
    mount([], 'unknown')

    expect(scope.importAnnotations).not.toHaveBeenCalled()
    expect(scope.deleteAnnotation).not.toHaveBeenCalled()
  })

  it('takes off a mark another window deleted', () => {
    const view = mount([ROW])
    query.current = { rows: [], details: { type: 'complete' } }
    view.rerender()

    expect(scope.deleteAnnotation).toHaveBeenCalledWith(2, 'a1')
  })

  it('replaces a mark another window edited', () => {
    const view = mount([ROW])
    query.current = {
      rows: [{ ...ROW, contents: 'edited elsewhere', updatedAt: 2 }],
      details: { type: 'complete' },
    }
    view.rerender()

    expect(scope.updateAnnotation).toHaveBeenCalledWith(
      2,
      'a1',
      expect.objectContaining({ contents: 'edited elsewhere' }),
    )
  })
})

describe('what the engine reports', () => {
  it('stores a mark the reader just made', () => {
    mount([])

    emit(committed('create', MARK))

    expect(mutations.create).toHaveBeenCalledOnce()
    expect(mutations.create.mock.calls[0]?.[0]).toMatchObject({
      id: 'a1',
      articleId: ARTICLE_ID,
      type: 'highlight',
      pageIndex: 2,
    })
  })

  it('does not write back the marks it has just imported', () => {
    // The whole reason this hook keeps a record. `importAnnotations` dispatches
    // a create per item and then commits, so the engine reports every restored
    // mark as a committed creation — and without the record, opening a paper
    // would rewrite every mark on it, every time.
    mount([ROW])

    emit(committed('create', MARK))

    expect(mutations.create).not.toHaveBeenCalled()
    expect(mutations.update).not.toHaveBeenCalled()
  })

  it('writes a real edit of a mark it knows', () => {
    mount([ROW])

    emit(
      committed('update', {
        ...MARK,
        contents: 'a thought',
      } as PdfAnnotationObject),
    )

    expect(mutations.update).toHaveBeenCalledOnce()
  })

  it('deletes a mark it stored, and forgets it', () => {
    const view = mount([ROW])

    emit(committed('delete', MARK))
    expect(mutations.remove).toHaveBeenCalledWith('a1')

    // Forgotten, so the row's own disappearance from sync is not then replayed
    // into the engine as a second removal.
    query.current = { rows: [], details: { type: 'complete' } }
    view.rerender()
    expect(scope.deleteAnnotation).not.toHaveBeenCalled()
  })

  it('ignores an annotation the PDF itself carried', () => {
    mount([])

    emit(
      committed('create', {
        id: 'link-1',
        type: PdfAnnotationSubtype.LINK,
        pageIndex: 0,
        rect: RECT,
      } as PdfAnnotationObject),
    )

    expect(mutations.create).not.toHaveBeenCalled()
  })
})

describe('changing paper', () => {
  it('starts the record again rather than carrying it over', () => {
    // Otherwise the new article's first delivery of rows is compared against the
    // old article's record: marks it already has are skipped as "applied", and
    // the old paper's marks are taken off a document that never had them.
    const view = renderHook(({ articleId }) => useAnnotationSync(articleId), {
      initialProps: { articleId: ARTICLE_ID },
    })
    expect(scope.importAnnotations).not.toHaveBeenCalled()

    query.current = { rows: [ROW], details: { type: 'complete' } }
    view.rerender({ articleId: '018f5b6c-0000-7000-8000-000000000002' })

    expect(scope.importAnnotations).toHaveBeenCalledOnce()
    expect(scope.deleteAnnotation).not.toHaveBeenCalled()
  })
})
