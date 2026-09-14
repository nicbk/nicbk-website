import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Type sizing that only matters on a small screen, asserted across every
 * stylesheet it touches.
 *
 * **Why these live together rather than beside their components.** The property
 * being protected is not "this field is 16px" — it is *no typed control on the
 * site is left below WebKit's zoom threshold*. That is a statement about the
 * whole set, and a per-component test satisfies itself while a fifth control is
 * added at 14px somewhere else. Same reason the contrast audit
 * (src/styles/contrast.test.ts) sits here rather than in each component.
 *
 * jsdom resolves neither media queries nor `clamp()`, so these read the
 * stylesheets. Comments are stripped first — a comment naming a property
 * otherwise satisfies the assertion looking for it
 * (collection-toolbar.test.tsx).
 */

const ROOT = join(__dirname, '..')

/** The stylesheet with its prose removed, so assertions match code only. */
function code(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Every text control that was below 16px, and the class each one uses.
 *
 * iOS zooms the page when a focused input computes under 16px. These four sat at
 * `--font-size-sm` (0.875rem = 14px) at every width — none of them clamped, so
 * they zoomed on every viewport rather than only on some.
 */
const RAISED_ON_TOUCH = [
  {
    what: 'the tag find field in the collection filters',
    path: 'routes/lit-tracker/-collection-filters/filter-groups.module.css',
    rule: '.find',
  },
  {
    what: 'the tag input in a card menu',
    path: 'routes/lit-tracker/-components/article-menu/article-tag-controls.module.css',
    rule: '.filter',
  },
  {
    what: "the article's notes textarea",
    path: 'routes/lit-tracker/-article-detail/notes-panel.module.css',
    rule: '.field',
  },
  {
    what: "a mark's note editor in the reader",
    path: 'routes/lit-tracker/-article-detail/reader/annotation-note-editor.module.css',
    rule: '.field',
  },
]

/**
 * Text controls that were already at 16px. Listed so the test says what was
 * *checked and left alone* rather than leaving it to be re-derived; tidying
 * these into the change would widen the diff for no behaviour.
 */
const ALREADY_SAFE = [
  'routes/-shared/components/search-input/search-input.module.css',
  'routes/-shared/components/user-settings/delete-account.module.css',
  'routes/lit-tracker/-components/article-edit/article-edit-dialog.module.css',
  'routes/lit-tracker/-components/article-edit/authors-editor.module.css',
]

describe('no typed control is left below the iOS zoom threshold', () => {
  it.each(RAISED_ON_TOUCH)('raises $what to full size on a touch device', ({
    path,
    rule,
  }) => {
    const css = code(path)
    const block = css
      .match(/@media \(pointer: coarse\) \{[\s\S]*?\n\}\n/g)
      ?.find((b) => b.includes(`${rule} {`))

    expect(
      block,
      `${rule} needs a coarse-pointer rule: below 16px, WebKit zooms the ` +
        'page when a control is focused.',
    ).toBeDefined()
    expect(block).toMatch(/font-size:\s*var\(--font-size-md\)/)
  })

  it.each(
    RAISED_ON_TOUCH,
  )('leaves $what at the quiet size on a pointer device', ({ path, rule }) => {
    // The bump is scoped on purpose: the surfaces these sit on were designed
    // with --font-size-sm, and a desktop has no zoom behaviour to avoid.
    const css = code(path)
    const base = css.slice(
      css.indexOf(`\n${rule} {`),
      css.indexOf('}', css.indexOf(`\n${rule} {`)),
    )

    expect(base).toMatch(/font-size:\s*var\(--font-size-sm\)/)
  })

  it('keys the rule on the pointer, not on the viewport width', () => {
    /*
     * A width query would pass "is there a media query?" while getting the
     * wrong devices: a touch laptop is wide, and a phone in landscape is wider
     * than the breakpoint anyone would pick. The capability is what the platform
     * itself keys on, and it is the same reasoning the project already applies
     * to `@media (hover: hover)` for hover affordances.
     */
    for (const { path, rule } of RAISED_ON_TOUCH) {
      const css = code(path)
      const widthScoped = css
        .match(/@media \(max-width[\s\S]*?\n\}\n/g)
        ?.some((b) => b.includes(`${rule} {`) && b.includes('font-size'))

      expect(widthScoped ?? false).toBe(false)
    }
  })

  it.each(ALREADY_SAFE)('leaves %s alone, being already at 16px', (path) => {
    const css = code(path)

    expect(css).toMatch(/font-size:\s*var\(--font-size-md\)/)
    expect(css).not.toMatch(/@media \(pointer: coarse\)/)
  })
})

describe('the viewport permits zoom', () => {
  it('never suppresses it to stop the page moving', () => {
    /*
     * The other way to stop iOS zooming on focus is `maximum-scale=1` or
     * `user-scalable=no`, and it is a WCAG 1.4.4 failure: it takes zoom away
     * from every reader to spare one interaction. This test is the cheap guard
     * on the shortcut, since it is the obvious thing to reach for if the
     * font-size approach is ever found wanting.
     */
    const root = readFileSync(join(ROOT, 'routes/__root.tsx'), 'utf8')

    expect(root).toMatch(/width=device-width/)
    expect(root).not.toMatch(/maximum-scale/)
    expect(root).not.toMatch(/user-scalable/)
  })
})

describe('code blocks on a narrow column', () => {
  it('scales fluidly between 12px and the desktop size', () => {
    /*
     * Fixed at 14px, a block fitted 34 characters of a 62-character line at
     * 375px and hung 214px off the side. The floor buys 40; it cannot buy all
     * 62, which would need roughly 8px type.
     *
     * The ceiling is asserted as well as the floor, so "make it smaller" cannot
     * quietly shrink the desktop appearance too.
     */
    const css = code(
      'routes/(personal-site)/blog/-post-page/post-page.module.css',
    )
    const pre = css.slice(
      css.indexOf('\n.prose pre {'),
      css.indexOf('}', css.indexOf('\n.prose pre {')),
    )

    expect(pre).toMatch(/font-size:\s*clamp\(\s*0\.75rem\s*,/)
    expect(pre).toMatch(/,\s*0\.875rem\s*\)/)
  })

  it('keeps the block scrolling rather than the page', () => {
    // Long lines still overflow, and always will at a readable size. The block
    // carries that itself — the document scrolling sideways is the thing a
    // reader actually notices.
    const css = code(
      'routes/(personal-site)/blog/-post-page/post-page.module.css',
    )
    const pre = css.slice(
      css.indexOf('\n.prose pre {'),
      css.indexOf('}', css.indexOf('\n.prose pre {')),
    )

    expect(pre).toMatch(/overflow-x:\s*auto/)
  })
})
