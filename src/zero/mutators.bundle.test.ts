// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * What `mutators.ts` is allowed to reach, asserted by walking its imports.
 *
 * **Why this exists rather than a comment.** Every mutator runs in the browser
 * as well as on the server, so this module ends up in the client bundle — and
 * from #11 onwards it has consequences that must not. Deleting an article
 * removes a PDF from object storage and enqueues a job to do it, and the
 * modules for both hold credentials the browser must never be handed
 * (research/security-privacy/pdf-and-annotation-data-protection.md).
 *
 * Nothing else catches this. TypeScript is happy to import a server module into
 * a shared one; the unit tests run in Node, where the import resolves fine; and
 * the dev server bundles it without complaint. The symptom is a production
 * client bundle carrying the object store's SDK — or, if the environment
 * validation trips first, a blank page. So the rule is checked here, where
 * breaking it fails loudly the moment somebody adds the "obvious" import.
 *
 * The walk is over source text rather than a real resolver on purpose: it needs
 * no build, and the question is only which files reach which, which an import
 * statement answers plainly.
 */

const ROOT = resolve(import.meta.dirname, '../..')
const MUTATORS = resolve(import.meta.dirname, 'mutators.ts')

/**
 * Modules the client copy of a mutator must never pull in, and why.
 *
 * Matched against the module specifier as written, so both a bare package and a
 * path inside this project can be named.
 */
const FORBIDDEN = [
  // The bucket credentials, and the SDK that uses them.
  { pattern: /^~\/storage\//, reason: 'the object store client' },
  { pattern: /^@aws-sdk\//, reason: 'the S3 SDK' },
  // The queue and the database driver: server-side infrastructure, and the
  // route by which the storage client would arrive indirectly.
  { pattern: /^pg-boss$/, reason: 'the job queue' },
  { pattern: /^drizzle-orm/, reason: 'the database driver' },
  { pattern: /^~\/db\//, reason: "the database's own schema and client" },
  { pattern: /^~\/env$/, reason: 'the server-only validated environment' },
  // The seam that exists precisely so none of the above has to be here.
  {
    pattern: /^\.\/server-effects$/,
    reason: 'the server-only effect registry',
  },
] as const

/**
 * Every module specifier a file imports **at runtime**, as written.
 *
 * `import type` and `export type` are skipped, and that is the whole reason
 * this function is not one regex: they are erased before anything is bundled,
 * so they cannot put a byte of the named module in front of a browser. The rule
 * being checked is about what ships, not about what is named — and this project
 * already relies on the distinction, since `ownership.ts` reaches the session
 * type through a chain that ends at the database's own module.
 */
function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const specifiers: string[] = []
  const pattern =
    /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^'"\n]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g
  for (const match of source.matchAll(pattern)) {
    if (match[1] !== undefined) {
      continue
    }
    const specifier = match[2] ?? match[3] ?? match[4]
    if (specifier !== undefined) {
      specifiers.push(specifier)
    }
  }
  return specifiers
}

/** A project-local specifier as an absolute path, or null if it is a package. */
function resolveLocal(specifier: string, importer: string): string | null {
  const base = specifier.startsWith('~/')
    ? resolve(ROOT, 'src', specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(importer), specifier)
      : null
  if (base === null) {
    return null
  }
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    base,
  ]) {
    try {
      readFileSync(candidate, 'utf8')
      return candidate
    } catch {
      // Try the next extension.
    }
  }
  return null
}

/** Every project file reachable from `entry`, and how it was reached. */
function reachableFrom(entry: string): Map<string, string[]> {
  const paths = new Map<string, string[]>([[entry, [entry]]])
  const queue = [entry]

  while (queue.length > 0) {
    const file = queue.shift()
    if (file === undefined) {
      continue
    }
    const trail = paths.get(file) ?? [file]
    for (const specifier of importsOf(file)) {
      for (const { pattern, reason } of FORBIDDEN) {
        if (pattern.test(specifier)) {
          throw new Error(
            `${relative(ROOT, file)} imports ${reason} (${specifier}).\n` +
              `Reached from mutators.ts by: ${trail
                .map((step) => relative(ROOT, step))
                .join(' → ')}`,
          )
        }
      }
      const resolved = resolveLocal(specifier, file)
      if (resolved !== null && !paths.has(resolved)) {
        paths.set(resolved, [...trail, resolved])
        queue.push(resolved)
      }
    }
  }

  return paths
}

describe('the mutator module a browser loads', () => {
  it('reaches nothing the server alone may hold', () => {
    expect(() => reachableFrom(MUTATORS)).not.toThrow()
  })

  it('is actually walking something', () => {
    // A guard on the guard: a resolver that silently found nothing would make
    // the assertion above pass for the wrong reason, and it would keep passing
    // forever afterwards.
    const reached = reachableFrom(MUTATORS)

    expect(reached.size).toBeGreaterThan(3)
    expect([...reached.keys()]).toContain(
      resolve(import.meta.dirname, 'ownership.ts'),
    )
  })

  it('would notice if one of these imports appeared', () => {
    // The other half of the same worry: an assertion that cannot fail is not an
    // assertion. `server-effects.ts` is the module that legitimately holds what
    // `mutators.ts` must not — it is where the queue and the storage-bound job
    // were put precisely so they would be on this side of the line — so walking
    // it is a violation by construction.
    expect(() =>
      reachableFrom(resolve(import.meta.dirname, 'server-effects.ts')),
    ).toThrow(/^src\/zero\/server-effects\.ts imports /)
  })
})
