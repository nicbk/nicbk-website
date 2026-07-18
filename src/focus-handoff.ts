/**
 * Focus handoff for client-side navigation.
 *
 * TanStack Router swaps page content without a full load, so the browser
 * never moves focus on its own — a keyboard/screen-reader user would be
 * stranded where they clicked. After each client-side navigation the
 * router (src/router.tsx) calls this to land focus on the new page's main
 * heading, falling back to the <main> landmark. See
 * research/accessibility/keyboard-and-focus-management.md.
 */

/** The subset of a TanStack Router location this module compares. */
interface NavigationLocation {
  pathname: string
}

/**
 * Whether a resolved navigation is a real move to a different page, and so
 * should hand focus to the new heading — as opposed to a same-page URL update.
 *
 * The blog's live search and tag filters store their state in the URL's search
 * params, so typing or toggling a tag resolves a navigation whose `href`
 * changed but whose `pathname` did not. Those must NOT trigger the handoff, or
 * focus would be pulled out of the search box / tag buttons on every keystroke.
 * Keying the decision on `pathname` (not `href`) draws exactly that line; the
 * initial load has no `from` location and is never a handoff.
 */
export function isPageNavigation(
  from: NavigationLocation | undefined,
  to: NavigationLocation,
): boolean {
  return from !== undefined && from.pathname !== to.pathname
}

export function focusPageHeading(): void {
  const target =
    document.querySelector<HTMLElement>('main h1') ??
    document.getElementById('main-content')
  if (target === null) {
    return
  }
  // Headings aren't natively focusable — give the element a programmatic
  // tab stop (tabindex="-1" keeps it out of the Tab order).
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1')
  }
  target.focus()
}
