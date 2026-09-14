import type { PdfLinkTarget } from '@embedpdf/models'
import { PdfActionType, PdfZoomMode } from '@embedpdf/models'
import { isCategoryLocked, LockModeType } from '@embedpdf/plugin-annotation'
import { describe, expect, it } from 'vitest'
import {
  LINK_CATEGORY,
  LINK_LOCK,
  LINK_TOOL_OVERRIDE,
  linkClickAction,
} from './link-annotations'
import { createReaderPlugins } from './reader-plugins'

/** The categories EmbedPDF 2.15.0 gives its markup tools — and its link tool. */
const MARKUP_TOOL_CATEGORIES = ['annotation', 'markup']
const SHAPE_TOOL_CATEGORIES = ['annotation', 'shape']

function annotationConfig() {
  const registration = createReaderPlugins(
    '01930000-0000-7000-8000-000000000001',
  ).find(
    (plugin) =>
      (plugin as unknown as { package: { manifest: { id: string } } }).package
        .manifest.id === 'annotation',
  ) as unknown as {
    config: {
      tools?: { id: string; categories?: string[] }[]
      locked?: unknown
      autoOpenLinks?: boolean
    }
  }
  return registration.config
}

describe('the link lock', () => {
  it('locks the link tool once it carries its own category', () => {
    expect(isCategoryLocked(LINK_TOOL_OVERRIDE.categories, LINK_LOCK)).toBe(
      true,
    )
  })

  it('leaves every mark a reader makes unlocked', () => {
    // The trap: the default link tool is categorised exactly like the
    // highlighter, so a lock on its default categories would lock every mark.
    expect(isCategoryLocked(MARKUP_TOOL_CATEGORIES, LINK_LOCK)).toBe(false)
    expect(isCategoryLocked(SHAPE_TOOL_CATEGORIES, LINK_LOCK)).toBe(false)
  })

  it('would lock the marks too, if the link kept its default categories', () => {
    // What the override is for, stated as the failure it prevents.
    expect(
      isCategoryLocked(MARKUP_TOOL_CATEGORIES, {
        type: LockModeType.Include,
        categories: MARKUP_TOOL_CATEGORIES,
      }),
    ).toBe(true)
  })

  it('names a category no default tool carries', () => {
    expect([...MARKUP_TOOL_CATEGORIES, ...SHAPE_TOOL_CATEGORIES]).not.toContain(
      LINK_CATEGORY,
    )
  })

  it('is what the reader registers, with the library’s URL opener off', () => {
    const config = annotationConfig()

    expect(config.tools).toContainEqual(LINK_TOOL_OVERRIDE)
    expect(config.locked).toEqual(LINK_LOCK)
    expect(config.autoOpenLinks).toBe(false)
  })
})

const DESTINATION = {
  pageIndex: 11,
  zoom: { mode: PdfZoomMode.XYZ, params: { x: 108, y: 453, zoom: 0 } },
  view: [],
} as const

function uri(address: string): PdfLinkTarget {
  return { type: 'action', action: { type: PdfActionType.URI, uri: address } }
}

describe('linkClickAction', () => {
  it('copies a URL', () => {
    expect(
      linkClickAction(uri('https://github.com/tensorflow/tensor2tensor')),
    ).toEqual({
      kind: 'copy',
      text: 'https://github.com/tensorflow/tensor2tensor',
    })
  })

  it('copies a mailto link’s address alone', () => {
    expect(
      linkClickAction(uri('mailto:someone%40example.com?subject=hi')),
    ).toEqual({
      kind: 'copy',
      text: 'someone@example.com',
    })
  })

  it('keeps an address it cannot decode as written', () => {
    expect(linkClickAction(uri('mailto:a%zz@example.com'))).toEqual({
      kind: 'copy',
      text: 'a%zz@example.com',
    })
  })

  it('does nothing for an empty URL or an empty mailto', () => {
    expect(linkClickAction(uri('  '))).toEqual({ kind: 'none' })
    expect(linkClickAction(uri('mailto:'))).toEqual({ kind: 'none' })
  })

  it('treats a destination in this document as internal', () => {
    expect(
      linkClickAction({
        type: 'destination',
        destination: { ...DESTINATION, view: [] },
      }),
    ).toEqual({ kind: 'internal' })
    expect(
      linkClickAction({
        type: 'action',
        action: {
          type: PdfActionType.Goto,
          destination: { ...DESTINATION, view: [] },
        },
      }),
    ).toEqual({ kind: 'internal' })
  })

  it('does not follow a link with no target, into another file, or to a program', () => {
    expect(linkClickAction(undefined)).toEqual({ kind: 'none' })
    expect(
      linkClickAction({
        type: 'action',
        action: {
          type: PdfActionType.RemoteGoto,
          destination: { ...DESTINATION, view: [] },
        },
      }),
    ).toEqual({ kind: 'none' })
    expect(
      linkClickAction({
        type: 'action',
        action: { type: PdfActionType.LaunchAppOrOpenFile, path: '/bin/sh' },
      }),
    ).toEqual({ kind: 'none' })
    expect(
      linkClickAction({
        type: 'action',
        action: { type: PdfActionType.Unsupported },
      }),
    ).toEqual({ kind: 'none' })
  })
})
