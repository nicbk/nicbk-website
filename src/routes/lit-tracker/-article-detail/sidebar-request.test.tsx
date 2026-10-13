import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RequestableTab } from './sidebar-request'
import {
  SidebarRequestProvider,
  useRequestSidebarTab,
  useSidebarTabRequests,
} from './sidebar-request'

/**
 * The channel on its own: a request reaches every sidebar listening *now*, and
 * none that has gone — and with no provider, both ends are quietly nothing.
 */

function Asker({
  grab,
}: {
  grab: (ask: (tab: RequestableTab) => void) => void
}) {
  grab(useRequestSidebarTab())
  return null
}

function Sidebar({ onRequest }: { onRequest: (tab: RequestableTab) => void }) {
  useSidebarTabRequests(onRequest)
  return null
}

describe('sidebar requests', () => {
  it('reaches every mounted sidebar', () => {
    let ask: (tab: RequestableTab) => void = () => {}
    const rail = vi.fn()
    const sheet = vi.fn()
    render(
      <SidebarRequestProvider>
        <Asker grab={(a) => (ask = a)} />
        <Sidebar onRequest={rail} />
        <Sidebar onRequest={sheet} />
      </SidebarRequestProvider>,
    )

    ask('contents')

    expect(rail).toHaveBeenCalledWith('contents')
    expect(sheet).toHaveBeenCalledWith('contents')
  })

  it('stops reaching a sidebar once it is gone', () => {
    let ask: (tab: RequestableTab) => void = () => {}
    const gone = vi.fn()
    const view = render(
      <SidebarRequestProvider>
        <Asker grab={(a) => (ask = a)} />
        <Sidebar onRequest={gone} />
      </SidebarRequestProvider>,
    )
    view.rerender(
      <SidebarRequestProvider>
        <Asker grab={(a) => (ask = a)} />
      </SidebarRequestProvider>,
    )

    ask('contents')

    expect(gone).not.toHaveBeenCalled()
  })

  it('does nothing without a provider', () => {
    let ask: (tab: RequestableTab) => void = () => {}
    const listener = vi.fn()
    render(
      <>
        <Asker grab={(a) => (ask = a)} />
        <Sidebar onRequest={listener} />
      </>,
    )
    expect(() => ask('contents')).not.toThrow()
    expect(listener).not.toHaveBeenCalled()
  })
})
