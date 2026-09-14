import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TagToggle } from './tag-toggle'

/**
 * The shared tag toggle, and the relationship it has to the headings above it.
 *
 * **What is asserted here is which token each rule takes, not what it looks
 * like.** jsdom resolves no custom properties and lays nothing out, so "the
 * heading is visibly quieter" is a browser question. What a unit test can hold
 * is that the toggle and the two headings that label it take *different*
 * tokens — which is the thing that regresses when somebody edits one of the
 * three files.
 *
 * Reading stylesheets from disk is the established way to do that here
 * (`pdf-reader.test.tsx`, `collection-toolbar.test.tsx`), with the lesson that
 * comes with it: strip comments first, or a comment naming a property satisfies
 * the assertion looking for it.
 */

const TOGGLE_CSS = readFileSync(
  join(__dirname, 'tag-toggle.module.css'),
  'utf8',
)
const RAIL_CSS = readFileSync(
  join(
    __dirname,
    '../../../lit-tracker/-collection-filters/filter-groups.module.css',
  ),
  'utf8',
)
const BLOG_CSS = readFileSync(
  join(
    __dirname,
    '../../../(personal-site)/blog/-list-page/tag-filter/tag-filter.module.css',
  ),
  'utf8',
)

/** The stylesheet with its prose removed, so assertions match code only. */
function code(stylesheet: string): string {
  return stylesheet.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** The declarations of one rule, by selector. */
function declarationsOf(stylesheet: string, selector: string): string {
  const css = code(stylesheet)
  const start = css.indexOf(`\n${selector} {`)
  if (start === -1) {
    throw new Error(`No \`${selector}\` rule in the stylesheet.`)
  }
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
}

describe('a tag toggle against the heading that labels it', () => {
  it('is drawn in full text colour while both headings stay muted', () => {
    /*
     * The regression this task exists for.
     *
     * All three used to take `--color-text-muted`, so on the running page a
     * heading and a resting toggle measured identically — rgb(89, 89, 89), 14px,
     * weight 400 — and "tags" and "read" even came out the same 33.6px wide. A
     * reader could not tell which words did anything. The blog escaped it only
     * because its tags carry a `#`.
     *
     * Both headings are asserted, not just the tracker's, because the toggle is
     * shared and a fix that only held on one surface would mean the component
     * was carrying two intentions.
     */
    expect(declarationsOf(TOGGLE_CSS, '.toggle')).toMatch(
      /color:\s*var\(--color-text\)/,
    )
    expect(declarationsOf(RAIL_CSS, '.groupLabel')).toMatch(
      /color:\s*var\(--color-text-muted\)/,
    )
    expect(declarationsOf(BLOG_CSS, '.heading')).toMatch(
      /color:\s*var\(--color-text-muted\)/,
    )
  })

  it('says nothing about the toggle’s resting colour in a heading rule', () => {
    // The label must not be the thing that moved. `--color-text-muted` is the
    // quietest colour still clearing 4.5:1 (src/styles/contrast.test.ts), and
    // fading a heading past it already failed a light-theme axe scan once.
    expect(declarationsOf(RAIL_CSS, '.groupLabel')).not.toMatch(
      /opacity|--color-text\)/,
    )
    expect(declarationsOf(BLOG_CSS, '.heading')).not.toMatch(
      /opacity|--color-text\)/,
    )
  })
})

describe('the states that keep a selected tag distinguishable', () => {
  it('marks the pressed state by weight as well as colour', () => {
    /*
     * WCAG 1.4.1, and it stopped being belt-and-braces with this task.
     *
     * Against a muted resting state the accent was already a large step;
     * against full text colour the two are one hue apart — #1f1f1f vs #0b57d0
     * in light, #ececec vs #8ab4f8 in dark — so for a reader who does not
     * separate those hues, the weight is the whole signal.
     */
    const pressed = declarationsOf(TOGGLE_CSS, '.toggle[data-pressed]')

    expect(pressed).toMatch(/color:\s*var\(--color-accent\)/)
    expect(pressed).toMatch(/font-weight:\s*var\(--font-weight-bold\)/)
  })

  it('keeps hover behind a hover-capable media query', () => {
    // A touch device latches `:hover` on the last-tapped element and never
    // releases it. Ungated, a just-deselected tag sits in the accent colour —
    // the selected state minus the bold — and reads as still selected.
    const hoverBlock = code(TOGGLE_CSS).match(
      /@media \(hover: hover\) \{[\s\S]*?\n\}/,
    )?.[0]

    expect(hoverBlock).toBeDefined()
    expect(hoverBlock).toMatch(/\.toggle:hover/)
  })
})

describe('TagToggle', () => {
  it('renders a button reporting its pressed state', () => {
    render(
      <TagToggle pressed={true} onPressedChange={vi.fn()}>
        nixos
      </TagToggle>,
    )

    expect(screen.getByRole('button', { name: 'nixos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps the hash out of the name it is announced by', () => {
    // The `#` is drawn by CSS precisely so it stays out of the accessible name
    // and out of anything that copies the text.
    render(
      <TagToggle pressed={false} onPressedChange={vi.fn()} hash>
        nixos
      </TagToggle>,
    )

    const button = screen.getByRole('button', { name: 'nixos' })
    expect(button).toHaveAttribute('data-hash')
    expect(button.textContent).toBe('nixos')
  })
})
