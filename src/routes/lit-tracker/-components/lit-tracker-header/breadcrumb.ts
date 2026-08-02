/** What the account is called when nothing usable can be derived from it. */
const FALLBACK_HANDLE = 'user'

/** The breadcrumb's root segment always ends here — it names the collection. */
const ROOT_SUFFIX = '_home'

/** The account, as much of it as the breadcrumb needs. */
export interface BreadcrumbAccount {
  email: string
}

/**
 * The breadcrumb's root segment, e.g. `nicbk_home`.
 *
 * Derived rather than stored: the schema has no username or handle column, and
 * inventing one to render a piece of chrome would be a data-model decision made
 * for a styling reason. If a real handle is ever added to the user record this
 * becomes a lookup and the header does not change.
 *
 * Built from the email's local part — the closest thing to a handle the account
 * actually has — reduced to the characters a path segment reads well with, so
 * an address like `first.last+tag@example.com` becomes `first_last_tag_home`
 * rather than something that looks like a broken URL. The caller renders the
 * `↳/` prefix; this is only the segment
 * (research/ui-ux/pages/lit-tracker/components/header.md).
 *
 * Pure and separate from the component so the edge cases can be asserted
 * directly rather than through a render.
 */
export function rootBreadcrumbSegment({ email }: BreadcrumbAccount): string {
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
