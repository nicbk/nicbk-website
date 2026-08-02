import { createReadStream, statSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
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

/**
 * Stop the browser from permanently caching the dev server's pre-bundled
 * dependencies.
 *
 * Vite serves its optimizer output (`node_modules/.vite/deps/*`) with
 * `Cache-Control: max-age=31536000,immutable`. The entry files are
 * cache-busted by a `?v=<browserHash>` query, but the imports *between* those
 * chunks are plain relative specifiers with no version:
 *
 *     import { t as require_react } from "./react.js"
 *
 * When the dependency graph changes, the optimizer re-bundles and reassigns
 * those short cross-chunk binding names. A browser still holding a year-long
 * "immutable" copy of a sibling chunk then links a fresh importer against a
 * stale exporter, and module resolution fails outright — Safari reports it as
 * `Importing binding name 't' is not found.`, and the page dies before it can
 * render. It is invisible to whoever changed the dependency (their browser had
 * no prior copy) and permanent for everyone who visited earlier, which is why
 * it surfaces on a phone that loaded the site before the change.
 *
 * Serving the optimizer's output as `no-cache` removes the failure mode: the
 * ETag still yields cheap 304s, so nothing meaningful is re-downloaded, but the
 * browser can never serve a chunk that disagrees with the rest of the graph.
 * Dev-only (`apply: 'serve'`) — production assets are content-hashed per file,
 * so a changed chunk gets a new URL and the mismatch cannot arise there.
 */
function revalidateOptimizedDepsInDev(): Plugin {
  return {
    name: 'revalidate-optimized-deps-in-dev',
    apply: 'serve',
    configureServer: {
      // Ahead of Vite's own static handler, so the header override below is
      // installed before that handler sets its `immutable` value.
      order: 'pre',
      handler(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url ?? '').split('?')[0] ?? ''
          if (!pathname.includes('/.vite/deps/')) {
            next()
            return
          }
          // Vite sets Cache-Control when it serves the file, so overwrite the
          // value as it is written rather than setting it here (which that
          // later write would replace).
          const setHeader = res.setHeader.bind(res)
          res.setHeader = (name: string, value: number | string | string[]) =>
            setHeader(
              name,
              name.toLowerCase() === 'cache-control' ? 'no-cache' : value,
            )
          next()
        })
      },
    },
  }
}

export default defineConfig({
  server: {
    port: 3000,
    // Vite's dev server rejects requests whose Host header it doesn't
    // recognize — DNS-rebinding protection, and correct by default. But
    // zero-cache calls back into this app to resolve every query, and it always
    // does so from inside a container, under whatever name reaches the dev
    // server from there:
    //
    //   app                   — the Compose service name, when both run in the
    //                           dev stack (docker-compose.override.yml)
    //   host.docker.internal  — the Docker gateway, when zero-cache is a
    //                           container and the dev server is on the host
    //                           (the signed-in e2e tier,
    //                           scripts/e2e-auth-server.mjs)
    //
    // Without these, /api/zero/query answers 403 with Vite's "Blocked request"
    // body, the client never syncs, and the collection sits on its loading
    // placeholder forever — a failure that looks like a Zero problem and isn't.
    //
    // Narrow on purpose: two names, neither resolvable from outside this
    // machine's Docker networking. Dev-server-only — the production server has
    // no such check, so this changes nothing about what ships.
    allowedHosts: ['app', 'host.docker.internal'],
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
    revalidateOptimizedDepsInDev(),
  ],
})
