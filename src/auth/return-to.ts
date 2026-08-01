/**
 * The "return to" target carried through the sign-in flow.
 *
 * A signed-out user who asks for a protected URL is sent to `/sign-in` with
 * that URL attached, and lands back on it once Google hands them back. The URL
 * therefore arrives from somewhere untrusted — a search param anyone can edit,
 * and one an attacker can put in a link — so it is never used as given.
 *
 * Everything here is deliberately pure and free of router/server imports: the
 * validation is the security boundary, and it should be readable and testable
 * on its own.
 */

/** Where sign-in sends the user when no usable return-to target was supplied. */
export const DEFAULT_RETURN_TO = '/'

/**
 * Base used only to resolve a relative path so its origin can be compared.
 * The `.invalid` TLD is reserved by RFC 2606 and can never resolve, so a bug
 * that let this value escape into a real request would fail loudly rather than
 * reach someone else's server.
 */
const RESOLUTION_BASE = 'http://return-to.invalid'

/**
 * Reduces an untrusted return-to value to a same-origin app path, or falls back
 * to {@link DEFAULT_RETURN_TO}.
 *
 * The rule is "an absolute path within this app, and nothing else" — accepting
 * anything more would turn `/sign-in` into an open redirect, handing attackers
 * a link that starts on this site and ends on theirs, with this site's sign-in
 * page lending it credibility.
 *
 * Rejected, specifically:
 * - absolute URLs (`https://evil.example/`) — a different origin outright;
 * - protocol-relative URLs (`//evil.example/`) — these look like paths but the
 *   browser reads them as another origin;
 * - backslash variants (`/\evil.example/`) — URL parsing folds `\` into `/` for
 *   HTTP URLs, so this is the protocol-relative case wearing a disguise;
 * - non-hierarchical schemes (`javascript:…`, `data:…`) — these don't start
 *   with `/`, so they never get past the first check.
 *
 * The query string and fragment are preserved: a user bounced out of a filtered
 * or anchored view should land back on exactly that view.
 */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    return DEFAULT_RETURN_TO
  }

  // Must be an absolute path within this app. This rejects absolute URLs and
  // every non-hierarchical scheme on its own; the origin check below is what
  // catches the path-shaped impostors (`//host`, `/\host`).
  if (!value.startsWith('/')) {
    return DEFAULT_RETURN_TO
  }

  let resolved: URL
  try {
    resolved = new URL(value, RESOLUTION_BASE)
  } catch {
    return DEFAULT_RETURN_TO
  }

  if (resolved.origin !== RESOLUTION_BASE) {
    return DEFAULT_RETURN_TO
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`
}
