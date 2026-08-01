/**
 * Starts everything the sign-in e2e needs, then runs the app server in the
 * foreground so Playwright can own its lifetime as a `webServer` command.
 *
 * The ordinary e2e suite runs against an app with a placeholder database URL —
 * nothing in it touches Postgres. Signing in does: Better Auth stores the OAuth
 * state before the redirect and writes the user, account, and session rows on
 * the way back. So this tier brings its own database, the same way the
 * integration tier does, and for the same reason — a test that ran against a
 * hand-built schema could pass while the migrations that actually ship are
 * broken.
 *
 * Three things happen here before the server starts:
 *   1. a throwaway Postgres container (the image production runs),
 *   2. the committed migrations applied to it through the real migration
 *      script, not a shortcut,
 *   3. the stubbed Google token endpoint preloaded into the server process
 *      (see e2e-auth/support/google-token-endpoint-stub.mjs).
 *
 * Runs on its own port so it can coexist with a dev server or the ordinary e2e
 * suite on 3000.
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PostgreSqlContainer } from '@testcontainers/postgresql'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The same image the Compose stack and the integration tier run. */
const POSTGRES_IMAGE = 'postgres:18.4'

export const AUTH_E2E_PORT = 3100

const BASE_URL = `http://localhost:${AUTH_E2E_PORT}`
const GOOGLE_TOKEN_STUB = join(
  repoRoot,
  'e2e-auth/support/google-token-endpoint-stub.mjs',
)

const isCi = process.env.CI === 'true'

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

const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start()
const databaseUrl = container.getConnectionUri()

// Deliberately obvious non-values. Nothing here talks to the real Google — the
// client id only has to be the one the stubbed id token is minted for.
const appEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: 'auth-e2e-placeholder-secret-at-least-32-chars',
  BETTER_AUTH_URL: BASE_URL,
  GOOGLE_CLIENT_ID: 'auth-e2e-google-client-id',
  GOOGLE_CLIENT_SECRET: 'auth-e2e-google-client-secret',
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

await run('node', [join(repoRoot, 'scripts/migrate.mjs')], appEnv)

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
  : spawn('npm', ['run', 'dev', '--', '--port', String(AUTH_E2E_PORT)], {
      cwd: repoRoot,
      env: appEnv,
      stdio: 'inherit',
    })

async function shutDown(code) {
  server.kill('SIGTERM')
  // Testcontainers' reaper would eventually collect the container anyway; this
  // just makes a clean run leave nothing behind immediately.
  await container.stop().catch(() => {})
  process.exit(code)
}

process.on('SIGTERM', () => void shutDown(0))
process.on('SIGINT', () => void shutDown(0))
server.on('exit', (code) => void shutDown(code ?? 0))
