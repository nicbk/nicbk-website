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
 * Eight things happen here before the server starts:
 *   1. a private Docker network, so the containers can address each other,
 *   2. a throwaway Postgres container (the image production runs) with logical
 *      replication turned on, which is what Zero subscribes to,
 *   3. the committed migrations applied to it through the real migration
 *      script, not a shortcut — this is also what creates the `zero_data`
 *      publication zero-cache reads at startup,
 *   4. a zero-cache container (the image production runs) replicating from it,
 *   5. a Garage container, bootstrapped through the same module the Compose job
 *      uses, so an upload has somewhere real to land,
 *   6. the stubbed Google token endpoint preloaded into the server process
 *      (see e2e-auth/support/google-token-endpoint-stub.mjs),
 *   7. a stubbed GROBID on its own port, which the app is simply pointed at —
 *      a config swap rather than a patch (see e2e-auth/support/grobid-stub.mjs),
 *   8. a stubbed Semantic Scholar on another, by the same mechanism (see
 *      e2e-auth/support/semantic-scholar-stub.mjs).
 *
 * Runs on its own ports so it can coexist with a dev server, the ordinary e2e
 * suite on 3000, or a local Compose stack's zero-cache on 4848.
 */
import { execFileSync, spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, Network, Wait } from 'testcontainers'
import { startGrobidStub } from '../e2e-auth/support/grobid-stub.mjs'
import { startSemanticScholarStub } from '../e2e-auth/support/semantic-scholar-stub.mjs'
import {
  AUTH_E2E_BASE_URL,
  AUTH_E2E_PORT,
  DATABASE_URL,
  GARAGE_ACCESS_KEY_ID,
  GARAGE_BUCKET,
  GARAGE_ENDPOINT,
  GARAGE_HOST_PORT,
  GARAGE_SECRET_ACCESS_KEY,
  GROBID_STUB_PORT,
  GROBID_URL,
  INTERNAL_DATABASE_URL,
  POSTGRES_DB,
  POSTGRES_HOST_PORT,
  POSTGRES_NETWORK_ALIAS,
  POSTGRES_PASSWORD,
  POSTGRES_USER,
  SEMANTIC_SCHOLAR_STUB_PORT,
  SEMANTIC_SCHOLAR_URL,
  ZERO_CACHE_HOST_PORT,
  ZERO_CACHE_URL,
} from '../e2e-auth/support/services.mjs'
import { bootstrapGarage } from './garage-bootstrap.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The same image the Compose stack and the integration tier run. */
const POSTGRES_IMAGE = 'postgres:18.4'

/** The same image the Compose stack runs, pinned with it. */
const ZERO_CACHE_IMAGE = 'rocicorp/zero:1.8.0'

const ZERO_CACHE_PORT = 4848

/** Likewise pinned with docker-compose.yml. */
const GARAGE_IMAGE = 'dxflrs/garage:v2.3.0'

const GARAGE_S3_PORT = 3900
const GARAGE_ADMIN_PORT = 3903
const GARAGE_ADMIN_TOKEN = 'auth-e2e-placeholder-garage-admin-token'

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
  // The app server runs on the host in this tier, so it reaches Garage through
  // the published port rather than the container network.
  GARAGE_ENDPOINT,
  GARAGE_ACCESS_KEY_ID,
  GARAGE_SECRET_ACCESS_KEY,
  GARAGE_BUCKET,
  // The stubbed extraction and enrichment services, started below. Pointing at
  // them is the whole of the mocking here — nothing in the app is patched.
  GROBID_URL,
  SEMANTIC_SCHOLAR_URL,
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

const garage = await new GenericContainer(GARAGE_IMAGE)
  .withLabels({ 'com.nicbk.test-tier': 'auth-e2e' })
  .withNetwork(network)
  .withEnvironment({
    GARAGE_RPC_SECRET: '0'.repeat(64),
    GARAGE_ADMIN_TOKEN,
  })
  .withCopyContentToContainer([
    {
      content: `
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:${GARAGE_S3_PORT}"
root_domain = ".s3.garage.internal"

[admin]
api_bind_addr = "[::]:${GARAGE_ADMIN_PORT}"
`,
      target: '/etc/garage.toml',
    },
  ])
  .withExposedPorts(
    { container: GARAGE_S3_PORT, host: GARAGE_HOST_PORT },
    GARAGE_ADMIN_PORT,
  )
  // Not the default port-listening strategy: it probes from *inside* the
  // container with a shell command, and the Garage image is `scratch` plus one
  // static binary — there is no shell for it to run, so it times out while
  // Garage is in fact listening.
  .withWaitStrategy(Wait.forLogMessage(/S3 API server listening/))
  .withStartupTimeout(180_000)
  .start()

// The same module the Compose job runs: a fresh node has no cluster layout and
// answers no S3 request until one is applied.
await bootstrapGarage({
  adminUrl: `http://${garage.getHost()}:${garage.getMappedPort(GARAGE_ADMIN_PORT)}`,
  adminToken: GARAGE_ADMIN_TOKEN,
  accessKeyId: GARAGE_ACCESS_KEY_ID,
  secretAccessKey: GARAGE_SECRET_ACCESS_KEY,
  bucket: GARAGE_BUCKET,
})

// In this process rather than a container: the extraction worker runs inside
// the app server, which runs on the host in this tier, so there is nothing for
// a container to be closer to. See e2e-auth/support/grobid-stub.mjs.
const grobidStub = await startGrobidStub(GROBID_STUB_PORT)
// Mocked for the reason above and for one more: the real Semantic Scholar is a
// pool shared with every other unauthenticated caller, so a suite pointed at it
// would pass or fail depending on how busy the internet was.
const semanticScholarStub = await startSemanticScholarStub(
  SEMANTIC_SCHOLAR_STUB_PORT,
)

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
  await grobidStub.close().catch(() => {})
  await semanticScholarStub.close().catch(() => {})
  await zeroCache.stop().catch(() => {})
  await garage.stop().catch(() => {})
  await container.stop().catch(() => {})
  await network.stop().catch(() => {})
  process.exit(code)
}

process.on('SIGTERM', () => void shutDown(0))
process.on('SIGINT', () => void shutDown(0))
server.on('exit', (code) => void shutDown(code ?? 0))
