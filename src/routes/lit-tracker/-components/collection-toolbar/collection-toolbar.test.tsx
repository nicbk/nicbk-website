import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Toaster } from '~/routes/-shared/components/toast/toaster'

/**
 * The row above the collection. What is asserted here is the search field it
 * gained in #8's last task — that it is labelled, controlled, and reports every
 * keystroke — plus that the upload controls it has always held are still beside
 * it. What those controls *do* is their own tests' and #7's e2e coverage.
 *
 * `useQuery` is mocked because the real one needs a mounted Zero client.
 */

const useQuery = vi.hoisted(() => vi.fn(() => [[], { type: 'complete' }]))
vi.mock('@rocicorp/zero/react', () => ({
  useQuery,
  useZero: () => ({ mutate: vi.fn() }),
}))

const { CollectionToolbar, SEARCH_LABEL } = await import('./collection-toolbar')

function renderToolbar(query = '', onQueryChange = vi.fn()) {
  render(
    <Toaster>
      <CollectionToolbar query={query} onQueryChange={onQueryChange} />
    </Toaster>,
  )
  return { onQueryChange }
}

describe('CollectionToolbar', () => {
  it('gives the search field a discernible name', () => {
    // Visually hidden — the placeholder carries the cue for sighted readers —
    // but a field a screen reader announces as "search" and nothing else does
    // not say what it searches.
    renderToolbar()

    expect(
      screen.getByRole('searchbox', { name: SEARCH_LABEL }),
    ).toBeInTheDocument()
  })

  it('shows the query it is given rather than one of its own', () => {
    // Controlled from the page, which filters the grid from the same value. Two
    // copies is how the grid comes to show something the input does not say.
    renderToolbar('attention')

    expect(screen.getByRole('searchbox')).toHaveValue('attention')
  })

  it('reports every keystroke, with no debounce of its own', () => {
    const { onQueryChange } = renderToolbar()

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'att' },
    })

    expect(onQueryChange).toHaveBeenCalledWith('att')
  })

  it('keeps the upload controls beside the search field', () => {
    // This task moved them; it must not have removed them.
    renderToolbar()

    expect(
      screen.getByRole('button', { name: 'Add articles' }),
    ).toBeInTheDocument()
  })
})

/**
 * Reads one rule's declarations out of a stylesheet, by selector.
 *
 * Crude on purpose: jsdom applies no stylesheets and resolves no CSS modules,
 * so a rendered tree reports the same thing whether these rules are present or
 * not. Asserting the source text is the only tier that can fail when the
 * declaration is deleted — the same idiom `pdf-reader.test.tsx` uses for the
 * tiles' `pointer-events`.
 *
 * **Comments are stripped first**, and that is not tidiness: this project's
 * stylesheets carry long comments *inside* the rules they explain, so a naive
 * search finds the prose. `.toolbar`'s own comment says the row has "no
 * background of its own", which made an assertion that it declares no
 * background fail against the sentence promising exactly that.
 */
function declarationsOf(stylesheet: string, selector: string): string {
  const code = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '')
  const start = code.indexOf(`\n${selector} {`)
  if (start === -1) {
    throw new Error(`No \`${selector}\` rule in the stylesheet.`)
  }
  return code.slice(code.indexOf('{', start) + 1, code.indexOf('}', start))
}

describe('the collection toolbar’s layer', () => {
  /*
   * One test for two files, and that is the point.
   *
   * The row must paint above the cards and below every portalled menu, dialog
   * and backdrop. `z-index` on the row buys the first; `isolation: isolate` on
   * the page buys the second, by confining the row's layer so it is never
   * compared against a portal at all. **Either one alone is a shipped defect** —
   * a bare `z-index` opened menus underneath the row and left the modal
   * backdrop dimming every part of the page except this strip, which is why it
   * was reverted the first time and why the row then had no explicit order at
   * all. Safari drew the cards straight over it.
   *
   * So the pairing is what is asserted. Split into two tests, deleting either
   * line would leave one of them green and read as a partial regression rather
   * than as the whole fix coming undone.
   */
  it('declares its z-index and the page’s isolation together', () => {
    const toolbar = declarationsOf(
      readFileSync(join(__dirname, 'collection-toolbar.module.css'), 'utf8'),
      '.toolbar',
    )
    const page = declarationsOf(
      readFileSync(
        join(__dirname, '../../-collection-page/collection-page.module.css'),
        'utf8',
      ),
      '.page',
    )

    expect(
      toolbar,
      'The toolbar needs a z-index to paint above the cards — Safari does not ' +
        'give it one for free.',
    ).toMatch(/z-index:\s*1\b/)
    expect(
      page,
      'The page needs `isolation: isolate` to confine that z-index. Without ' +
        'it the row also outranks every portalled popup and backdrop, which is ' +
        'why the z-index was reverted the first time.',
    ).toMatch(/isolation:\s*isolate\b/)
  })

  it('keeps the row sticky and transparent', () => {
    // The layer is the only thing this task changed. The row stays pinned, and
    // stays without a background so the collection is visibly passing behind
    // it — both decided separately, both easy to lose in a stylesheet edit.
    const toolbar = declarationsOf(
      readFileSync(join(__dirname, 'collection-toolbar.module.css'), 'utf8'),
      '.toolbar',
    )

    expect(toolbar).toMatch(/position:\s*sticky/)
    expect(toolbar).not.toMatch(/background/)
  })
})
