import { z } from 'zod'

/**
 * Zod schema over `process.env`.
 *
 * Every variable the app reads must be declared here, and documented in the
 * committed `.env.example`. This module is imported first at the server
 * entry (`src/server.ts`), so missing or malformed configuration fails at
 * startup with a clear error instead of surfacing as a confusing failure at
 * first use. See research/coding-conventions/file-hierarchy-and-complexity.md.
 *
 * No variable is required yet — this walking-skeleton slice has no secrets
 * or external services. Later features (auth, lit-tracker) add their
 * variables to this schema as required fields.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  /** Port the app server listens on. */
  PORT: z.coerce.number().int().positive().default(3000),
})

export type Env = z.infer<typeof envSchema>

/**
 * Parses an environment against a schema, throwing an error that names each
 * offending variable when validation fails.
 *
 * Kept as a plain exported function (rather than inlining the parse at
 * module level) so unit tests can exercise both success and failure paths
 * directly — including against test-only schemas — without mutating the
 * real `process.env`.
 */
export function parseEnv<Schema extends z.ZodType>(
  schema: Schema,
  source: Record<string, string | undefined>,
): z.output<Schema> {
  const result = schema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Invalid environment configuration — fix the following variable(s):\n${details}`,
    )
  }
  return result.data
}

/** The validated environment. Import this instead of reading `process.env`. */
export const env: Env = parseEnv(envSchema, process.env)
