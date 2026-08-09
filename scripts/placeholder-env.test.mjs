import { describe, expect, it } from 'vitest'
import { envSchema } from '../src/env.ts'
import { placeholderEnv } from './placeholder-env.mjs'

/**
 * Guards the shared placeholder environment against the schema it exists to
 * satisfy.
 *
 * Adding a required variable to `src/env.ts` breaks every tool that imports the
 * app's modules without a real `.env` — the test tiers, the Playwright config's
 * app server, and the Better Auth schema generator. That has happened twice,
 * and both times it surfaced as an unrelated-looking CI failure a job or a task
 * later: a server that refused to boot, a generator that could not read its own
 * config.
 *
 * This turns that into a named failure in `npm test`. It is deliberately a
 * check against the *schema* rather than a fixed list, so it keeps working for
 * variables nobody has added yet.
 */
describe('the shared placeholder environment', () => {
  it('satisfies the application environment schema', () => {
    // The real assertion: whatever `src/env.ts` requires today, these values
    // must parse. A missing or malformed one throws naming itself.
    expect(() => envSchema.parse(placeholderEnv)).not.toThrow()
  })

  it('names every required variable, so a new one cannot be forgotten', () => {
    const required = Object.entries(envSchema.shape)
      .filter(([, field]) => !field.safeParse(undefined).success)
      .map(([name]) => name)

    const missing = required.filter((name) => !(name in placeholderEnv))

    expect(missing).toEqual([])
  })

  it('holds nothing that looks like a real credential', () => {
    // These values reach CI logs and a committed config. Anything here that
    // parsed as a real secret would be a leak, so the set is kept obviously
    // fake by construction.
    for (const [name, value] of Object.entries(placeholderEnv)) {
      expect(
        value.includes('placeholder') ||
          value.includes('localhost') ||
          value.includes('unused') ||
          /^GK0+$/.test(value),
        `${name} should be an obvious non-value, got "${value}"`,
      ).toBe(true)
    }
  })
})
