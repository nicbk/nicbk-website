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
 * Everything the authentication feature needs is **required**: a missing
 * database URL or OAuth credential is a misconfiguration that should stop the
 * server immediately, not surface as a failed sign-in later. All of it is
 * server-only — never `VITE_`-prefixed, so no value can reach the client
 * bundle (research/devops-deployment/secrets-and-environment-config.md).
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  /** Port the app server listens on. */
  PORT: z.coerce.number().int().positive().default(3000),

  /**
   * Postgres connection string for the shared database (identity today, every
   * sub-app's data later). Points at the Compose `db` service in a container,
   * or at a local/forwarded Postgres in development.
   */
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  /**
   * Signing key for Better Auth's session tokens and state parameters.
   * Rotating it invalidates every existing session. 32 characters minimum so
   * a placeholder or truncated value fails loudly here rather than weakening
   * signatures silently.
   */
  BETTER_AUTH_SECRET: z.string().min(32),

  /**
   * The app's own public base URL (e.g. https://nicbk.com). Better Auth builds
   * OAuth callback URLs from it, so it must match the redirect URI registered
   * with Google exactly — set explicitly rather than inferred from the request,
   * which a proxy header could otherwise spoof.
   */
  BETTER_AUTH_URL: z.url(),

  /** OAuth client credentials for the Google provider (the only sign-in method). */
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
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
