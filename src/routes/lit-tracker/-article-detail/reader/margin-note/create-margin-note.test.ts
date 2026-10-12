import { AnnotationPlugin } from '@embedpdf/plugin-annotation'
import { describe, expect, it, vi } from 'vitest'
import {
  createMarginNote,
  opensForTyping,
  PLUGIN_CREATE_ARITY,
} from './create-margin-note'
import { marginNoteFrom } from './margin-note'

const note = marginNoteFrom({
  defaults: {},
  id: 'note-1',
  pageIndex: 0,
  rect: { origin: { x: 0, y: 0 }, size: { width: 72, height: 40 } },
  highlightId: 'highlight-1',
  created: new Date(0),
})

describe('the plugin method a margin note relies on', () => {
  // The pin: if an upgrade reshapes it, this fails before a reader finds the
  // note arriving closed.
  it('is present on the installed plugin, in the shape relied on', () => {
    // Private in the typings, which is exactly why it is pinned here.
    const method = (
      AnnotationPlugin.prototype as unknown as { createAnnotation: unknown }
    ).createAnnotation
    expect(typeof method).toBe('function')
    expect((method as () => void).length).toBe(PLUGIN_CREATE_ARITY)
  })
})

describe('createMarginNote', () => {
  it('creates the note open for typing through the plugin', () => {
    const plugin = {
      createAnnotation: vi.fn(
        (
          _page: number,
          _note: unknown,
          _ctx: unknown,
          _doc: string,
          _o: unknown,
        ) => undefined,
      ),
    }
    const scope = { createAnnotation: vi.fn() }

    expect(opensForTyping(plugin)).toBe(true)
    expect(createMarginNote({ plugin, scope, documentId: 'doc', note })).toBe(
      true,
    )
    expect(plugin.createAnnotation).toHaveBeenCalledWith(
      0,
      note,
      undefined,
      'doc',
      {
        editAfterCreate: true,
      },
    )
    expect(scope.createAnnotation).not.toHaveBeenCalled()
  })

  it('still makes the note, closed, if the plugin is not as expected', () => {
    const scope = { createAnnotation: vi.fn() }
    expect(
      createMarginNote({
        plugin: { createAnnotation: () => {} },
        scope,
        documentId: 'doc',
        note,
      }),
    ).toBe(false)
    expect(scope.createAnnotation).toHaveBeenCalledWith(0, note)
  })
})
