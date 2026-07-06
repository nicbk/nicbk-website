import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseEnv } from './env'

/**
 * A minimal schema with a required variable, so the missing-required-var
 * failure path can be exercised even while the real app schema has no
 * required variables yet (see src/env.ts).
 */
const requiredVarSchema = z.object({
  REQUIRED_SECRET: z.string().min(1),
})

describe('parseEnv', () => {
  it('parses a valid environment and applies defaults', () => {
    const appSchema = z.object({
      NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),
      PORT: z.coerce.number().int().positive().default(3000),
    })

    const env = parseEnv(appSchema, {})

    expect(env).toEqual({ NODE_ENV: 'development', PORT: 3000 })
  })

  it('throws a message naming the variable when a required var is missing', () => {
    expect(() => parseEnv(requiredVarSchema, {})).toThrowError(
      /REQUIRED_SECRET/,
    )
  })

  it('throws a message naming the variable when a var is malformed', () => {
    const appSchema = z.object({
      PORT: z.coerce.number().int().positive().default(3000),
    })

    expect(() => parseEnv(appSchema, { PORT: 'not-a-port' })).toThrowError(
      /PORT/,
    )
  })
})
