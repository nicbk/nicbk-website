import type { PdfAnnotationObject } from '@embedpdf/models'
import {
  PdfAnnotationSubtype,
  PdfBlendMode,
  webColorToPdfColor,
} from '@embedpdf/models'
import type { AnnotationTool } from '@embedpdf/plugin-annotation'
import { AnnotationPluginPackage } from '@embedpdf/plugin-annotation'
import { describe, expect, it } from 'vitest'
import {
  HIGHLIGHT_BOX_INTENT,
  HIGHLIGHT_BOX_TOOL_ID,
  highlightBoxToolFrom,
} from './highlight-box-tool'

/**
 * The one tool this reader adds to the engine, checked against the engine's own
 * square — which is both its base and the thing it must not be mistaken for.
 *
 * Built from the *installed* plugin's square rather than from a hand-written
 * stand-in, because the whole point of cloning is that the parts not replaced
 * come from EmbedPDF. A stub base would assert that this file copies a fake
 * correctly, which is not a fact anyone needs.
 */

const buildInitialState = AnnotationPluginPackage.initialState as (
  coreState: never,
  config: never,
) => { tools: AnnotationTool<PdfAnnotationObject>[] }

const squareTool = buildInitialState({} as never, {} as never).tools.find(
  (tool) => tool.id === 'square',
) as AnnotationTool<PdfAnnotationObject>

const highlightBox = highlightBoxToolFrom(squareTool)

/**
 * A tool's `defaults` is a union across every annotation type, so TypeScript
 * cannot know which member a generic tool holds. These are the values, read
 * without asking it to — the point of each assertion is what the engine will
 * draw, not which branch of the union the compiler picked.
 */
const highlightBoxDefaults = highlightBox.defaults as Record<string, unknown>
const squareDefaults = squareTool.defaults as Record<string, unknown>

describe('the highlight box', () => {
  it('is its own tool, not a second square', () => {
    expect(squareTool).toBeDefined()
    expect(highlightBox.id).toBe(HIGHLIGHT_BOX_TOOL_ID)
    expect(highlightBox.id).not.toBe(squareTool.id)
  })

  it('keeps the engine’s own drag-to-create handler', () => {
    // The reason this is cloned at runtime at all: the plugin does not export
    // the square's pointer handler, and a tool without one activates and then
    // does nothing when dragged.
    expect(highlightBox.pointerHandler).toBe(squareTool.pointerHandler)
    expect(highlightBox.pointerHandler).toBeDefined()
    expect(highlightBox.transform).toBe(squareTool.transform)
  })

  it('draws a fill the paper shows through', () => {
    // Multiply rather than a half-alpha fill: alpha fades the text under it,
    // multiplying leaves black glyphs black. This is how the engine's own
    // `inkHighlighter` behaves, and the reason the tool is worth having.
    expect(highlightBoxDefaults['blendMode']).toBe(PdfBlendMode.Multiply)
    expect(highlightBoxDefaults['opacity']).toBe(1)
    expect(highlightBoxDefaults['color']).not.toBe('transparent')
  })

  it('draws no outline, unlike the tool it was cloned from', () => {
    // The plain rectangle is a stroke around nothing — useful for circling a
    // figure, and exactly what this is not.
    expect(squareDefaults['color']).toBe('transparent')
    expect(highlightBoxDefaults['strokeWidth']).toBe(0)
  })

  it('gives the engine a stroke colour it can actually parse', () => {
    /*
     * The regression that cost a browser pass. A shape's *interior* may be
     * `'transparent'` — the engine has a branch that clears it — but its stroke
     * may not: that value goes straight to the hex parser below, which throws.
     * The throw happens inside the commit task, so the mark drew, the commit
     * failed, no committed event was emitted, and the sync bridge never saw a
     * creation to write. Nothing on screen or in the console said so.
     *
     * Asserted through the engine's own parser rather than a hex regex of this
     * project's devising, so it is the real rule being checked.
     */
    expect(() =>
      webColorToPdfColor(highlightBoxDefaults['strokeColor'] as string),
    ).not.toThrow()
    expect(() =>
      webColorToPdfColor(highlightBoxDefaults['color'] as string),
    ).not.toThrow()
    expect(() => webColorToPdfColor('transparent')).toThrow()
  })

  it('marks what it draws, so a reload can tell the two apart', () => {
    expect(highlightBoxDefaults['intent']).toBe(HIGHLIGHT_BOX_INTENT)
    expect(highlightBoxDefaults['type']).toBe(PdfAnnotationSubtype.SQUARE)
  })

  it('claims a stored highlight box more strongly than the square does', () => {
    // Both match a SQUARE. The more specific match has to win, or a stored
    // highlight box resolves to the opaque tool and is offered its behaviour.
    const stored = {
      type: PdfAnnotationSubtype.SQUARE,
      intent: HIGHLIGHT_BOX_INTENT,
    } as PdfAnnotationObject

    expect(highlightBox.matchScore(stored)).toBeGreaterThan(
      squareTool.matchScore(stored),
    )
  })

  it('claims nothing else', () => {
    const plainSquare = {
      type: PdfAnnotationSubtype.SQUARE,
    } as PdfAnnotationObject
    const ink = {
      type: PdfAnnotationSubtype.INK,
      intent: HIGHLIGHT_BOX_INTENT,
    } as PdfAnnotationObject

    expect(highlightBox.matchScore(plainSquare)).toBe(0)
    expect(highlightBox.matchScore(ink)).toBe(0)
  })
})
