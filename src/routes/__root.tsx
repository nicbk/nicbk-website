import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { type ReactNode } from 'react'
import { ErrorPage } from '~/routes/-shared/components/error-page/error-page'
import { NotFoundPage } from '~/routes/-shared/components/not-found-page/not-found-page'
import { SiteShell } from '~/routes/-shared/components/site-shell/site-shell'
import { SkipLink } from '~/routes/-shared/components/skip-link/skip-link'
import globalsCssUrl from '~/styles/globals.css?url'
import { themeInitScript } from '~/theme'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Nicolás Kennedy' },
    ],
    links: [{ rel: 'stylesheet', href: globalsCssUrl }],
    // Inline, blocking, first in <head>: sets data-theme on <html> before
    // first paint so the correct theme renders from the very first frame.
    scripts: [{ children: themeInitScript }],
  }),
  component: RootComponent,
  // Both fallbacks render their designed page inside the shared site shell
  // (header + focusable <main>): the 404 for unmatched routes, and the
  // generic error page when a descendant render or loader throws.
  notFoundComponent: RootNotFound,
  errorComponent: RootErrorFallback,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootNotFound() {
  return (
    <SiteShell>
      <NotFoundPage />
    </SiteShell>
  )
}

interface RootErrorFallbackProps {
  error: Error
}

function RootErrorFallback({ error }: RootErrorFallbackProps) {
  // Unlike notFoundComponent — which renders into RootComponent's <Outlet/>,
  // inheriting the surrounding document — the root errorComponent *replaces*
  // RootComponent entirely, so it must render the RootDocument shell (html
  // lang, <head>, skip link, Scripts) itself; otherwise the error page has no
  // <title>/lang and ships no styles or theme script.
  return (
    <RootDocument>
      <SiteShell>
        <ErrorPage error={error} />
      </SiteShell>
    </RootDocument>
  )
}

interface RootDocumentProps {
  children: ReactNode
}

function RootDocument({ children }: RootDocumentProps) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <SkipLink />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
