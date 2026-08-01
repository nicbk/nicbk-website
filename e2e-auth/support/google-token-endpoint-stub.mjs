/**
 * Stands in for Google's token endpoint inside the app server process.
 *
 * Loaded with Node's `--import` hook (see scripts/e2e-auth-server.mjs) so the
 * patch is in place before any application module runs.
 *
 * **Why in-process rather than a mock-server container.**
 * research/testing-qa/mocking-external-services.md chose a WireMock/MockServer
 * container for external calls, because the calls it was about are made from a
 * *different container* than the test runner. This one can't work that way, for
 * reasons that are all specific to Better Auth's Google provider:
 *
 * - The token endpoint URL is hardcoded (`@better-auth/core`'s
 *   `social-providers/google.ts`); only `authorizationEndpoint` is
 *   configurable, so there is no config swap that would point the exchange at
 *   another host.
 * - The exchange goes through `fetchRefusingRedirects`, which rejects any 3xx
 *   as a possible SSRF, so it can't be bounced to a stub either.
 * - The request is `https://`, so even a hosts-file redirect would need a CA
 *   the app server trusts.
 *
 * What is left is the process boundary the call actually crosses: `fetch`. The
 * substance of the decision is unchanged — Google's endpoints are stubbed and
 * Google's real UI is never automated — only the seam differs. Recorded as a
 * dated revision in that research file.
 *
 * Everything except the one stubbed URL still goes to the real `fetch`, so a
 * request this file didn't anticipate fails as itself rather than silently
 * returning a fixture.
 */
import {
  createGoogleTokenResponse,
  GOOGLE_TOKEN_ENDPOINT,
} from './google-stub.mjs'

const clientId = process.env.GOOGLE_CLIENT_ID
if (!clientId) {
  throw new Error(
    'GOOGLE_CLIENT_ID must be set for the stubbed Google token endpoint.',
  )
}

/** Fields Google requires of an authorization-code exchange with PKCE. */
const REQUIRED_FIELDS = ['grant_type', 'code', 'code_verifier', 'redirect_uri']

const realFetch = globalThis.fetch

globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input)
  if (!url.startsWith(GOOGLE_TOKEN_ENDPOINT)) {
    return realFetch(input, init)
  }

  // Normalizes both call shapes (a URL plus init, or a prebuilt Request) so the
  // body can be read the same way.
  const request = new Request(input, init)
  const body = new URLSearchParams(await request.text())

  // A stub that answered any request at all would pass even if the app stopped
  // sending a code verifier — that is, even if PKCE quietly broke. Rejecting a
  // malformed exchange the way Google would keeps the test honest.
  const missing = REQUIRED_FIELDS.filter((field) => !body.get(field))
  if (missing.length > 0 || body.get('grant_type') !== 'authorization_code') {
    return Response.json(
      {
        error: 'invalid_request',
        error_description: `stubbed Google rejected the exchange (missing: ${missing.join(', ') || 'none'}, grant_type: ${body.get('grant_type')})`,
      },
      { status: 400 },
    )
  }

  return Response.json(createGoogleTokenResponse(clientId))
}
