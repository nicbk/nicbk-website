import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { type ReactNode } from 'react'
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
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
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
        {children}
        <Scripts />
      </body>
    </html>
  )
}
