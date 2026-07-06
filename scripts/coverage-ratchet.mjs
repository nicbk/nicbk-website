/**
 * Ratchet-style coverage gate — fails if the PR's total line coverage
 * drops below the last recorded main-branch baseline. There is no fixed
 * percentage floor by design: coverage must never regress, but no number
 * has to be "cleared". See
 * research/testing-qa/test-coverage-and-ci-gating.md.
 *
 * Usage: node scripts/coverage-ratchet.mjs <current-summary> <baseline-summary>
 *
 * Both arguments are Vitest `json-summary` files
 * (coverage/coverage-summary.json). A missing baseline passes with a
 * notice — that's the bootstrap case before the first main-branch run has
 * published one, or after the baseline artifact has expired.
 */
import { existsSync, readFileSync } from 'node:fs'

const [, , currentPath, baselinePath] = process.argv
if (currentPath === undefined || baselinePath === undefined) {
  console.error(
    'usage: node scripts/coverage-ratchet.mjs <current-summary> <baseline-summary>',
  )
  process.exit(2)
}

function totalLinesPct(path) {
  const summary = JSON.parse(readFileSync(path, 'utf8'))
  const pct = summary.total?.lines?.pct
  if (typeof pct !== 'number') {
    throw new Error(`${path}: no total.lines.pct found`)
  }
  return pct
}

const current = totalLinesPct(currentPath)

if (!existsSync(baselinePath)) {
  console.log(
    `coverage ratchet: no baseline found at ${baselinePath} — passing ` +
      `(bootstrap case). Current line coverage: ${current}%.`,
  )
  process.exit(0)
}

const baseline = totalLinesPct(baselinePath)
console.log(
  `coverage ratchet: current ${current}% vs main baseline ${baseline}%`,
)

if (current < baseline) {
  console.error(
    `coverage ratchet: FAIL — line coverage dropped ${baseline}% → ${current}%. ` +
      'Add or restore unit tests so coverage does not regress.',
  )
  process.exit(1)
}

console.log('coverage ratchet: OK — coverage did not drop.')
