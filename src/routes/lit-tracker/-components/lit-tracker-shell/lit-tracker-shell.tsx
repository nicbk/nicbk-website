import type { ReactNode } from 'react'
import type { AvatarAccount } from '../account-avatar/account-avatar'
import { LitTrackerHeader } from '../lit-tracker-header/lit-tracker-header'
import { LitTrackerSidebar } from '../lit-tracker-sidebar/lit-tracker-sidebar'
import { TrackerLoading } from '../tracker-loading/tracker-loading'
import { ZeroClientProvider } from '../zero-client/zero-client-provider'
import styles from './lit-tracker-shell.module.css'

/**
 * What the shell needs to know about who is signed in: everything the header's
 * avatar shows, plus the id the Zero client partitions its local storage by. The
 * avatar itself has no use for an id, which is why this extends its type rather
 * than widening it.
 */
export interface ShellAccount extends AvatarAccount {
  id: string
}

interface LitTrackerShellProps {
  /** The signed-in account: the header's avatar, and the Zero client's user. */
  account: ShellAccount
  /** Called once the session ends, so the guarded page can leave. */
  onSignedOut?: (() => void) | undefined
  /** Called once the account is deleted. */
  onDeleted?: (() => void) | undefined
  /**
   * What fills the rail above the account control — the collection's filters.
   *
   * Taken as an element rather than named here, so the shell stays chrome and
   * knows nothing about what any page puts in it. Creating the element outside
   * the Zero provider is fine and is the point: JSX is a description, so its
   * hooks run where the shell *renders* it, which is inside.
   */
  filters?: ReactNode
  /**
   * What the header shows beside the app name — the article being read.
   *
   * An element for the same reason `filters` is: it reads synced data, so it has
   * to *render* inside the Zero provider even though it is described out here.
   */
  pageTitle?: ReactNode
  children: ReactNode
}

/**
 * The Lit Tracker's app-shell chrome: the header pinned to the top edge of the
 * viewport, and below it two independently scrolling panels — the sidebar rail
 * and the content.
 *
 * This is the layout model the header spec calls for and the thing that most
 * distinguishes the tracker from the personal site
 * (research/ui-ux/pages/lit-tracker/components/header.md). SiteShell puts a
 * `position: sticky` header on a page that scrolls as one unit; here the
 * document does not scroll at all — the shell is exactly one viewport tall and
 * the panels inside it are what move. Every later tracker page inherits this:
 * #8's article grid scrolls independently of the filter list in the rail, and
 * #9's reader scrolls independently of its own sidebar.
 *
 * The `<main id="main-content" tabIndex={-1}>` is the same landmark SiteShell
 * renders, and for the same two reasons: the skip link (__root.tsx) targets it,
 * and the route-change focus handoff (src/focus-handoff.ts) lands on the page's
 * `<h1>` inside it or on the landmark itself. Duplicating the element rather
 * than reusing SiteShell is deliberate — what differs between the two shells is
 * precisely the layout wrapped around it.
 *
 * **The Zero client is mounted here, around both panels**, and it moved here in
 * #8's third task for a concrete reason: the filter rail lives in the sidebar,
 * beside the page rather than inside it, and a provider wrapping only the page
 * left the rail unable to ask for the tag list it exists to show. One client
 * still — one WebSocket per session, not one per panel. #9's third task pulled
 * the header inside it too, so it can name the article being read.
 */
export function LitTrackerShell({
  account,
  onSignedOut,
  onDeleted,
  filters,
  pageTitle,
  children,
}: LitTrackerShellProps) {
  const header = (
    <LitTrackerHeader
      account={account}
      onSignedOut={onSignedOut}
      onDeleted={onDeleted}
      pageTitle={pageTitle}
    />
  )

  return (
    <div className={styles.shell}>
      {/* Zero has no SSR, so nothing under this provider exists until the
          browser has hydrated. */}
      <ZeroClientProvider
        userId={account.id}
        fallback={
          <>
            {/*
              The header without the article's title, which is the only part
              that needs sync. Rendered in both branches — like `Panels` below, and for the
              same reason: the row must not appear, vanish, and reappear across
              hydration.
            */}
            <LitTrackerHeader
              account={account}
              onSignedOut={onSignedOut}
              onDeleted={onDeleted}
            />
            <Panels>
              <TrackerLoading />
            </Panels>
          </>
        }
      >
        {/*
          Inside the provider now, so the row can name the article being read
          (research/ui-ux/pages/lit-tracker/components/header.md). What that
          costs is nothing the account control depended on: the provider mounts a
          client whether or not the socket ever connects, so signing out of a
          tracker whose sync is broken — the case the header was kept outside
          for — still works. The one moment there is genuinely no client is
          before hydration, and the fallback above covers it.
        */}
        {header}
        <Panels filters={filters}>{children}</Panels>
      </ZeroClientProvider>
    </div>
  )
}

/**
 * The two panels, factored out so the pre-hydration fallback is the same layout
 * as the hydrated page rather than a second one written to look like it.
 *
 * The fallback passes no `filters`: the rail's contents come from Zero, which is
 * precisely what does not exist yet at that point. The rail is still there, at
 * its own width, so nothing shifts sideways when the real filters arrive.
 */
function Panels({
  filters,
  children,
}: Pick<LitTrackerShellProps, 'filters' | 'children'>) {
  return (
    <div className={styles.panels}>
      <LitTrackerSidebar filters={filters} />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
