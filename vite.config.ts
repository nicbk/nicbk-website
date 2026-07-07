import { createReadStream, statSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, type Plugin } from 'vite'
import { mdxPlugin } from './blog/mdx-plugins'

/**
 * Serve `public/.well-known/**` in the dev server.
 *
 * Vite's dev static middleware (sirv) refuses dotfile paths, so requests for
 * the WKD files under `/.well-known/openpgpkey/` 404 in `npm run dev` even
 * though the production Nitro server serves them. This dev-only middleware
 * closes that gap so dev matches production, as the about-page feature's WKD
 * requirement demands (features/about-page/constraints-and-behavior.md). It
 * never runs in the production build (`apply: 'serve'`), which serves these
 * committed files natively.
 */
function serveWellKnownInDev(): Plugin {
  const publicDir = fileURLToPath(new URL('./public', import.meta.url))
  const wellKnownRoot = join(publicDir, '.well-known')
  return {
    name: 'serve-well-known-in-dev',
    apply: 'serve',
    // `order: 'pre'` registers this middleware ahead of the TanStack
    // Start / Nitro dev handler, which would otherwise answer `/.well-known/*`
    // with its SSR 404 before this ever runs.
    configureServer: {
      order: 'pre',
      handler(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url ?? '').split('?')[0] ?? ''
          if (!pathname.startsWith('/.well-known/')) {
            next()
            return
          }
          // Resolve within public/ and confirm the result stays under
          // .well-known/ (rejects `..` traversal out of the served subtree).
          const filePath = normalize(join(publicDir, pathname))
          if (
            filePath !== wellKnownRoot &&
            !filePath.startsWith(wellKnownRoot + sep)
          ) {
            next()
            return
          }
          let isFile = false
          try {
            isFile = statSync(filePath).isFile()
          } catch {
            isFile = false
          }
          if (!isFile) {
            next()
            return
          }
          // Binary form for a WKD client; content-type is not significant to
          // gpg, which reads the raw key bytes.
          res.setHeader('Content-Type', 'application/octet-stream')
          createReadStream(filePath).on('error', next).pipe(res)
        })
      },
    },
  }
}

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    // Resolves the `~/` alias from tsconfig.json `paths`.
    tsconfigPaths: true,
  },
  // nitro() gives the production build a self-contained Node server
  // (.output/server/index.mjs, run with plain `node`) — TanStack Start's
  // documented Node self-hosting path; without it the build emits only a
  // fetch handler with no listener. See
  // research/devops-deployment/containerization-and-build.md.
  plugins: [
    tanstackStart({
      // Keep colocated unit tests (e.g. route.test.tsx sitting next to a
      // route file) out of the generated route tree — without this, the
      // scanner treats any *.test.tsx under routes/ that isn't in a
      // "-"-prefixed dir as a route and warns it exports no Route.
      router: { routeFileIgnorePattern: '.*\\.test\\.tsx?$' },
    }),
    nitro(),
    // MDX (enforce:'pre') must run immediately before the React plugin so it
    // compiles .mdx → JSX before React's transform sees it; viteReact must
    // then be told to include .mdx so Fast Refresh/JSX handling applies to the
    // compiled output. See blog/mdx-plugins.ts.
    mdxPlugin(),
    viteReact({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    serveWellKnownInDev(),
  ],
})
