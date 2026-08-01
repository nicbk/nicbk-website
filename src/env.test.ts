import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { envSchema, parseEnv } from './env'

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

/** A complete, well-formed environment for the real application schema. */
const validEnvironment = {
  DATABASE_URL: 'postgres://nicbk:secret@db:5432/nicbk',
  BETTER_AUTH_SECRET: 'a'.repeat(48),
  BETTER_AUTH_URL: 'https://nicbk.com',
  GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'client-secret',
}

describe('the application environment schema', () => {
  it('accepts a complete configuration and defaults the optional values', () => {
    const env = parseEnv(envSchema, validEnvironment)

    expect(env.DATABASE_URL).toBe(validEnvironment.DATABASE_URL)
    expect(env.BETTER_AUTH_URL).toBe(validEnvironment.BETTER_AUTH_URL)
    expect(env).toMatchObject({ NODE_ENV: 'development', PORT: 3000 })
  })

  it.each([
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ])('refuses to start without %s', (variable) => {
    const incomplete: Record<string, string> = { ...validEnvironment }
    delete incomplete[variable]

    expect(() => parseEnv(envSchema, incomplete)).toThrowError(
      new RegExp(variable),
    )
  })

  it('rejects a session secret too short to be a real key', () => {
    // A truncated or placeholder secret weakens every signature it produces,
    // so it must fail at startup rather than quietly work.
    expect(() =>
      parseEnv(envSchema, { ...validEnvironment, BETTER_AUTH_SECRET: 'short' }),
    ).toThrowError(/BETTER_AUTH_SECRET/)
  })

  it('rejects a database URL that does not address Postgres', () => {
    // Not just "is it URL-shaped": mysql://… or a bare host:port is a
    // misconfiguration that should stop startup, not fail at first query.
    expect(() =>
      parseEnv(envSchema, {
        ...validEnvironment,
        DATABASE_URL: 'mysql://nicbk:secret@db:3306/nicbk',
      }),
    ).toThrowError(/DATABASE_URL/)
    expect(() =>
      parseEnv(envSchema, { ...validEnvironment, DATABASE_URL: 'db:5432' }),
    ).toThrowError(/DATABASE_URL/)
  })

  it('keeps every variable server-only', () => {
    // A VITE_-prefixed variable is inlined into the client bundle by Vite.
    // None of this configuration may ever be, so the prohibition is asserted
    // rather than left to review
    // (research/devops-deployment/secrets-and-environment-config.md).
    const declared = Object.keys(parseEnv(envSchema, validEnvironment))

    expect(declared.filter((name) => name.startsWith('VITE_'))).toEqual([])
  })
})
