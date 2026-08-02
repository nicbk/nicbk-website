import { eq } from 'drizzle-orm'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { createDatabase } from '~/db/create-database'
import * as schema from '~/db/schema'
import type { TestDatabase } from '~/db/test-support/test-database'
import { startTestDatabase } from '~/db/test-support/test-database'
import type { Auth } from './create-auth'
import { createAuth } from './create-auth'
import { getSessionFrom } from './session'

/**
 * Integration coverage for the auth backend: real Postgres (Testcontainers),
 * the real committed migrations, the real Drizzle adapter, and Better Auth's
 * real HTTP surface. Only Google's own endpoints are stubbed — its login UI
 * can't be driven, and no test should depend on a third party being up
 * (research/testing-qa/mocking-external-services.md).
 *
 * What this proves, which no unit test can: the schema the migrations create
 * is the schema Better Auth writes to, and a session survives a full round
 * trip — sign-in redirect → OAuth callback → Set-Cookie → session read —
 * carrying the cookie hardening the config asks for.
 */

/** https, so the Secure cookie attribute is exercised as in production. */
const BASE_URL = 'https://app.test'
const GOOGLE_CLIENT_ID = 'test-google-client-id'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

const GOOGLE_ACCOUNT = {
  sub: 'google-user-1234567890',
  email: 'reader@example.com',
  name: 'Test Reader',
}

/** Session lifetime configured in create-auth.ts, in seconds. */
const EXPECTED_SESSION_MAX_AGE = 60 * 60 * 24 * 7

let testDatabase: TestDatabase
let database: DatabaseHandle
let auth: Auth

beforeAll(async () => {
  testDatabase = await startTestDatabase()
  // Pulling and starting Postgres, then migrating, can take a while on a cold
  // Docker cache.
}, 180_000)

afterAll(async () => {
  await testDatabase.stop()
})

beforeEach(async () => {
  // Back to a migrated-but-empty database. The pool must be opened after the
  // restore — it drops and recreates the database underneath any open
  // connection (see test-database.ts).
  await testDatabase.reset()
  database = createDatabase(testDatabase.connectionString)
  auth = createAuth(database, {
    baseURL: BASE_URL,
    secret: 'integration-test-secret-value-at-least-32-chars',
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: 'test-google-client-secret',
    },
    trustedOrigins: [BASE_URL],
    useSecureCookies: true,
  })
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await database.pool.end()
})

/**
 * A JWT shaped like Google's `id_token`. Better Auth reads the profile out of
 * it by decoding, not by verifying a signature (the token arrives directly
 * from the token endpoint over TLS), so a syntactically valid token with a
 * placeholder signature is what the code path actually consumes.
 */
function googleIdToken(): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const issuedAt = Math.floor(Date.now() / 1000)
  return [
    encode({ alg: 'RS256', typ: 'JWT', kid: 'test-key' }),
    encode({
      iss: 'https://accounts.google.com',
      aud: GOOGLE_CLIENT_ID,
      sub: GOOGLE_ACCOUNT.sub,
      email: GOOGLE_ACCOUNT.email,
      email_verified: true,
      name: GOOGLE_ACCOUNT.name,
      picture: 'https://example.com/avatar.png',
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
    'test-signature-not-verified',
  ].join('.')
}

/**
 * Stubs Google's token endpoint — the only network call the callback makes.
 * Anything else reaching the network is a bug in the test, so it throws.
 */
function stubGoogleTokenEndpoint(): void {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url.startsWith(GOOGLE_TOKEN_ENDPOINT)) {
      return Response.json({
        access_token: 'test-google-access-token',
        refresh_token: 'test-google-refresh-token',
        id_token: googleIdToken(),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      })
    }
    throw new Error(`Unexpected outbound request in test: ${url}`)
  })
}

/** Joins Set-Cookie headers into a Cookie request header. */
function toCookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

/** The Set-Cookie line for a named cookie, if the response sets one. */
function setCookieFor(response: Response, name: string): string | undefined {
  return response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${name}=`))
}

/**
 * Runs the whole Google sign-in round trip against the auth handler and
 * returns the callback response (which carries the session cookie).
 */
async function signInWithGoogle(): Promise<Response> {
  const start = await auth.handler(
    new Request(`${BASE_URL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE_URL },
      body: JSON.stringify({ provider: 'google', callbackURL: '/' }),
    }),
  )
  expect(start.status).toBe(200)

  const { url } = (await start.json()) as { url: string }
  const state = new URL(url).searchParams.get('state')
  expect(state).toBeTruthy()

  stubGoogleTokenEndpoint()

  return auth.handler(
    new Request(
      `${BASE_URL}/api/auth/callback/google?state=${state}&code=test-authorization-code`,
      { headers: { cookie: toCookieHeader(start) } },
    ),
  )
}

/**
 * Posts to an authenticated endpoint the way the browser client does: the
 * session cookie from sign-in, plus an Origin header — Better Auth's origin
 * check is this app's CSRF protection, so a request without one is not the
 * request the app actually makes.
 */
async function postSignedIn(
  path: string,
  cookie: string,
  body: unknown = {},
): Promise<Response> {
  return auth.handler(
    new Request(`${BASE_URL}/api/auth/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: BASE_URL,
        cookie,
      },
      body: JSON.stringify(body),
    }),
  )
}

describe('auth backend', () => {
  it('sends the reader to Google with this app as the client', async () => {
    const response = await auth.handler(
      new Request(`${BASE_URL}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: BASE_URL },
        body: JSON.stringify({ provider: 'google', callbackURL: '/' }),
      }),
    )

    const { url } = (await response.json()) as { url: string }
    const authorizeUrl = new URL(url)
    expect(authorizeUrl.hostname).toBe('accounts.google.com')
    expect(authorizeUrl.searchParams.get('client_id')).toBe(GOOGLE_CLIENT_ID)
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe(
      `${BASE_URL}/api/auth/callback/google`,
    )
  })

  it('creates the identity rows the migrations define', async () => {
    await signInWithGoogle()

    const users = await database.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, GOOGLE_ACCOUNT.email))
    expect(users).toHaveLength(1)
    const [reader] = users
    if (!reader) throw new Error('expected the signed-in reader to exist')
    expect(reader.name).toBe(GOOGLE_ACCOUNT.name)

    const accounts = await database.db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, reader.id))
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.providerId).toBe('google')
    expect(accounts[0]?.accountId).toBe(GOOGLE_ACCOUNT.sub)

    const sessions = await database.db
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, reader.id))
    expect(sessions).toHaveLength(1)
  })

  it('sets a session cookie with the configured hardening', async () => {
    const callback = await signInWithGoogle()

    const sessionCookie = setCookieFor(
      callback,
      '__Secure-better-auth.session_token',
    )
    expect(sessionCookie).toBeDefined()
    // Not readable from JavaScript, not sent over plain HTTP, and not attached
    // to cross-site subrequests — the posture create-auth.ts states explicitly.
    expect(sessionCookie).toMatch(/HttpOnly/i)
    expect(sessionCookie).toMatch(/Secure/i)
    expect(sessionCookie).toMatch(/SameSite=Lax/i)
    expect(sessionCookie).toMatch(
      new RegExp(`Max-Age=${EXPECTED_SESSION_MAX_AGE}\\b`, 'i'),
    )
  })

  it('reads the signed-in reader back from the session cookie', async () => {
    const callback = await signInWithGoogle()

    const session = await getSessionFrom(
      auth,
      new Request(BASE_URL, { headers: { cookie: toCookieHeader(callback) } }),
    )

    expect(session?.user.email).toBe(GOOGLE_ACCOUNT.email)
    expect(session?.session.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('reports no session for an absent or tampered-with cookie', async () => {
    const callback = await signInWithGoogle()
    const [name, value] = toCookieHeader(callback).split('=')

    expect(await getSessionFrom(auth, new Request(BASE_URL))).toBeNull()
    expect(
      await getSessionFrom(
        auth,
        // Same cookie, one character changed: the signature no longer matches,
        // so it must be rejected rather than looked up.
        new Request(BASE_URL, {
          headers: { cookie: `${name}=${value?.slice(0, -1)}x` },
        }),
      ),
    ).toBeNull()
  })
})

/**
 * The two actions the user-settings modal fires. Both are irreversible from
 * the browser's point of view, and both are meaningless unless the server
 * really acted — which is exactly what a mocked client can't tell you, so they
 * are asserted here against the real endpoints and the real rows.
 */
describe('account actions', () => {
  /** Reads a session straight from the cookie, as the app does per request. */
  async function sessionFor(cookie: string) {
    return getSessionFrom(auth, new Request(BASE_URL, { headers: { cookie } }))
  }

  it('invalidates the session server-side on log out', async () => {
    const cookie = toCookieHeader(await signInWithGoogle())
    expect(await sessionFor(cookie)).not.toBeNull()

    const response = await postSignedIn('sign-out', cookie)
    expect(response.status).toBe(200)

    // The cookie is cleared in the browser too, but that is not what makes it
    // safe: the row behind it is gone, so replaying the same cookie — which an
    // attacker who copied it still has — resolves to nobody.
    expect(await sessionFor(cookie)).toBeNull()
    expect(await database.db.select().from(schema.session)).toHaveLength(0)
  })

  it('deletes the identity rows and every session with them', async () => {
    const cookie = toCookieHeader(await signInWithGoogle())

    const response = await postSignedIn('delete-user', cookie)
    expect(response.status).toBe(200)

    // User, OAuth account, and session all go: nothing is left that could
    // re-identify the reader. (No sub-app tables exist yet to cascade from —
    // that ownership arrives with #7.)
    expect(await database.db.select().from(schema.user)).toHaveLength(0)
    expect(await database.db.select().from(schema.account)).toHaveLength(0)
    expect(await database.db.select().from(schema.session)).toHaveLength(0)
    expect(await sessionFor(cookie)).toBeNull()
  })

  it('refuses to delete with a session older than the freshness window', async () => {
    const cookie = toCookieHeader(await signInWithGoogle())

    // Two days back, past the one-day freshAge in create-auth.ts. Activity
    // extends a session's expiry but never its createdAt, so this is what a
    // long-lived session looks like — including a stolen one.
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    await database.db
      .update(schema.session)
      .set({ createdAt: twoDaysAgo })
      .where(
        eq(schema.session.userId, (await sessionFor(cookie))?.user.id ?? ''),
      )

    const response = await postSignedIn('delete-user', cookie)

    expect(response.status).toBe(400)
    // The exact code the modal keys its "sign in again" message off
    // (account-action-error.ts) — asserted against the real endpoint so the
    // two can't drift apart.
    expect(await response.json()).toMatchObject({ code: 'SESSION_EXPIRED' })

    // Still signed in, and still there to delete once they re-authenticate.
    expect(await sessionFor(cookie)).not.toBeNull()
    expect(await database.db.select().from(schema.user)).toHaveLength(1)
  })
})
