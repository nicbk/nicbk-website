/**
 * Where the browser reaches zero-cache.
 *
 * This is the one piece of Zero configuration the *client* needs, and the only
 * `VITE_`-prefixed variable in the project. That prefix is what makes Vite
 * inline a value into the client bundle, so it is normally forbidden here —
 * every other setting this app reads is a secret and stays server-only
 * (research/devops-deployment/secrets-and-environment-config.md). A zero-cache
 * URL is the exception that doc anticipates: the browser opens the WebSocket
 * itself, so the address is public by construction and hiding it would be
 * theatre. Nothing authorizing travels with it — the session cookie does that,
 * and `/api/zero/query` is what decides what may be read.
 *
 * In production this is same-origin with a single path segment
 * (`https://nicbk.com/zero`), which the host's Caddy proxies through to
 * zero-cache untouched: zero-cache's own router accepts an optional leading
 * base segment, and Zero's client permits at most one. Same-origin means the
 * browser sends the Better Auth session cookie with no change to how that
 * cookie is issued — the alternative, serving zero-cache from `zero.nicbk.com`,
 * would have required widening the cookie to every subdomain of the site,
 * permanently, to buy nothing else.
 *
 * Locally it points straight at the published port (`http://localhost:4848`)
 * with no proxy in the way: browsers key cookies by host and ignore the port,
 * so the cookie set on `localhost:3000` is sent to `localhost:4848` already.
 *
 * Because Vite inlines it at build time rather than reading it at startup, it
 * has to be present when the image is built — see the `build.args` wiring in
 * docker-compose.yml.
 */

/** The variable carrying the address, named once so messages can quote it. */
const VARIABLE = 'VITE_ZERO_CACHE_URL'

/**
 * Validates a configured zero-cache address, or explains what is missing.
 *
 * Zero itself checks the shape (scheme, at most one path component) and throws
 * usefully when it is wrong, so this only guards the case Zero handles
 * *quietly*: an absent value makes its client log a warning and then sync
 * nothing, which reads on screen as an account with no articles rather than as
 * a misconfiguration. Failing loudly here turns that into an error naming the
 * variable.
 */
export function requireZeroCacheUrl(configured: string | undefined): string {
  const url = configured?.trim()
  if (!url) {
    throw new Error(
      `${VARIABLE} is not set. The browser needs zero-cache's address to sync ` +
        `anything; see .env.example for the local value.`,
    )
  }
  return url
}

/**
 * The configured address, read from the build-time environment.
 *
 * A thin wrapper so the decision above stays testable without a build — the
 * same split `requireAuth` uses over `requireSession`.
 */
export function zeroCacheUrl(): string {
  // biome-ignore lint/complexity/useLiteralKeys: vite/client's ImportMetaEnv exposes custom keys only via its index signature, which noPropertyAccessFromIndexSignature forbids reading with dot access
  return requireZeroCacheUrl(import.meta.env['VITE_ZERO_CACHE_URL'])
}
