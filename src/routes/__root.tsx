import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { type ReactNode } from 'react'
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
  // Minimal placeholders only — the designed 404/error pages are the
  // separate error-and-not-found feature.
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
    <main id="main-content" tabIndex={-1}>
      <h1>Page not found</h1>
      <p>
        <a href="/">Back to home</a>
      </p>
    </main>
  )
}

interface RootErrorFallbackProps {
  error: Error
}

export function RootErrorFallback({ error }: RootErrorFallbackProps) {
  return (
    <main id="main-content" tabIndex={-1}>
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      <p>
        <a href="/">Back to home</a>
      </p>
    </main>
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
