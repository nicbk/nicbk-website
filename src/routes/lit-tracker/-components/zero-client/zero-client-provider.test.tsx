import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * The one thing this wrapper exists to guarantee: **Zero never renders on the
 * server.** It has no SSR support — its client opens a WebSocket and reads
 * IndexedDB — and the failure mode if it slipped through is a server render
 * that throws, which is not something a jsdom component test would notice on
 * its own. So the server pass is exercised here with the real renderer.
 *
 * The client module is mocked so this stays a test of the boundary rather than
 * of Zero. Whether the real client then connects is proven where a real
 * zero-cache exists, in e2e-auth/lit-tracker.spec.ts.
 */

const ZeroClient = vi.hoisted(() =>
  vi.fn(({ children }: { children: React.ReactNode }) => children),
)
vi.mock('./zero-client', () => ({ ZeroClient }))

const { ZeroClientProvider } = await import('./zero-client-provider')

function subject() {
  return (
    <ZeroClientProvider userId="user-1" fallback={<p>placeholder</p>}>
      <p>synced content</p>
    </ZeroClientProvider>
  )
}

describe('ZeroClientProvider', () => {
  it('renders only the fallback on the server, never the Zero client', () => {
    const html = renderToString(subject())

    expect(html).toContain('placeholder')
    expect(html).not.toContain('synced content')
    expect(ZeroClient).not.toHaveBeenCalled()
  })

  it('mounts the Zero client once the browser has it, with the guard’s user id', async () => {
    render(subject())

    // `lazy` resolves asynchronously, so the fallback is what a reader sees
    // until the chunk arrives — the same placeholder, either way.
    expect(await screen.findByText('synced content')).toBeInTheDocument()
    expect(ZeroClient).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      undefined,
    )
  })
})
