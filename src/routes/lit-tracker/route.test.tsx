import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * The `/lit-tracker` group layout: that the route guard is attached at the
 * group root — so every tracker page inherits it rather than each one
 * remembering to — and that the page below it renders inside the tracker shell
 * and inside the Zero client.
 *
 * `requireAuth` is mocked because the real one calls a server function that
 * reads the session from the database; what it *decides* is covered in
 * src/auth/require-auth.test.ts, and that it redirects a real signed-out
 * visitor is covered in e2e-auth/lit-tracker.spec.ts. The Zero client is mocked
 * for the same reason as everywhere else in the unit tier: mounting it needs a
 * WebSocket and a running zero-cache.
 */

const SESSION = {
  user: { id: 'user-1', name: 'Nicolás Kennedy', email: 'nicbk@example.com' },
}

const requireAuth = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())

vi.mock('~/auth/require-auth', () => ({ requireAuth }))
vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react')
  return {
    // The route object the real `createFileRoute` returns also carries the
    // hooks a component reads its context through; `useRouteContext` is the one
    // this layout uses.
    createFileRoute: () => (options: unknown) => ({
      options,
      useRouteContext: () => ({
        auth: {
          user: {
            id: 'user-1',
            name: 'Nicolás Kennedy',
            email: 'nicbk@example.com',
          },
        },
      }),
    }),
    Outlet: () => createElement('p', null, 'page content'),
    useNavigate: () => navigate,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
      createElement('a', { href: to }, children),
  }
})
vi.mock('./-components/zero-client/zero-client-provider', () => ({
  ZeroClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))
// Stubbed for the same reason: with the provider mocked to a pass-through, the
// real rail would run its Zero queries against no client. That it renders the
// tags, filters on them, and names its landmark is
// `-collection-filters/filter-rail`'s own coverage; what this file asserts is
// that the layout hands it to the shell at all.
vi.mock('./-collection-filters/filter-rail', async () => {
  const { createElement } = await import('react')
  return {
    FilterRail: ({ label }: { label: string }) =>
      createElement('nav', { 'aria-label': label }),
  }
})

const { Route } = await import('./route')

/** The shape `createFileRoute`'s options carry, as this test reads them. */
interface RouteOptions {
  beforeLoad: (context: { location: { href: string } }) => Promise<unknown>
  component: () => React.ReactNode
  validateSearch: { parse: (input: unknown) => unknown }
}

const options = Route.options as unknown as RouteOptions

describe('the /lit-tracker group layout', () => {
  it('guards the whole group, and hands the session to the layout', async () => {
    requireAuth.mockResolvedValue(SESSION)
    const context = { location: { href: '/lit-tracker' } }

    const routeContext = await options.beforeLoad(context)

    // Attached at the group root, so routes added later (#8, #9) are protected
    // without touching this file again.
    expect(requireAuth).toHaveBeenCalledWith(context)
    expect(routeContext).toEqual({
      auth: { user: expect.objectContaining({ id: 'user-1' }) },
    })
  })

  it('renders the page inside the tracker shell', () => {
    const Layout = options.component
    render(<Layout />)

    // The tracker's own header, not the site header, and the landmark the skip
    // link targets.
    expect(
      screen.getByRole('link', { name: 'Literature Tracker' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Site' })).toBeNull()
    expect(screen.getByRole('main')).toContainElement(
      screen.getByText('page content'),
    )
  })

  it('gives the shell a filter rail, named for what it filters', () => {
    const Layout = options.component
    render(<Layout />)

    // The rail is a landmark now that it has contents (#7 deliberately left it
    // un-named while it was empty), and it sits outside the content panel.
    const rail = screen.getByRole('navigation', { name: 'filter collection' })
    expect(screen.getByRole('main')).not.toContainElement(rail)
  })

  it('validates the collection filters at the group root', () => {
    // Not on the collection page: the rail that writes these renders in the
    // shell's sidebar, outside the page, so a page-level schema would be
    // unreadable from the control that sets it.
    const { validateSearch } = options

    expect(validateSearch.parse({ tags: ['rlhf'], status: 'reading' })).toEqual(
      {
        tags: ['rlhf'],
        status: 'reading',
      },
    )
  })
})
