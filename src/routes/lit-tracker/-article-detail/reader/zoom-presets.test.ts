import { ZoomMode } from '@embedpdf/plugin-zoom'
import { describe, expect, it } from 'vitest'
import { formatZoomPercent, ZOOM_PRESETS } from './zoom-presets'

describe('formatZoomPercent', () => {
  it('writes a scale factor as whole percent', () => {
    expect(formatZoomPercent(1)).toBe('100%')
    expect(formatZoomPercent(0.5)).toBe('50%')
    expect(formatZoomPercent(4)).toBe('400%')
  })

  it('rounds, because a fitted zoom is never a round number', () => {
    // What "fit width" actually resolves to in a panel of arbitrary width. A
    // figure that changed by a decimal on every resize would read as jitter.
    expect(formatZoomPercent(1.6934)).toBe('169%')
    expect(formatZoomPercent(0.6149)).toBe('61%')
  })
})

describe('ZOOM_PRESETS', () => {
  it('leads with the two fitting modes', () => {
    // They are the ones worth choosing deliberately: a paper in a panel whose
    // width changes with the sidebar wants "fit width" far more often than it
    // wants exactly 150%.
    expect(ZOOM_PRESETS.slice(0, 2).map((preset) => preset.level)).toEqual([
      ZoomMode.FitWidth,
      ZoomMode.FitPage,
    ])
  })

  it('offers fixed levels in ascending order', () => {
    const fixed = ZOOM_PRESETS.map((preset) => preset.level).filter(
      (level): level is number => typeof level === 'number',
    )

    expect(fixed).toEqual([...fixed].sort((a, b) => a - b))
    expect(fixed).toContain(1)
  })

  it('labels every fixed level with the percentage it is', () => {
    // The menu's labels and the trigger's readout must agree, or picking "150%"
    // shows something else.
    for (const preset of ZOOM_PRESETS) {
      if (typeof preset.level === 'number') {
        expect(preset.label).toBe(formatZoomPercent(preset.level))
      }
    }
  })

  it('keeps every level distinct, so the menu cannot show two ticks', () => {
    // The radio group compares by `String(level)`, which is what makes `1` and
    // `'1'` the same selection — and what a duplicate here would break.
    const keys = ZOOM_PRESETS.map((preset) => String(preset.level))

    expect(new Set(keys).size).toBe(keys.length)
  })
})
