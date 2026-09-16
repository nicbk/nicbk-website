import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { AnnotationCapability } from '@embedpdf/plugin-annotation'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ResolvedTool } from './margin-text-box'
import { MARGIN_FONT_SIZE, marginTextBoxFrom } from './margin-text-box'
import { useMarginTextBox } from './use-margin-text-box'

/**
 * When the text box is replaced, and — the part that matters — when it is left
 * alone. Replacing a tool the reader is holding would take it out of their hand
 * mid-mark, so the effect has to be able to tell a resized tool from a fresh
 * one.
 */

function engineTextBox(): ResolvedTool {
  return {
    id: 'freeText',
    defaults: {
      type: PdfAnnotationSubtype.FREETEXT,
      fontSize: 14,
      fontColor: '#E44234',
    },
    clickBehavior: {
      enabled: true,
      defaultSize: { width: 100, height: 20 },
    },
  } as unknown as ResolvedTool
}

function capability(tool: ResolvedTool | undefined) {
  const addTool = vi.fn()
  const annotations = {
    getTool: vi.fn(() => tool),
    addTool,
  } as unknown as AnnotationCapability
  return { annotations, addTool }
}

describe('useMarginTextBox', () => {
  it('replaces the engine’s text box with the margin-sized one', () => {
    const { annotations, addTool } = capability(engineTextBox())

    renderHook(() => useMarginTextBox(annotations))

    expect(addTool).toHaveBeenCalledTimes(1)
    const replacement = addTool.mock.calls[0]?.[0] as ResolvedTool
    const defaults = replacement.defaults as { fontSize?: number }
    expect(defaults.fontSize).toBe(MARGIN_FONT_SIZE)
  })

  it('leaves an already-resized tool alone, however often it runs', () => {
    const { annotations, addTool } = capability(
      marginTextBoxFrom(engineTextBox()),
    )

    const { rerender } = renderHook(() => useMarginTextBox(annotations))
    rerender()

    expect(addTool).not.toHaveBeenCalled()
  })

  it('does nothing before the plugin is mounted', () => {
    const { addTool } = capability(engineTextBox())

    renderHook(() => useMarginTextBox(null))

    expect(addTool).not.toHaveBeenCalled()
  })

  it('does nothing if the engine has no text box to resize', () => {
    const { annotations, addTool } = capability(undefined)

    renderHook(() => useMarginTextBox(annotations))

    expect(addTool).not.toHaveBeenCalled()
  })
})
