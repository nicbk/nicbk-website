/**
 * The addresses of everything this tier runs, in one place.
 *
 * Three processes need to agree on them and none can ask the others: the
 * service launcher (scripts/e2e-auth-server.mjs), the Playwright config that
 * waits on the app, and the specs that talk to Postgres directly to prove live
 * sync. So they are constants here rather than values discovered at runtime.
 *
 * That means fixed host ports instead of Testcontainers' usual random mapping.
 * Two of them have no alternative:
 *
 *  - zero-cache's, because the browser reaches it through VITE_ZERO_CACHE_URL,
 *    which Vite inlines at build time — before a random port could be known.
 *  - Postgres's, because the spec process connects to it to insert a row and
 *    watch it arrive on screen.
 *
 * The ports are deliberately not the ones a local Compose stack or dev server
 * uses (3000, 4848, 5432), so this tier can run beside them. This tier is
 * single-worker by design, so nothing here races with itself.
 *
 * `.mjs` so the launcher script, the Playwright config, and the TypeScript
 * specs can all import the same file.
 */

/** The app server, run on the host rather than in a container. */
export const AUTH_E2E_PORT = 3100

export const AUTH_E2E_BASE_URL = `http://localhost:${AUTH_E2E_PORT}`

/** zero-cache's published port, and the address the browser dials. */
export const ZERO_CACHE_HOST_PORT = 4849

export const ZERO_CACHE_URL = `http://localhost:${ZERO_CACHE_HOST_PORT}`

/** Postgres, published so the spec process can write to it. */
export const POSTGRES_HOST_PORT = 5433

/**
 * Fixed rather than Testcontainers' generated values, for the same reason the
 * ports are: the spec process has to build a connection string without being
 * told one. Obvious non-secrets — this database exists for the length of one
 * test run and holds nothing but stubbed sign-ins.
 */
export const POSTGRES_USER = 'auth_e2e'
export const POSTGRES_PASSWORD = 'auth_e2e'
export const POSTGRES_DB = 'auth_e2e'

/** Postgres as addressed from the host: the app server and the specs. */
export const DATABASE_URL = `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_HOST_PORT}/${POSTGRES_DB}`

/** How Postgres is addressed from inside the container network: zero-cache. */
export const POSTGRES_NETWORK_ALIAS = 'db'

export const INTERNAL_DATABASE_URL = `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_NETWORK_ALIAS}:5432/${POSTGRES_DB}`

/**
 * Garage's S3 API, published so the app server — which runs on the host in this
 * tier — can reach it. Not 3900, so this can run beside a Compose stack.
 */
export const GARAGE_HOST_PORT = 3901

export const GARAGE_ENDPOINT = `http://localhost:${GARAGE_HOST_PORT}`

/**
 * Fixed Garage credentials, for the same reason the Postgres ones are fixed.
 * The key id must be `GK` followed by hex — Garage rejects any other shape, and
 * so does src/env.ts.
 */
export const GARAGE_ACCESS_KEY_ID = `GK${'2'.repeat(24)}`
export const GARAGE_SECRET_ACCESS_KEY = 'b'.repeat(64)
export const GARAGE_BUCKET = 'auth-e2e'
