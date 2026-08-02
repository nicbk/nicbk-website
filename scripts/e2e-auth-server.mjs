/**
 * Starts everything the signed-in e2e tier needs, then runs the app server in
 * the foreground so Playwright can own its lifetime as a `webServer` command.
 *
 * The ordinary e2e suite runs against an app with a placeholder database URL —
 * nothing in it touches Postgres. Everything in this tier does: signing in
 * writes the user, account, and session rows, and the Lit Tracker reads and
 * syncs rows that belong to that session. So this tier brings its own database,
 * the same way the integration tier does, and for the same reason — a test that
 * ran against a hand-built schema could pass while the migrations that actually
 * ship are broken.
 *
 * Five things happen here before the server starts:
 *   1. a private Docker network, so the containers can address each other,
 *   2. a throwaway Postgres container (the image production runs) with logical
 *      replication turned on, which is what Zero subscribes to,
 *   3. the committed migrations applied to it through the real migration
 *      script, not a shortcut — this is also what creates the `zero_data`
 *      publication zero-cache reads at startup,
 *   4. a zero-cache container (the image production runs) replicating from it,
 *   5. the stubbed Google token endpoint preloaded into the server process
 *      (see e2e-auth/support/google-token-endpoint-stub.mjs).
 *
 * Runs on its own ports so it can coexist with a dev server, the ordinary e2e
 * suite on 3000, or a local Compose stack's zero-cache on 4848.
 */
import { execFileSync, spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, Network, Wait } from 'testcontainers'
import {
  AUTH_E2E_BASE_URL,
  AUTH_E2E_PORT,
  DATABASE_URL,
  INTERNAL_DATABASE_URL,
  POSTGRES_DB,
  POSTGRES_HOST_PORT,
  POSTGRES_NETWORK_ALIAS,
  POSTGRES_PASSWORD,
  POSTGRES_USER,
  ZERO_CACHE_HOST_PORT,
  ZERO_CACHE_URL,
} from '../e2e-auth/support/services.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The same image the Compose stack and the integration tier run. */
const POSTGRES_IMAGE = 'postgres:18.4'

/** The same image the Compose stack runs, pinned with it. */
const ZERO_CACHE_IMAGE = 'rocicorp/zero:1.8.0'

const ZERO_CACHE_PORT = 4848

/**
 * How a container reaches the app server, which runs on the host rather than in
 * the network. Docker Desktop provides this name natively; the `host-gateway`
 * mapping below is what makes it resolve on Linux, which is where CI runs.
 */
const HOST_FROM_CONTAINER = 'host.docker.internal'

const GOOGLE_TOKEN_STUB = join(
  repoRoot,
  'e2e-auth/support/google-token-endpoint-stub.mjs',
)

const isCi = process.env.CI === 'true'

// Deliberately obvious non-values. Nothing here talks to the real Google or the
// real sync engine's peers; these only have to be the same on both sides of
// each check, and to clear the schema's minimum lengths.
const ZERO_QUERY_API_KEY = 'auth-e2e-placeholder-zero-query-api-key'
const ZERO_MUTATE_API_KEY = 'auth-e2e-placeholder-zero-mutate-api-key'

/** Runs a command to completion, inheriting stdio; rejects on a non-zero exit. */
function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
      shell: false,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
      }
    })
  })
}

/**
 * Marks this tier's containers so an interrupted run's leftovers can be found.
 *
 * Playwright stops its `webServer` by killing the process, and it does not
 * always wait for the handler below to finish stopping containers. Testcontainers'
 * reaper collects them eventually, but "eventually" is longer than the gap
 * between two `npm run test:e2e:auth` invocations — and because this tier uses
 * fixed host ports, one survivor makes the next run fail at startup with a port
 * conflict rather than anything to do with the tests.
 */
const TIER_LABEL = 'com.nicbk.test-tier=auth-e2e'

/** Removes containers left behind by a previous, interrupted run. */
function removeLeftovers() {
  try {
    const ids = execFileSync(
      'docker',
      ['ps', '-aq', '--filter', `label=${TIER_LABEL}`],
      { encoding: 'utf8' },
    )
      .split('\n')
      .filter((id) => id !== '')
    if (ids.length > 0) {
      console.log(`removing ${ids.length} container(s) from a previous run`)
      execFileSync('docker', ['rm', '-f', ...ids], { stdio: 'ignore' })
    }
  } catch {
    // Docker not reachable, or nothing to remove. Starting the containers
    // below will produce the real error if it is the former.
  }
}

removeLeftovers()

const network = await new Network().start()

const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
  .withLabels({ 'com.nicbk.test-tier': 'auth-e2e' })
  // Zero replicates over logical decoding, which Postgres does not enable by
  // default — the same flag docker-compose.yml passes.
  .withCommand(['postgres', '-c', 'wal_level=logical'])
  .withNetwork(network)
  .withNetworkAliases(POSTGRES_NETWORK_ALIAS)
  // Fixed credentials and a fixed published port, so the spec process can build
  // the same connection string without being handed one. See services.mjs.
  .withUsername(POSTGRES_USER)
  .withPassword(POSTGRES_PASSWORD)
  .withDatabase(POSTGRES_DB)
  .withExposedPorts({ container: 5432, host: POSTGRES_HOST_PORT })
  .start()

const appEnv = {
  ...process.env,
  DATABASE_URL,
  BETTER_AUTH_SECRET: 'auth-e2e-placeholder-secret-at-least-32-chars',
  BETTER_AUTH_URL: AUTH_E2E_BASE_URL,
  GOOGLE_CLIENT_ID: 'auth-e2e-google-client-id',
  GOOGLE_CLIENT_SECRET: 'auth-e2e-google-client-secret',
  ZERO_QUERY_API_KEY,
  ZERO_MUTATE_API_KEY,
  // Where the browser dials zero-cache. Vite inlines this into the client
  // bundle at build time, which is why that port is fixed. No proxy is
  // involved: cookies are keyed by host and ignore the port, so the session
  // cookie set on localhost:3100 is sent to zero-cache as well.
  VITE_ZERO_CACHE_URL: ZERO_CACHE_URL,
  PORT: String(AUTH_E2E_PORT),
  // NODE_OPTIONS rather than an argv flag so the stub survives the `npm run`
  // wrapper: it is inherited by whatever child process ends up being the
  // server.
  NODE_OPTIONS: [
    process.env.NODE_OPTIONS ?? '',
    `--import ${pathToFileURL(GOOGLE_TOKEN_STUB).href}`,
  ]
    .join(' ')
    .trim(),
}

// Before zero-cache: it reads the `zero_data` publication at startup, and that
// publication is created by migration 0001.
await run('node', [join(repoRoot, 'scripts/migrate.mjs')], appEnv)

const zeroCache = await new GenericContainer(ZERO_CACHE_IMAGE)
  .withLabels({ 'com.nicbk.test-tier': 'auth-e2e' })
  .withNetwork(network)
  // The query and mutate endpoints live on the app server, which runs on the
  // host in this tier rather than as a fourth container.
  .withExtraHosts([{ host: HOST_FROM_CONTAINER, ipAddress: 'host-gateway' }])
  .withEnvironment({
    ZERO_UPSTREAM_DB: INTERNAL_DATABASE_URL,
    ZERO_CVR_DB: INTERNAL_DATABASE_URL,
    ZERO_CHANGE_DB: INTERNAL_DATABASE_URL,
    ZERO_APP_PUBLICATIONS: 'zero_data',
    // Inside the container and thrown away with it: the replica is derived
    // state, and every run starts from an empty database anyway.
    ZERO_REPLICA_FILE: '/tmp/replica.db',
    ZERO_ADMIN_PASSWORD: 'auth-e2e-placeholder-zero-admin-password',
    ZERO_QUERY_URL: `http://${HOST_FROM_CONTAINER}:${AUTH_E2E_PORT}/api/zero/query`,
    ZERO_MUTATE_URL: `http://${HOST_FROM_CONTAINER}:${AUTH_E2E_PORT}/api/zero/mutate`,
    ZERO_QUERY_API_KEY,
    ZERO_MUTATE_API_KEY,
    // The whole point of this tier's Zero coverage: the browser's session
    // cookie is forwarded to /query, which is how it knows who is asking.
    ZERO_QUERY_FORWARD_COOKIES: 'true',
    ZERO_MUTATE_FORWARD_COOKIES: 'true',
    // Off in production, so off here — a client that could write directly
    // would bypass the one authorized path.
    ZERO_ENABLE_CRUD_MUTATIONS: 'false',
  })
  .withExposedPorts({ container: ZERO_CACHE_PORT, host: ZERO_CACHE_HOST_PORT })
  // Answering /keepalive means it has replicated the publication and is
  // serving; starting the app before that would only make the first test wait.
  .withWaitStrategy(Wait.forHttp('/keepalive', ZERO_CACHE_PORT))
  .withStartupTimeout(180_000)
  .start()

// Locally the dev server keeps the edit-run loop short; in CI the built
// production server is what gets exercised, matching playwright.config.ts.
if (isCi) {
  await run('npm', ['run', 'build'], appEnv)
}
const server = isCi
  ? spawn('node', [join(repoRoot, '.output/server/index.mjs')], {
      cwd: repoRoot,
      env: appEnv,
      stdio: 'inherit',
    })
  : // --host: Vite's dev server binds localhost only by default, and
    // zero-cache calls back to the app from inside a container, which cannot
    // reach a loopback-bound socket. The production server (the CI branch
    // above) already binds all interfaces.
    spawn(
      'npm',
      ['run', 'dev', '--', '--port', String(AUTH_E2E_PORT), '--host'],
      {
        cwd: repoRoot,
        env: appEnv,
        stdio: 'inherit',
      },
    )

async function shutDown(code) {
  server.kill('SIGTERM')
  // Testcontainers' reaper would eventually collect these anyway; this just
  // makes a clean run leave nothing behind immediately. Order matters only in
  // that zero-cache holds a replication slot on the database.
  await zeroCache.stop().catch(() => {})
  await container.stop().catch(() => {})
  await network.stop().catch(() => {})
  process.exit(code)
}

process.on('SIGTERM', () => void shutDown(0))
process.on('SIGINT', () => void shutDown(0))
server.on('exit', (code) => void shutDown(code ?? 0))
