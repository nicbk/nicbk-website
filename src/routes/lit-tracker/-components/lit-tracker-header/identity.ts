/**
 * How the signed-in account is named in the lit-tracker header.
 *
 * Both values are derived rather than stored: the schema has no username or
 * handle column, and inventing one to render two pieces of chrome would be a
 * data-model decision made for a styling reason. If a real handle is ever added
 * to the user record, these become lookups instead of derivations and the
 * header does not change.
 *
 * Pure and separate from the component so the edge cases below can be asserted
 * directly rather than through a render.
 */

/** What the account is called when nothing usable can be derived from it. */
const FALLBACK_HANDLE = 'user'

/** Shown in the avatar when even the email yields no first character. */
const FALLBACK_INITIAL = 'U'

/** The breadcrumb's root segment always ends here — it names the collection. */
const ROOT_SUFFIX = '_home'

/**
 * The account, as much of it as this header needs.
 *
 * Better Auth supplies both; `name` comes from the Google profile and is
 * free-form (it can be empty), while `email` is always present.
 */
export interface HeaderAccount {
  name: string
  email: string
}

/**
 * The breadcrumb's root segment, e.g. `nicbk_home`.
 *
 * Built from the email's local part — the closest thing to a handle the account
 * actually has — reduced to the characters a path segment reads well with, so
 * an address like `first.last+tag@example.com` becomes `first_last_tag_home`
 * rather than something that looks like a broken URL. The caller renders the
 * `↳/` prefix; this is only the segment
 * (research/ui-ux/pages/lit-tracker/components/header.md).
 */
export function rootBreadcrumbSegment({ email }: HeaderAccount): string {
  const localPart = email.split('@')[0] ?? ''
  const handle = localPart
    .toLowerCase()
    // Anything that isn't a letter, digit, or underscore becomes one, then runs
    // of underscores collapse and the ends are trimmed — so punctuation never
    // shows up doubled or dangling.
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  return `${handle === '' ? FALLBACK_HANDLE : handle}${ROOT_SUFFIX}`
}

/**
 * The single character shown in the avatar.
 *
 * Deliberately a letter rather than the Google profile picture: that would be a
 * request to a third-party CDN on every page load of a signed-in session, which
 * this site avoids everywhere else (fonts are self-hosted for the same reason),
 * and it would need a fallback for a missing or failed image regardless. The
 * mockup's avatar is a single letter in a rounded square, so the fallback is
 * simply the design.
 *
 * Prefers the display name, since that is what the user recognizes; falls back
 * to the email, which always exists. Uppercased for a name already lowercase.
 */
export function avatarInitial({ name, email }: HeaderAccount): string {
  const source = name.trim() === '' ? email : name.trim()
  // Iterate rather than index: a name starting with an emoji or a non-BMP
  // character would otherwise be cut in half and render as a replacement box.
  const first = [...source][0]
  return (first ?? FALLBACK_INITIAL).toUpperCase()
}
