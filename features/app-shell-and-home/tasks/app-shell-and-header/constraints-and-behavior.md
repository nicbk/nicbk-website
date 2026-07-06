# Constraints and Behavior: App Shell and Header

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"Shell, header, and navigation" section):

- Every personal-site page renders inside the sticky site header: bold site
  name linking to home, `projects`/`blog`/`about` nav to the right, single
  row, thin divider below.
- The header stays fixed on scroll, remains a single row at all widths (no
  hamburger), and may shrink font via `clamp()` on very narrow screens.
- The header contains no auth UI and shows no active-page indication.
- The skip-to-main-content link is the first focusable element and works.
- On client-side route changes, focus moves to the destination page's main
  heading.
- A working root error boundary and not-found handling exist (minimal).

## Behavior details

- Activating the skip link moves focus (and scroll) to the `<main>` landmark,
  bypassing the header nav.
- After a client-side navigation, a screen-reader user lands on the new
  page's heading rather than having focus stranded on the old location.
- The site name link routes to `/`; the three nav links route to the
  (not-yet-built) `/projects`, `/blog`, `/about` — the links exist and point
  correctly even though those pages arrive in later features.
- The header and its divider remain visible at every scroll position.

## Dependencies

- Requires the design-system tokens/theming (`design-system-foundation`) for
  styling and the pre-paint theme script slot.
