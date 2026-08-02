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

const { Route } = await import('./route')

/** The shape `createFileRoute`'s options carry, as this test reads them. */
interface RouteOptions {
  beforeLoad: (context: { location: { href: string } }) => Promise<unknown>
  component: () => React.ReactNode
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
})
