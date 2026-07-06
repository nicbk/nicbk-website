import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Authoring-time WCAG 2.2 AA contrast audit of the color token palettes in
 * colors.css — both themes independently, per
 * research/accessibility/color-contrast-and-focus-visibility.md:
 *
 * - text on any surface: ≥ 4.5:1 (SC 1.4.3)
 * - non-text UI (borders) against surfaces: ≥ 3:1 (SC 1.4.11)
 * - focus indicator against surfaces: ≥ 3:1 (SC 2.4.11)
 *
 * Runtime contrast of rendered pages is additionally covered by axe in e2e
 * once pages exist; this test keeps the palette itself from ever drifting
 * below the bar.
 */

const colorsCss = readFileSync(join(__dirname, 'colors.css'), 'utf8')

/** Extracts `--token: #hex` pairs from the block following a theme selector
 * (quote-style-agnostic, so formatter changes can't break the lookup). */
function tokensForSelector(themeName: string): Record<string, string> {
  const selector = new RegExp(`:root\\[data-theme=["']${themeName}["']\\]`)
  const start = colorsCss.search(selector)
  if (start === -1) {
    throw new Error(`Theme selector not found in colors.css: ${themeName}`)
  }
  const block = colorsCss.slice(
    colorsCss.indexOf('{', start) + 1,
    colorsCss.indexOf('}', start),
  )
  const tokens: Record<string, string> = {}
  for (const match of block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    const [, name, value] = match
    if (name !== undefined && value !== undefined) {
      tokens[name] = value
    }
  }
  return tokens
}

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (hi + 0.05) / (lo + 0.05)
}

const THEMES = {
  light: tokensForSelector('light'),
  dark: tokensForSelector('dark'),
}

const SURFACES = ['--color-bg', '--color-bg-surface'] as const
const TEXT_TOKENS = [
  '--color-text',
  '--color-text-muted',
  '--color-accent',
] as const
const NON_TEXT_TOKENS = ['--color-border', '--color-focus-ring'] as const

describe.each(Object.entries(THEMES))('%s theme palette', (_theme, tokens) => {
  function token(name: string): string {
    const value = tokens[name]
    if (value === undefined) {
      throw new Error(`Token missing from palette: ${name}`)
    }
    return value
  }

  it.each(
    TEXT_TOKENS.flatMap((text) => SURFACES.map((surface) => [text, surface])),
  )('text %s on %s meets 4.5:1', (text, surface) => {
    expect(contrast(token(text), token(surface))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(
    NON_TEXT_TOKENS.flatMap((ui) => SURFACES.map((surface) => [ui, surface])),
  )('non-text %s on %s meets 3:1', (ui, surface) => {
    expect(contrast(token(ui), token(surface))).toBeGreaterThanOrEqual(3)
  })
})
