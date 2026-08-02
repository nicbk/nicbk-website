import { ClientOnly } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { lazy, Suspense } from 'react'

/**
 * Zero's client, mounted the only way it can be: in the browser, after
 * hydration.
 *
 * **Zero does not support SSR.** Its client opens a WebSocket, reads IndexedDB,
 * and materializes views from a local store — none of which exist on the
 * server, and it does not degrade to a server-rendered snapshot. So the
 * provider is loaded through `React.lazy` behind TanStack Router's
 * `ClientOnly`, which renders `fallback` for the server pass and the first
 * client render, then swaps in the real subtree once hydrated. `lazy` is the
 * half that keeps Zero out of the initial bundle; `ClientOnly` is the half that
 * keeps it from being *called* during SSR. Both are needed — a lazy component
 * still renders on the server if nothing stops it.
 *
 * The practical consequence for every page under this provider: a signed-in
 * user's first paint shows `fallback`, not their data. That is the cold-load
 * placeholder the design system asks for, and it is why the collection surface
 * distinguishes "still syncing" from "genuinely empty" rather than treating an
 * absent result as an empty collection.
 */
const ZeroClient = lazy(async () => {
  // `lazy` wants a default export and this project exports by name
  // (research/coding-conventions/component-and-export-conventions.md), so the
  // named export is adapted here rather than a default one being added.
  const { ZeroClient: Loaded } = await import('./zero-client')
  return { default: Loaded }
})

interface ZeroClientProviderProps {
  /** The signed-in user's id, from the route guard's session. */
  userId: string
  /** Shown while the server renders, and until the client chunk has loaded. */
  fallback: ReactNode
  children: ReactNode
}

export function ZeroClientProvider({
  userId,
  fallback,
  children,
}: ZeroClientProviderProps) {
  return (
    <ClientOnly fallback={fallback}>
      {/* `lazy` suspends on the first client render, after ClientOnly has
          already handed over — so the boundary has to be inside it. */}
      <Suspense fallback={fallback}>
        <ZeroClient userId={userId}>{children}</ZeroClient>
      </Suspense>
    </ClientOnly>
  )
}
