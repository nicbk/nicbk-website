/**
 * The Google account and token response the auth e2e signs in as.
 *
 * Shared by the two halves of the stub that have to agree: the in-process
 * token-endpoint stub the app server runs with
 * (`google-token-endpoint-stub.mjs`), and the spec that asserts who ended up
 * signed in (`../sign-in-flow.spec.ts`).
 *
 * Plain ESM rather than TypeScript on purpose — the token stub is loaded into
 * the app server by Node's `--import` hook, before any bundler is involved, so
 * it has to be runnable as-is.
 *
 * Note the sibling of this file: `src/auth/auth.integration.test.ts` stubs the
 * same endpoint for the integration tier. The two can't share code (that one is
 * TypeScript inside `src/`, which cannot import untyped ESM under this
 * project's tsconfig), but they encode the same external contract — Google's
 * token response — so a change to one is a prompt to look at the other.
 */

/** Better Auth's Google provider posts the code exchange here, hardcoded. */
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

/** Where Better Auth sends the browser to start the flow, also hardcoded. */
export const GOOGLE_AUTHORIZATION_ENDPOINT =
  'https://accounts.google.com/o/oauth2/v2/auth'

/** The one person who exists in the stubbed Google. */
export const GOOGLE_TEST_ACCOUNT = {
  sub: 'e2e-google-subject-1',
  email: 'e2e-reader@example.com',
  name: 'E2E Reader',
  picture: 'https://example.com/avatar.png',
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

/**
 * A JWT shaped like Google's `id_token`.
 *
 * The signature is a placeholder because nothing verifies it on this path:
 * Better Auth's Google provider reads the profile with `decodeJwt`, trusting
 * that the token came straight from the token endpoint over TLS. A stub that
 * signed it properly would be testing `jose`, not this app.
 */
export function createGoogleIdToken(clientId) {
  const issuedAt = Math.floor(Date.now() / 1000)
  return [
    base64url({ alg: 'RS256', typ: 'JWT', kid: 'e2e-key' }),
    base64url({
      iss: 'https://accounts.google.com',
      aud: clientId,
      sub: GOOGLE_TEST_ACCOUNT.sub,
      email: GOOGLE_TEST_ACCOUNT.email,
      email_verified: true,
      name: GOOGLE_TEST_ACCOUNT.name,
      picture: GOOGLE_TEST_ACCOUNT.picture,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
    'e2e-signature-not-verified',
  ].join('.')
}

/** The body Google returns for a successful authorization-code exchange. */
export function createGoogleTokenResponse(clientId) {
  return {
    access_token: 'e2e-google-access-token',
    refresh_token: 'e2e-google-refresh-token',
    id_token: createGoogleIdToken(clientId),
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'openid email profile',
  }
}
