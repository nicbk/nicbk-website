import { ZeroProvider } from '@rocicorp/zero/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { zeroCacheUrl } from '~/zero/cache-url'
import { schema } from '~/zero/schema.gen'

interface ZeroClientProps {
  /** The signed-in user's id, from the route guard's session. */
  userId: string
  children: ReactNode
}

/**
 * The live Zero client: the WebSocket to zero-cache and the React context every
 * `useQuery` on a tracker page reads from.
 *
 * Loaded lazily and only in the browser — see `zero-client-provider.tsx`, which
 * is the component pages actually render. This module is the lazy chunk, so
 * importing `@rocicorp/zero/react` here keeps it out of the server bundle and
 * out of the initial client bundle.
 *
 * No `auth` token is passed. zero-cache forwards the browser's Better Auth
 * session cookie to `/api/zero/query` (`ZERO_QUERY_FORWARD_COOKIES` in
 * docker-compose.yml), and that endpoint derives who is asking from the
 * validated session — the credential is the cookie the browser already holds.
 *
 * `userID` is not a claim the server trusts for authorization; the session
 * decides that, independently. It exists so Zero can partition client-side
 * storage per account and pin a client group to one user — zero-cache compares
 * it against the id `/query` returns and refuses the connection if they differ.
 * Passing the guard's session id is what makes those agree.
 */
export function ZeroClient({ userId, children }: ZeroClientProps) {
  // ZeroProvider re-creates its Zero instance whenever any option's *value*
  // changes identity, so a fresh object literal here would tear down and
  // rebuild the connection on every render.
  const context = useMemo(() => ({ id: userId }), [userId])

  return (
    <ZeroProvider
      schema={schema}
      cacheURL={zeroCacheUrl()}
      userID={userId}
      context={context}
    >
      {children}
    </ZeroProvider>
  )
}
