import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeaderRow } from './header-row'

/**
 * The row both headers are made of.
 *
 * **What this file can and cannot prove.** jsdom lays nothing out — every
 * rectangle it reports is zero — so no test here can measure that the two
 * headers are the same height, which is the thing this component exists to
 * guarantee. What it can prove is that they take their height from the *same
 * declaration*, which is the property that makes the pixels follow. The pixels
 * themselves are checked in a browser, in two engines, and the numbers are
 * recorded in features/one-header-row.
 *
 * Reading the stylesheets from disk is the established way to assert that here
 * (`pdf-reader.test.tsx`, `collection-toolbar.test.tsx`), along with the lesson
 * that comes with it: strip comments first, or a comment explaining a property
 * satisfies the assertion looking for it.
 */

const HEADER_ROW_CSS = readFileSync(
  join(__dirname, 'header-row.module.css'),
  'utf8',
)
const SITE_HEADER_CSS = readFileSync(
  join(__dirname, '../site-header/site-header.module.css'),
  'utf8',
)
const TRACKER_HEADER_CSS = readFileSync(
  join(
    __dirname,
    '../../../lit-tracker/-components/lit-tracker-header/lit-tracker-header.module.css',
  ),
  'utf8',
)

/** The stylesheet with its prose removed, so assertions match code only. */
function code(stylesheet: string): string {
  return stylesheet.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** The property names a rule declares, sorted. */
function propertiesOf(stylesheet: string, selector: string): string[] {
  const css = code(stylesheet)
  const start = css.indexOf(`\n${selector} {`)
  if (start === -1) {
    throw new Error(`No \`${selector}\` rule in the stylesheet.`)
  }
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return body
    .split(';')
    .map((declaration) => declaration.split(':')[0]?.trim() ?? '')
    .filter(Boolean)
    .sort()
}

describe('HeaderRow', () => {
  it('renders one header landmark holding its items in order', () => {
    render(
      <HeaderRow>
        <span>first</span>
        <span>second</span>
      </HeaderRow>,
    )

    const banners = screen.getAllByRole('banner')
    expect(banners).toHaveLength(1)
    expect(banners[0]?.textContent).toBe('firstsecond')
  })

  it('keeps its own row class when a caller adds a positioning one', () => {
    // The site header passes its sticky class. Both must land on the element:
    // the caller's placement, and the row that makes it the same height as
    // every other header on the site.
    render(<HeaderRow className="placed">items</HeaderRow>)

    const banner = screen.getByRole('banner')
    expect(banner).toHaveClass('placed')
    expect(banner.className.split(' ').length).toBe(2)
  })

  it('is a complete row with no className at all', () => {
    // The tracker's case: its placement belongs to LitTrackerShell, so it
    // passes nothing. It must still get the row.
    render(<HeaderRow>items</HeaderRow>)

    expect(screen.getByRole('banner').className).toBeTruthy()
  })
})

describe('where the header row’s height comes from', () => {
  /*
   * The regression this whole feature is.
   *
   * The two headers used to declare their own `padding-block`, and each summed
   * it with whatever its tallest item happened to be: 58.59px on the personal
   * site, 57.00px in the tracker. Nothing said they should agree, and the
   * difference was visible to the user who reported it. The fix is that exactly
   * one file declares the row.
   */
  it('declares the height once, as a floor rather than a fixed size', () => {
    const row = propertiesOf(HEADER_ROW_CSS, '.row')

    expect(row).toContain('min-height')
    // `height` would clip a control that outgrew the row instead of growing;
    // the failure mode should be an ugly tall row, not a cropped avatar.
    expect(row).not.toContain('height')
  })

  it('gives the two headers no way to set a height of their own', () => {
    // The test that fails when someone "just adjusts the padding" on one
    // header — which is precisely how the 1px arrived.
    expect(propertiesOf(SITE_HEADER_CSS, '.header')).toStrictEqual([
      'position',
      'top',
      'z-index',
    ])
    expect(code(TRACKER_HEADER_CSS)).not.toMatch(/\n\.header\s*[{,]/)
  })
})

describe('where the header row sits', () => {
  it('is not the row’s decision', () => {
    /*
     * The one thing the two headers genuinely do not share. The site header is
     * `position: sticky` on a page that scrolls as one unit; the tracker's is
     * the fixed top edge of a shell whose document never scrolls at all. A row
     * that positioned itself would have to know which one it was in, and would
     * then be a variant rather than a shared row.
     */
    expect(code(HEADER_ROW_CSS)).not.toMatch(/\bposition\s*:/)
  })

  it('leaves the site header sticky, above the page and below the overlays', () => {
    const header = code(SITE_HEADER_CSS)

    expect(header).toMatch(/position:\s*sticky\b/)
    expect(header).toMatch(/top:\s*0\b/)
    // 1 on purpose: above page content scrolling beneath, below the skip link
    // (10) and the toaster (100).
    expect(header).toMatch(/z-index:\s*1\b/)
  })
})
