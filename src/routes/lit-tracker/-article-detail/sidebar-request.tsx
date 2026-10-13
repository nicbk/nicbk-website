import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'

/**
 * Asks the article's sidebar to show a tab, from outside it
 * (features/a-paper-shows-its-contents, task `the-toolbar-opens-the-contents`).
 *
 * The reader's toolbar has a *contents* button, and on a wide screen what it
 * opens is the rail's sidebar — which renders in the shell, a sibling of the page
 * the toolbar is in (`route.tsx`). Like the reader jump (`reader-jump.tsx`), the
 * route layout is the only level that sees both, so that is where this mounts.
 *
 * **An event, not state.** Which tab a sidebar shows is each copy's own
 * (`article-sidebar.tsx`), and a request is a moment — "show contents now" —
 * rather than a value to hold. Held as state, it would still be there when the
 * reader later opened the sidebar some other way, and would choose its tab for
 * it. The narrow-screen sheet, which mounts only when it opens and so cannot hear
 * a request made before it existed, is opened on its tab by the page instead
 * (`article-detail-page.tsx`).
 *
 * Both hooks tolerate a missing provider, as the reader jump's do: a request
 * with nobody listening is correctly nothing.
 */

/** The tabs that can be asked for. Only one today: what the toolbar opens. */
export type RequestableTab = 'contents'

type Listener = (tab: RequestableTab) => void

interface SidebarRequestContextValue {
  request: (tab: RequestableTab) => void
  subscribe: (listener: Listener) => () => void
}

const SidebarRequestContext = createContext<SidebarRequestContextValue | null>(
  null,
)

export function SidebarRequestProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<Listener>())

  const request = useCallback((tab: RequestableTab) => {
    for (const listener of listeners.current) {
      listener(tab)
    }
  }, [])

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])

  const value = useMemo(() => ({ request, subscribe }), [request, subscribe])

  return (
    <SidebarRequestContext.Provider value={value}>
      {children}
    </SidebarRequestContext.Provider>
  )
}

/** The asking side: a call that asks every mounted sidebar to show `tab`. */
export function useRequestSidebarTab(): (tab: RequestableTab) => void {
  const context = useContext(SidebarRequestContext)
  const none = useCallback(() => {}, [])
  return context?.request ?? none
}

/** A sidebar's side: `onRequest` is called with each tab asked for. */
export function useSidebarTabRequests(onRequest: Listener): void {
  const context = useContext(SidebarRequestContext)
  const subscribe = context?.subscribe
  const latest = useRef(onRequest)
  latest.current = onRequest

  useEffect(() => {
    if (!subscribe) {
      return
    }
    return subscribe((tab) => latest.current(tab))
  }, [subscribe])
}
