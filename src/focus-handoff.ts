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
