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

  /**
   * Shared secrets proving that a call to `/api/zero/query` or
   * `/api/zero/mutate` came from zero-cache. It sends them in an `X-Api-Key`
   * header (`ZERO_QUERY_API_KEY` / `ZERO_MUTATE_API_KEY` on its side).
   *
   * These do not decide *which* user's data a request may read — the session
   * cookie does that, and it is checked independently. They keep the sync
   * engine's callbacks, which are reachable on the public app server, from
   * being an open endpoint for anyone to probe. Separate keys per endpoint so
   * read and write access can be rotated apart.
   *
   * zero-cache's own connection settings (`ZERO_UPSTREAM_DB`, `ZERO_CVR_DB`,
   * `ZERO_CHANGE_DB`, `ZERO_REPLICA_FILE`, `ZERO_ADMIN_PASSWORD`) are read by
   * that container, not by this app, so they live in `.env.example` and Compose
   * only — the same arrangement as the `POSTGRES_*` variables.
   */
  ZERO_QUERY_API_KEY: z.string().min(32),
  ZERO_MUTATE_API_KEY: z.string().min(32),

  /**
   * Where the app reaches Garage's S3 API — the `garage` service inside the
   * Compose stack, or the port docker-compose.override.yml publishes when the
   * server runs on the host.
   *
   * Server-only, and unlike zero-cache's address there is no argument for
   * exposing it: the browser never talks to Garage. Every PDF read and write is
   * proxied through this app server so file access is authorized in the same
   * place as every other piece of user data
   * (research/security-privacy/pdf-and-annotation-data-protection.md).
   */
  GARAGE_ENDPOINT: z.url({ protocol: /^https?$/ }),

  /**
   * The app's Garage credentials.
   *
   * Garage fixes the shape of an access key ID — the literal prefix `GK`
   * followed by hex — and rejects anything else at import time. Validating the
   * shape here turns a placeholder or a truncated paste into a startup error
   * naming the variable, rather than an `InvalidAccessKeyId` on the first
   * upload, long after the misconfiguration.
   */
  GARAGE_ACCESS_KEY_ID: z.string().regex(/^GK[0-9a-f]+$/, {
    message: 'must be a Garage access key ID: "GK" followed by hex',
  }),
  GARAGE_SECRET_ACCESS_KEY: z.string().min(32),

  /** The single bucket every uploaded PDF lands in; users are separated by key prefix. */
  GARAGE_BUCKET: z.string().min(1),

  /**
   * Where the extraction worker reaches GROBID's REST API — the `grobid`
   * service inside the Compose stack, or the port docker-compose.override.yml
   * publishes when the server runs on the host.
   *
   * Server-only, and never reachable from a browser: GROBID has no
   * authentication of its own, so the only thing keeping it private is that
   * nothing outside `app-internal` can address it.
   */
  GROBID_URL: z.url({ protocol: /^https?$/ }),
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
