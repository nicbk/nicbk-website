/**
 * Regenerate src/zero/schema.gen.ts — Zero's view of the database — from the
 * Drizzle schema, via `drizzle-zero`.
 *
 * The same "derive, don't hand-type" rule the identity schema and the GPG
 * artifacts follow (see scripts/gen-auth-schema.mjs): the shape of the data is
 * decided once, in Drizzle, and every other description of it is generated from
 * that one. CI's drift check fails if the committed file no longer matches what
 * the current schema produces, so a new column cannot reach Postgres while Zero
 * still believes in the old table.
 *
 * PROCEDURE (after changing src/db/schema/lit-tracker.ts):
 *   1. Run: node scripts/gen-zero-schema.mjs
 *   2. Run: npx drizzle-kit generate   (turns the schema delta into SQL)
 *   3. If the change adds a table, add it to drizzle-zero.config.ts AND to the
 *      `zero_data` publication, in the same migration.
 *   4. Commit the regenerated schema and the new migration.
 *
 * Which tables and columns are included is decided in drizzle-zero.config.ts,
 * not here.
 *
 * The legacy CRUD flags (`--enable-legacy-mutators`, `--enable-legacy-queries`)
 * are deliberately absent. Zero's current model is named queries plus custom
 * mutators, both resolved by this app's own endpoints, which is what makes
 * `/query` the single authorization boundary for user data
 * (research/system-architecture/data-sharing-boundaries.md). Turning the legacy
 * paths on would let clients issue writes that never pass through it.
 */
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const OUTPUT = 'src/zero/schema.gen.ts'

function run(command, args) {
  execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit' })
}

run('npx', [
  'drizzle-zero',
  'generate',
  '--config',
  'drizzle-zero.config.ts',
  '--output',
  OUTPUT,
  // The generator stamps a signature of its own output into the file and
  // refuses to overwrite one that no longer matches — a guard against
  // clobbering hand edits. The Biome pass below rewrites the formatting on
  // purpose, so that guard always trips here and the overwrite is intended.
  '--force',
])

// The generator emits its own formatting; normalize to the project's Biome
// style so the committed file matches every other source file — and so the
// drift check compares like with like.
run('npx', ['biome', 'check', '--write', OUTPUT])
