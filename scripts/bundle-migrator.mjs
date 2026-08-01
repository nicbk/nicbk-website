/**
 * Bundle scripts/migrate.mjs, with its dependencies, into a single standalone
 * file that Node can run with no node_modules present.
 *
 * The production image deliberately carries no node_modules — `.output/` is
 * self-contained (see the Dockerfile) — but the Compose `pre_start` migration
 * step still has to run Drizzle's migrator inside that image. Bundling is what
 * lets it: one file, no install step, no build tooling shipped.
 *
 * Both the dev and production stages write the bundle to the same absolute
 * path, OUTSIDE /app, so a single `pre_start` command works against either
 * image. Outside /app specifically because docker-compose.override.yml bind
 * mounts the host checkout over /app in development, which would otherwise
 * hide anything the image had placed there.
 */
import { build } from 'esbuild'

/** Where both image stages place the bundle. */
export const MIGRATOR_BUNDLE_PATH = '/usr/local/lib/migrate.mjs'

await build({
  entryPoints: ['scripts/migrate.mjs'],
  outfile: process.argv[2] ?? MIGRATOR_BUNDLE_PATH,
  bundle: true,
  platform: 'node',
  format: 'esm',
  // `pg` is CommonJS and calls require() for Node builtins at load time. In an
  // ESM bundle there is no require, so provide one — resolving builtins needs
  // no node_modules.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'\nconst require = __createRequire(import.meta.url)",
  },
})
