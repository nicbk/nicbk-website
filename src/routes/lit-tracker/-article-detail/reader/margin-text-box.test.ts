import { PdfAnnotationSubtype } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import type { ResolvedTool } from './margin-text-box'
import {
  isMarginSized,
  MARGIN_BOX_HEIGHT,
  MARGIN_BOX_WIDTH,
  MARGIN_FONT_SIZE,
  marginTextBoxFrom,
} from './margin-text-box'

/**
 * The text box, sized for a margin: what differs from the engine's own tool,
 * and — just as much — what does not. The plugin replaces a tool wholesale, so
 * everything this does not change has to survive the clone.
 */

/** The engine's `freeText`, as its source declares it. */
function engineTextBox(): ResolvedTool {
  return {
    id: 'freeText',
    name: 'Free Text',
    interaction: { exclusive: false, cursor: 'crosshair' },
    defaults: {
      type: PdfAnnotationSubtype.FREETEXT,
      contents: 'Insert text',
      fontSize: 14,
      fontColor: '#E44234',
      textAlign: 0,
      verticalAlign: 0,
      color: 'transparent',
      opacity: 1,
    },
    clickBehavior: {
      enabled: true,
      defaultSize: { width: 100, height: 20 },
      defaultContent: 'Insert text',
    },
  } as unknown as ResolvedTool
}

/** The fields of a text box tool this file reads back. */
interface TextBoxDefaults {
  type?: number
  contents?: string
  fontSize?: number
  fontColor?: string
  color?: string
  opacity?: number
}

interface TextBoxClickBehavior {
  enabled?: boolean
  defaultSize?: { width: number; height: number }
  defaultContent?: string
}

/** The tool's defaults, read the way the engine writes them. */
function defaultsOf(tool: ResolvedTool): TextBoxDefaults {
  return tool.defaults as TextBoxDefaults
}

function clickBehaviorOf(tool: ResolvedTool): TextBoxClickBehavior {
  return tool.clickBehavior as unknown as TextBoxClickBehavior
}

describe('marginTextBoxFrom', () => {
  it('writes at the size a margin note is written at', () => {
    // 8pt: under the 8.6–9.8pt these papers set their body text in, so a note
    // reads as the reader's own hand.
    const tool = marginTextBoxFrom(engineTextBox())

    expect(defaultsOf(tool).fontSize).toBe(MARGIN_FONT_SIZE)
    expect(MARGIN_FONT_SIZE).toBeLessThan(8.6)
  })

  it('gives a click a box that fits a one-inch margin', () => {
    const tool = marginTextBoxFrom(engineTextBox())

    expect(clickBehaviorOf(tool).defaultSize).toEqual({
      width: MARGIN_BOX_WIDTH,
      height: MARGIN_BOX_HEIGHT,
    })
    // The narrower of the two margins measured. The engine's 100pt hung 28pt
    // into the text block of an ACL paper.
    expect(MARGIN_BOX_WIDTH).toBeLessThanOrEqual(72)
  })

  it('holds four lines, because the box does not grow with what is typed', () => {
    // The editor draws the text in a span of the annotation's own height with
    // `overflow: hidden` and `line-height: 1.18`, so anything past the box is
    // invisible until it is resized.
    expect(MARGIN_BOX_HEIGHT).toBeGreaterThanOrEqual(
      4 * MARGIN_FONT_SIZE * 1.18,
    )
  })

  it('keeps everything about the tool that is not a decision here', () => {
    // The plugin replaces a tool by id rather than merging into it, so a clone
    // that dropped these would take the red, the prompt and the subtype with
    // it — leaving a tool that makes an unreadable, untyped mark.
    const tool = marginTextBoxFrom(engineTextBox())
    const defaults = defaultsOf(tool)

    expect(defaults.fontColor).toBe('#E44234')
    expect(defaults.contents).toBe('Insert text')
    expect(defaults.type).toBe(PdfAnnotationSubtype.FREETEXT)
    expect(defaults.color).toBe('transparent')
    expect(defaults.opacity).toBe(1)
    expect(tool.id).toBe('freeText')
    expect(tool.name).toBe('Free Text')
    expect(tool.interaction).toEqual(engineTextBox().interaction)
  })

  it('keeps click creation on, and what a new box says', () => {
    const tool = marginTextBoxFrom(engineTextBox())
    const click = clickBehaviorOf(tool)

    expect(click.enabled).toBe(true)
    expect(click.defaultContent).toBe('Insert text')
  })
})

describe('isMarginSized', () => {
  it('is false for the engine’s own tool', () => {
    expect(isMarginSized(engineTextBox())).toBe(false)
  })

  it('is true once the tool has been replaced', () => {
    expect(isMarginSized(marginTextBoxFrom(engineTextBox()))).toBe(true)
  })

  it('is false for a tool that has the size but not the box', () => {
    // Both are checked because both are the change: a half-applied tool would
    // otherwise be left in place by the effect that guards on this.
    const halfway = marginTextBoxFrom(engineTextBox())
    const tool = {
      ...halfway,
      clickBehavior: { enabled: true, defaultSize: { width: 100, height: 20 } },
    } as unknown as ResolvedTool

    expect(isMarginSized(tool)).toBe(false)
  })
})
