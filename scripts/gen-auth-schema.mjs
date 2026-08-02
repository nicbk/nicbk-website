/**
 * Regenerate src/db/schema/identity.ts — the Drizzle definition of Better
 * Auth's core identity tables (user / session / account / verification) — from
 * the auth configuration in src/auth/auth.ts.
 *
 * It is the only generated file under src/db/schema/; its hand-written
 * siblings (and the index.ts that re-exports both) are never touched here,
 * which is why the generated tables live in their own file at all.
 *
 * Better Auth decides what those tables must contain; which columns exist is a
 * property of the library version and the plugins enabled, not a design choice
 * this project makes. So the schema is generated rather than hand-written, the
 * same "derive, don't hand-type" rule the GPG artifacts follow: upgrading
 * Better Auth or enabling a plugin changes the tables here by regeneration, and
 * CI's drift check fails if the committed file no longer matches what the
 * current configuration produces.
 *
 * PROCEDURE (after changing the auth config or upgrading better-auth):
 *   1. Run: node scripts/gen-auth-schema.mjs
 *   2. Run: npx drizzle-kit generate   (turns the schema delta into SQL)
 *   3. Commit the regenerated schema and the new migration.
 *
 * Determinism: the CLI's output is a pure function of the auth config, and the
 * Biome pass afterwards normalizes formatting to this project's style — so the
 * committed file is stable run-to-run, which the drift check depends on.
 *
 * The generator needs the auth config to import cleanly, and that config reads
 * the validated environment. It never connects to the database, so placeholder
 * values are enough and are supplied here rather than requiring a real .env.
 */
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Environment that satisfies src/env.ts without pointing at anything real.
 * The secret only has to clear the schema's 32-character minimum.
 */
const placeholderEnv = {
  DATABASE_URL: 'postgres://schema:generation@localhost:5432/unused',
  BETTER_AUTH_SECRET: 'schema-generation-placeholder-secret-value',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'schema-generation-placeholder',
  GOOGLE_CLIENT_SECRET: 'schema-generation-placeholder',
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...placeholderEnv },
  })
}

// Pinned to the installed better-auth version: the CLI must generate the
// schema of the library actually in use, not whatever is newest on npm.
run('npx', [
  '--yes',
  'auth@1.6.25',
  'generate',
  '--config',
  'src/auth/auth.ts',
  '--output',
  'src/db/schema/identity.ts',
  '--yes',
])

// The CLI emits its own formatting (double quotes, semicolons); normalize to
// the project's Biome style so the committed file is consistent with every
// other source file — and so the drift check compares like with like.
run('npx', ['biome', 'check', '--write', 'src/db/schema/identity.ts'])
