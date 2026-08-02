import { describe, expect, it, vi } from 'vitest'

/**
 * The `/lit-tracker` index mount. Everything this page does is
 * -collection-page/'s; all this file has to get right is which component fills
 * the panel, and that it does not re-declare the guard the group layout already
 * applies.
 */

const CollectionPage = vi.hoisted(() => vi.fn())
vi.mock('./-collection-page/collection-page', () => ({ CollectionPage }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}))

const { Route } = await import('./index')

// Named rather than indexed: an index signature would force bracket access,
// which Biome's useLiteralKeys then rejects — the same shape the /api/zero
// route tests settled on.
const options = Route.options as unknown as {
  component?: unknown
  beforeLoad?: unknown
}

describe('the /lit-tracker index mount', () => {
  it('renders the collection page', () => {
    expect(options.component).toBe(CollectionPage)
  })

  it('adds no guard of its own', () => {
    // `requireAuth` is attached once, at the group root (route.tsx). Repeating
    // it here would resolve the session twice per navigation, and would make
    // the group's guarantee look optional to whoever adds the next page.
    expect(options.beforeLoad).toBeUndefined()
  })
})
