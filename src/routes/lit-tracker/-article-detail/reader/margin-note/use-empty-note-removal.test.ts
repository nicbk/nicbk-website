import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { marginNoteFrom } from './margin-note'
import { useEmptyNoteRemoval } from './use-empty-note-removal'

const note = marginNoteFrom({
  defaults: {},
  id: 'note-1',
  pageIndex: 3,
  rect: { origin: { x: 0, y: 0 }, size: { width: 72, height: 40 } },
  highlightId: 'highlight-1',
  created: new Date(0),
})

function scopeWithEvents() {
  let listener: ((event: unknown) => void) | null = null
  const scope = {
    onAnnotationEvent: (fn: (event: unknown) => void) => {
      listener = fn
      return () => {
        listener = null
      }
    },
    deleteAnnotation: vi.fn(),
  }
  return {
    scope,
    emit: (event: unknown) => listener?.(event),
  }
}

function update(annotation: unknown, contents: string, committed = false) {
  return {
    type: 'update',
    annotation,
    pageIndex: 3,
    patch: { contents },
    committed,
  }
}

describe('useEmptyNoteRemoval', () => {
  it('removes a margin note saved with nothing in it', () => {
    const { scope, emit } = scopeWithEvents()
    renderHook(() => useEmptyNoteRemoval(scope as never))
    emit(update(note, '  \n'))
    expect(scope.deleteAnnotation).toHaveBeenCalledWith(3, 'note-1')
  })

  it('keeps a margin note with words in it', () => {
    const { scope, emit } = scopeWithEvents()
    renderHook(() => useEmptyNoteRemoval(scope as never))
    emit(update(note, 'check this'))
    expect(scope.deleteAnnotation).not.toHaveBeenCalled()
  })

  // A text box placed by hand keeps its behaviour, empty or not.
  it('leaves an ordinary text box alone', () => {
    const { scope, emit } = scopeWithEvents()
    renderHook(() => useEmptyNoteRemoval(scope as never))
    const { inReplyToId: _, ...byHand } = note
    emit(update(byHand, ''))
    expect(scope.deleteAnnotation).not.toHaveBeenCalled()
  })

  // Each change is reported twice, as made and as committed; acting on one.
  it('acts once, on the change as made', () => {
    const { scope, emit } = scopeWithEvents()
    renderHook(() => useEmptyNoteRemoval(scope as never))
    emit(update(note, '', true))
    expect(scope.deleteAnnotation).not.toHaveBeenCalled()
  })

  it('ignores updates that do not touch the text — a move, say', () => {
    const { scope, emit } = scopeWithEvents()
    renderHook(() => useEmptyNoteRemoval(scope as never))
    emit({
      type: 'update',
      annotation: note,
      pageIndex: 3,
      patch: { rect: {} },
      committed: false,
    })
    expect(scope.deleteAnnotation).not.toHaveBeenCalled()
  })

  it('waits for the plugin before listening', () => {
    expect(() => renderHook(() => useEmptyNoteRemoval(null))).not.toThrow()
  })
})
