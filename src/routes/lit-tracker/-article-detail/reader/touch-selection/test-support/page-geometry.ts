import type { PdfPageGeometry, PdfRun } from '@embedpdf/models'

/**
 * A page's text geometry, built from plain strings, for tests.
 *
 * The real thing comes out of the WebAssembly engine — one run per line, each
 * carrying a glyph box per character — so anything that reasons about words,
 * boundaries or glyph rectangles can only be tested against a fixture. This
 * builds one that is regular enough to assert exact coordinates against:
 * monospaced glyphs of a fixed size, laid out left to right from a known
 * origin.
 *
 * **Lives under `test-support/` so the coverage ratchet does not measure it**
 * (see `vitest.config.ts`) — it is scaffolding, and a fixture builder that
 * counts as covered source would quietly inflate the number the ratchet
 * defends.
 */

/** Width of every glyph, in page units. Round, so test arithmetic stays legible. */
export const GLYPH_WIDTH = 10

/** Height of every line, likewise. */
export const LINE_HEIGHT = 12

/** The flag EmbedPDF gives a space — one of the two it treats as a word boundary. */
const SPACE_FLAG = 1

/**
 * The flag it gives a character with no glyph of its own — the other boundary.
 *
 * A line break is one of these, and a fixture without them is not merely
 * simplified but wrong: word expansion walks outward until it meets a boundary,
 * so two lines joined with nothing between them make the last word of one and
 * the first word of the next a single word.
 */
const EMPTY_FLAG = 2

export interface LineSpec {
  text: string
  /** Top of the line, in page coordinates. */
  y: number
  /** Left edge of the first glyph. Defaults to 0. */
  x?: number
}

/**
 * Builds page geometry from one string per line.
 *
 * Character indices run continuously across lines, exactly as the engine
 * numbers them: the first character of the second line follows the *line break*
 * that ends the first. That break is a real index here — a zero-width glyph
 * flagged empty — because the engine emits one and because word expansion
 * depends on it.
 */
export function geometryFrom(lines: LineSpec[]): PdfPageGeometry {
  let charStart = 0

  const runs: PdfRun[] = lines.map(({ text, y, x = 0 }, lineIndex) => {
    const glyphs = [...text].map((character, index) => ({
      x: x + index * GLYPH_WIDTH,
      y,
      width: GLYPH_WIDTH,
      height: LINE_HEIGHT,
      flags: character === ' ' ? SPACE_FLAG : 0,
    }))

    if (lineIndex < lines.length - 1) {
      glyphs.push({
        x: x + text.length * GLYPH_WIDTH,
        y,
        width: 0,
        height: LINE_HEIGHT,
        flags: EMPTY_FLAG,
      })
    }

    const run: PdfRun = {
      rect: {
        x,
        y,
        width: text.length * GLYPH_WIDTH,
        height: LINE_HEIGHT,
      },
      charStart,
      glyphs,
      fontSize: LINE_HEIGHT,
    }

    charStart += glyphs.length
    return run
  })

  return { runs }
}

/**
 * The centre of the glyph at `index`, for pointing at it.
 *
 * Tests aim at the middle of a character rather than its corner, because that
 * is what a finger does and because `glyphAt` resolves an exact hit differently
 * from a tolerance-based near miss.
 */
export function centreOfGlyph(
  geometry: PdfPageGeometry,
  index: number,
): { x: number; y: number } {
  for (const run of geometry.runs) {
    const glyph = run.glyphs[index - run.charStart]
    if (glyph) {
      return {
        x: glyph.x + glyph.width / 2,
        y: glyph.y + glyph.height / 2,
      }
    }
  }

  throw new Error(`no glyph at index ${index} in this fixture`)
}
